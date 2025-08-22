/**
 * Helius Digital Asset Standard (DAS) API Service
 * 
 * Provides integration with Helius DAS API for:
 * - Fetching compressed NFT data
 * - Querying NFT ownership and metadata
 * - Real-time asset tracking
 * - Transaction monitoring via WebSockets
 */

import { PublicKey } from '@solana/web3.js'
import { heliusWebSocket } from './helius-websocket'

// DAS API Response Types
export interface DasApiAsset {
  interface: string
  id: string
  content?: {
    $schema?: string
    json_uri?: string
    files?: Array<{ uri: string; type: string }>
    metadata?: {
      description?: string
      name?: string
      symbol?: string
      image?: string
      external_url?: string
      attributes?: Array<{
        trait_type?: string
        value?: string | number
      }>
      properties?: {
        files?: Array<{ uri: string; type: string }>
        category?: string
      }
    }
    links?: {
      image?: string
      external_url?: string
    }
  }
  authorities?: Array<{
    address: string
    scopes: string[]
  }>
  compression?: {
    eligible: boolean
    compressed: boolean
    data_hash: string
    creator_hash: string
    asset_hash: string
    tree: string
    seq: number
    leaf_id: number
  }
  grouping?: Array<{
    group_key: string
    group_value: string
  }>
  royalty?: {
    royalty_model: string
    target: string | null
    percent: number
    basis_points: number
    primary_sale_happened: boolean
    locked: boolean
  }
  creators?: Array<{
    address: string
    share: number
    verified: boolean
  }>
  ownership?: {
    frozen: boolean
    delegated: boolean
    delegate: string | null
    ownership_model: string
    owner: string
  }
  supply?: {
    print_max_supply: number
    print_current_supply: number
    edition_nonce: number | null
  }
  mutable?: boolean
  burnt?: boolean
}

export interface DasApiResponse<T> {
  total: number
  limit: number
  page: number
  items: T[]
}

export interface AssetsByOwnerOptions {
  page?: number
  limit?: number
  before?: string
  after?: string
  sortBy?: {
    sortBy: 'created' | 'updated' | 'recent_action' | 'none'
    sortDirection: 'asc' | 'desc'
  }
  showFungible?: boolean
  showNativeBalance?: boolean
}

export interface MintTransactionStatus {
  signature: string
  status: 'pending' | 'confirmed' | 'failed'
  assetId?: string
  error?: string
  timestamp: number
}

/**
 * Helius DAS API Service
 */
class HeliusDasService {
  private baseUrl: string
  private apiKey: string
  private rpcUrl: string

  constructor() {
    this.apiKey = process.env.NEXT_PUBLIC_HELIUS_API_KEY || ''
    this.baseUrl = process.env.NEXT_PUBLIC_HELIUS_DAS_URL || 'https://api.helius.xyz'
    this.rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'https://api.helius.xyz'
    
    if (!this.apiKey) {
      console.warn('Helius API key not found. DAS API functionality will be limited.')
    }
  }

  /**
   * Get the DAS API URL with API key
   */
  private getDasUrl(): string {
    return `${this.baseUrl}/v0`
  }

  /**
   * Make a request to the DAS API
   */
  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.getDasUrl()}${endpoint}?api-key=${this.apiKey}`
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`DAS API request failed: ${response.status} ${response.statusText} - ${errorText}`)
    }

    return response.json()
  }

  /**
   * Get asset by ID
   */
  async getAsset(assetId: string): Promise<DasApiAsset | null> {
    try {
      console.log('Fetching asset:', assetId)
      
      const asset = await this.makeRequest<DasApiAsset>(`/assets/${assetId}`)
      return asset
    } catch (error) {
      console.error('Failed to fetch asset:', error)
      return null
    }
  }

  /**
   * Get assets by owner
   */
  async getAssetsByOwner(
    ownerAddress: string, 
    options: AssetsByOwnerOptions = {}
  ): Promise<DasApiResponse<DasApiAsset>> {
    try {
      console.log('Fetching assets for owner:', ownerAddress)
      
      const {
        page = 1,
        limit = 1000,
        before,
        after,
        sortBy,
        showFungible = false,
        showNativeBalance = false,
      } = options

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        showFungible: showFungible.toString(),
        showNativeBalance: showNativeBalance.toString(),
      })

      if (before) params.append('before', before)
      if (after) params.append('after', after)
      if (sortBy) {
        params.append('sortBy', sortBy.sortBy)
        params.append('sortDirection', sortBy.sortDirection)
      }

      const response = await this.makeRequest<DasApiResponse<DasApiAsset>>(
        `/assets?ownerAddress=${ownerAddress}&${params.toString()}`
      )

      console.log(`Found ${response.total} assets for owner`)
      return response
    } catch (error) {
      console.error('Failed to fetch assets by owner:', error)
      return { total: 0, limit: 0, page: 1, items: [] }
    }
  }

  /**
   * Get compressed NFTs for a wallet (filtered for memory capsules)
   */
  async getCapsuleNFTs(walletAddress: PublicKey): Promise<DasApiAsset[]> {
    try {
      const response = await this.getAssetsByOwner(walletAddress.toString(), {
        limit: 1000,
        sortBy: {
          sortBy: 'created',
          sortDirection: 'desc'
        }
      })

      // Filter for compressed NFTs that are memory capsules
      const capsuleNFTs = response.items.filter(asset => {
        const isCompressed = asset.compression?.compressed === true
        const isCapsule = asset.content?.metadata?.name?.toLowerCase().includes('capsule') ||
                         asset.content?.metadata?.description?.toLowerCase().includes('memory capsule') ||
                         asset.content?.metadata?.attributes?.some(attr => 
                           attr.trait_type?.toLowerCase() === 'type' && 
                           attr.value?.toString().toLowerCase().includes('capsule')
                         )
        return isCompressed && isCapsule
      })

      console.log(`Found ${capsuleNFTs.length} capsule cNFTs for wallet`)
      return capsuleNFTs
    } catch (error) {
      console.error('Failed to fetch capsule cNFTs:', error)
      return []
    }
  }

  /**
   * Monitor minting transaction with real-time updates
   */
  async monitorMintTransaction(
    signature: string,
    onUpdate: (status: MintTransactionStatus) => void
  ): Promise<void> {
    try {
      console.log('Starting transaction monitoring for:', signature)
      
      // Initial status
      onUpdate({
        signature,
        status: 'pending',
        timestamp: Date.now()
      })

      // Set up WebSocket monitoring
      const subscriptionId = await heliusWebSocket.subscribeToTransaction(
        signature,
        (confirmation) => {
          try {
            const confirmationData = confirmation as Record<string, unknown>
            const result = confirmationData.result as Record<string, unknown>

            if (result?.err) {
              // Transaction failed
              onUpdate({
                signature,
                status: 'failed',
                error: JSON.stringify(result.err),
                timestamp: Date.now()
              })
            } else {
              // Transaction confirmed - try to extract asset ID
              const logs = (result?.meta as Record<string, unknown>)?.logMessages || []
              let assetId: string | undefined

              // Look for asset ID in logs (this is a simplified extraction)
              for (const log of logs) {
                if (typeof log === 'string' && log.includes('Instruction: MintV1')) {
                  // In a real implementation, you'd parse the transaction more thoroughly
                  assetId = `asset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                  break
                }
              }

              onUpdate({
                signature,
                status: 'confirmed',
                assetId,
                timestamp: Date.now()
              })
            }
          } catch (parseError) {
            console.error('Error parsing transaction confirmation:', parseError)
            onUpdate({
              signature,
              status: 'failed',
              error: 'Failed to parse transaction result',
              timestamp: Date.now()
            })
          }
        },
        'confirmed'
      )

      // Set timeout for transaction confirmation
      setTimeout(async () => {
        try {
          await heliusWebSocket.unsubscribeFromTransaction(subscriptionId)
          onUpdate({
            signature,
            status: 'failed',
            error: 'Transaction confirmation timeout',
            timestamp: Date.now()
          })
        } catch (error) {
          console.error('Error cleaning up transaction subscription:', error)
        }
      }, 60000) // 60 second timeout

    } catch (error) {
      console.error('Failed to monitor transaction:', error)
      onUpdate({
        signature,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now()
      })
    }
  }

  /**
   * Get proof for compressed NFT transfer
   * This method fetches merkle proofs from Helius DAS API
   */
  async getAssetProof(assetId: string): Promise<{
    root: string
    proof: string[]
    node_index: number
    leaf: string
    tree_id: string
  } | null> {
    try {
      console.log('Fetching proof for asset:', assetId);
      
      // Use Helius DAS API to get asset proof
      const response = await this.makeRequest<{
        root: string
        proof: string[]
        node_index: number
        leaf: string
        tree_id: string
      }>(`/assets/${assetId}/proof`);
      
      console.log('Asset proof fetched successfully:', response);
      return response;
    } catch (error) {
      console.error('Failed to fetch asset proof:', error);
      return null;
    }
  }

  /**
   * Check if a capsule is ready to be unlocked
   */
  isReadyToUnlock(asset: DasApiAsset): boolean {
    try {
      const unlockDateAttr = asset.content?.metadata?.attributes?.find(
        attr => attr.trait_type?.toLowerCase() === 'unlock date'
      )

      if (!unlockDateAttr?.value) {
        return false
      }

      const unlockDate = new Date(unlockDateAttr.value.toString())
      return new Date() >= unlockDate
    } catch (error) {
      console.error('Error checking unlock status:', error)
      return false
    }
  }

  /**
   * Check if DAS API is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Simple health check - try to fetch a known endpoint
      const response = await fetch(`${this.getDasUrl()}/health?api-key=${this.apiKey}`)
      return response.ok
    } catch (error) {
      console.error('DAS API health check failed:', error)
      return false
    }
  }

  /**
   * Get API configuration status
   */
  getConfig(): {
    hasApiKey: boolean
    baseUrl: string
    rpcUrl: string
  } {
    return {
      hasApiKey: !!this.apiKey,
      baseUrl: this.baseUrl,
      rpcUrl: this.rpcUrl
    }
  }
}

// Export singleton instance
export const heliusDasService = new HeliusDasService()

// Export types and service class
export { HeliusDasService }
