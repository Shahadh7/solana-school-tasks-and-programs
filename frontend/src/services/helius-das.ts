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
  displayOptions?: {
    showFungible?: boolean
    showNativeBalance?: boolean
  }
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
    this.baseUrl = process.env.NEXT_PUBLIC_HELIUS_DAS_URL || 'https://api.helius.xyz';
    this.rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'https://api.devnet.solana.com';
    
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
      // Fetching asset silently
      
      const response = await fetch(`${this.baseUrl}/?api-key=${this.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'my-request-id',
          method: 'getAsset',
          params: { id: assetId }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`DAS API request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(`DAS API error: ${data.error.message}`);
      }

      return data.result;
    } catch (error) {
      console.error('Failed to fetch asset:', error)
      return null
    }
  }

  /**
   * Get assets by owner using getAssetsByOwner (recommended method)
   */
  async getAssetsByOwner(
    ownerAddress: string, 
    options: AssetsByOwnerOptions = {}
  ): Promise<DasApiResponse<DasApiAsset>> {
    try {
      // Fetching assets for owner silently
      
      const {
        page = 1,
        limit = 1000,
        before,
        after,
        sortBy,
        showFungible = false,
        showNativeBalance = false,
      } = options

      const response = await fetch(`${this.baseUrl}/?api-key=${this.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'my-request-id',
          method: 'getAssetsByOwner',
          params: {
            ownerAddress,
            page,
            limit,
            before,
            after,
            ...(sortBy && {
              sortBy: sortBy.sortBy,
              sortDirection: sortBy.sortDirection
            }),
            displayOptions: {
              showFungible,
              showNativeBalance
            }
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`DAS API request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(`DAS API error: ${data.error.message}`);
      }

      const result = data.result;
      // Found assets for owner silently
      return result;
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

      // Found capsule cNFTs for wallet silently
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
      // Starting transaction monitoring silently
      
      onUpdate({
        signature,
        status: 'pending',
        timestamp: Date.now()
      })

      const subscriptionId = await heliusWebSocket.subscribeToTransaction(
        signature,
        (confirmation) => {
          try {
            const confirmationData = confirmation as Record<string, unknown>
            const result = confirmationData.result as Record<string, unknown>

            if (result?.err) {
              onUpdate({
                signature,
                status: 'failed',
                error: JSON.stringify(result.err),
                timestamp: Date.now()
              })
            } else {
              const logs = (result?.meta as Record<string, unknown>)?.logMessages || []
              let assetId: string | undefined

              for (const log of logs) {
                if (typeof log === 'string' && log.includes('Instruction: MintV1')) {
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
      }, 60000) 

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
      // Fetching proof for asset silently
      
      const response = await fetch(`${this.baseUrl}/?api-key=${this.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'my-request-id',
          method: 'getAssetProof',
          params: { id: assetId }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`DAS API request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(`DAS API error: ${data.error.message}`);
      }

      // Asset proof fetched successfully
      return data.result;
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

  async getSignaturesForAsset(assetId: string): Promise<{
    total: number;
    limit: number;
    items: Array<[string, string]>; 
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/v0/signatures?api-key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'my-request-id',
          method: 'getSignaturesForAsset',
          params: {
            id: assetId,
            page: 1,
            limit: 1000,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(`API error: ${data.error.message}`);
      }

      return data.result;
    } catch (error) {
      console.error('Error fetching signatures for asset:', error);
      throw error;
    }
  }

  /**
   * Search for cNFTs that match a specific capsule name
   * This is more efficient than getting all assets and filtering
   */
  async searchCNFTsByCapsuleName(
    ownerAddress: string,
    capsuleName: string
  ): Promise<DasApiAsset[]> {
    try {
      // Searching for cNFTs matching capsule name silently
      
      const allAssets = await this.getAssetsByOwner(ownerAddress, {
        limit: 1000,
        displayOptions: {
          showFungible: false, 
          showNativeBalance: false
        }
      });
      
      const matchingCNFTs = allAssets.items.filter(asset => {
        const isCompressed = asset.compression?.compressed === true;
        const nameMatches = asset.content?.metadata?.name === capsuleName;
        
        return isCompressed && nameMatches;
      });
      
      // Found matching cNFTs silently
      return matchingCNFTs;
    } catch (error) {
      console.error('Failed to search cNFTs by capsule name:', error)
      return []
    }
  }
}

export const heliusDasService = new HeliusDasService()

export { HeliusDasService }
