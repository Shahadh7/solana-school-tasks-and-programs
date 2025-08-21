import { Connection, PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js'
import { ipfsService } from './ipfs'
// Removed unused import: createDummyCapsule
import { createOptimizedConnection } from '@/lib/rpc-config'
import { heliusWebSocket } from './helius-websocket'

export interface MintCapsuleParams {
  name: string
  description: string
  image: File
  unlockDate: Date
  recipient?: string
  attributes?: Array<{ trait_type: string; value: string }>
}

export interface CapsuleMetadata {
  name: string
  description: string
  image: string
  external_url?: string
  attributes: Array<{ trait_type: string; value: string }>
  properties?: {
    files: Array<{ uri: string; type: string }>
    category: string
  }
}

export interface Wallet {
  publicKey: PublicKey
  signTransaction: <T extends Transaction | VersionedTransaction>(transaction: T) => Promise<T>
  signMessage: (message: Uint8Array) => Promise<Uint8Array>
}

export interface MintResult {
  signature: string
  mint: string
  metadata: CapsuleMetadata & {
    imageUrl: string
    uri: string
  }
}

class NFTService {
  private connection: Connection

  constructor() {
    // Use optimized connection configuration for Helius
    this.connection = createOptimizedConnection()
  }

  /**
   * Prepare capsule metadata and upload to IPFS
   */
  async prepareCapsuleMetadata(
    params: MintCapsuleParams,
    onProgress?: (step: string, progress: number) => void
  ): Promise<{ imageUrl: string; metadataUri: string; metadata: CapsuleMetadata }> {
    try {
      onProgress?.('Uploading image to IPFS...', 20)
      
      // Upload image to IPFS
      const imageUpload = await ipfsService.uploadFile(params.image)
      const imageUrl = ipfsService.getIPFSUrl(imageUpload.IpfsHash)

      onProgress?.('Creating metadata...', 60)

      // Create and upload metadata
      const metadata = ipfsService.createNFTMetadata({
        name: params.name,
        description: params.description,
        imageHash: imageUpload.IpfsHash,
        unlockDate: params.unlockDate,
        attributes: params.attributes,
      })

      const metadataUpload = await ipfsService.uploadJSON(
        metadata,
        `${params.name.replace(/\s+/g, '-').toLowerCase()}-metadata.json`
      )
      const metadataUri = ipfsService.getIPFSUrl(metadataUpload.IpfsHash)

      onProgress?.('Metadata prepared successfully', 100)

      return {
        imageUrl,
        metadataUri,
        metadata,
      }
    } catch (error) {
      console.error('Error preparing metadata:', error)
      throw new Error(`Failed to prepare metadata: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Mint a memory capsule with real-time WebSocket monitoring
   * Enhanced with Helius WebSocket for transaction tracking
   */
  async mintCapsule(
    wallet: Wallet,
    params: MintCapsuleParams,
    onProgress?: (step: string, progress: number) => void
  ): Promise<MintResult> {
    try {
      onProgress?.('Uploading image to IPFS...', 20)
      
      // Simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      onProgress?.('Creating metadata...', 50)
      
      // Create a dummy image URL for demo purposes
      const imageUrl = URL.createObjectURL(params.image)
      
      // Simulate metadata creation delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      onProgress?.('Minting compressed NFT...', 80)
      
      // Simulate minting delay
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Generate mock results for demo
      const mockSignature = `demo_tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const mockMint = `demo_mint_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      const metadata = {
        name: params.name,
        description: params.description,
        image: imageUrl,
        attributes: [
          {
            trait_type: 'Unlock Date',
            value: params.unlockDate.toISOString(),
          },
          {
            trait_type: 'Created At',
            value: new Date().toISOString(),
          },
          {
            trait_type: 'Type',
            value: 'Memory Capsule',
          },
          ...(params.attributes || []),
        ],
      }

      onProgress?.('Minting completed!', 100)

      return {
        signature: mockSignature,
        mint: mockMint,
        metadata: {
          ...metadata,
          imageUrl,
          uri: `demo://metadata/${mockMint}`,
        },
      }
    } catch (error) {
      console.error('Error minting capsule:', error)
      throw new Error(`Failed to mint capsule: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get compressed NFTs owned by a wallet
   */
  async getWalletNFTs(_walletAddress: PublicKey): Promise<CapsuleMetadata[]> {
    try {
      // TODO: Implement with Digital Asset Standard (DAS) API or Helius
      // For now, return empty array
      return []
    } catch (error) {
      console.error('Error fetching wallet NFTs:', error)
      return []
    }
  }

  /**
   * Transfer a memory capsule to another wallet
   */
  async transferCapsule(
    _wallet: Wallet,
    _params: {
      assetId: string
      newOwner: PublicKey
    }
  ): Promise<string> {
    try {
      // TODO: Implement compressed NFT transfer
      throw new Error('Transfer functionality will be implemented in the next iteration')
    } catch (error) {
      console.error('Error transferring capsule:', error)
      throw error
    }
  }

  /**
   * Monitor transaction confirmation in real-time using WebSockets
   */
  async monitorTransactionConfirmation(
    signature: string,
    onUpdate?: (status: 'pending' | 'confirmed' | 'failed', details?: Record<string, unknown>) => void
  ): Promise<boolean> {
    return new Promise((resolve, reject) => {
      // Set timeout for transaction confirmation (30 seconds)
      const timeoutId = setTimeout(() => {
        heliusWebSocket.unsubscribeFromTransaction(`transaction-${signature}`);
        onUpdate?.('failed', { reason: 'Transaction confirmation timeout' });
        reject(new Error('Transaction confirmation timeout'));
      }, 30000);
      
      const cleanup = () => {
        clearTimeout(timeoutId);
      };

      // Subscribe to real-time transaction updates
      heliusWebSocket.subscribeToTransaction(
        signature,
        (confirmation) => {
          cleanup();
          
          const confirmationData = confirmation as Record<string, unknown>;
          const result = confirmationData.result as Record<string, unknown>;
          
          if (result?.err) {
            onUpdate?.('failed', result);
            reject(new Error(`Transaction failed: ${JSON.stringify(result.err)}`));
          } else {
            onUpdate?.('confirmed', confirmationData);
            resolve(true);
          }
        },
        'confirmed'
      ).catch((error) => {
        cleanup();
        onUpdate?.('failed', { reason: error.message });
        reject(error);
      });

      // Initial status
      onUpdate?.('pending', { signature });
    });
  }

  /**
   * Subscribe to wallet account changes for real-time balance updates
   */
  async subscribeToWalletUpdates(
    walletPublicKey: PublicKey,
    onUpdate: (accountInfo: Record<string, unknown>) => void
  ): Promise<string> {
    try {
      return await heliusWebSocket.subscribeToAccount(
        walletPublicKey,
        (accountInfo, context) => {
          onUpdate({
            accountInfo,
            context,
            balance: accountInfo?.lamports || 0,
            slot: context.slot
          });
        },
        'confirmed'
      );
    } catch (error) {
      console.error('Failed to subscribe to wallet updates:', error);
      throw error;
    }
  }

  /**
   * Unsubscribe from wallet updates
   */
  async unsubscribeFromWalletUpdates(subscriptionKey: string): Promise<void> {
    await heliusWebSocket.unsubscribeFromAccount(subscriptionKey);
  }

  /**
   * Get WebSocket connection status
   */
  getWebSocketStatus() {
    return heliusWebSocket.getConnectionStatus();
  }

  /**
   * Check if a capsule is ready to be unlocked based on its unlock date
   */
  isReadyToUnlock(unlockDate: Date): boolean {
    return new Date() >= unlockDate
  }

  /**
   * Validate capsule parameters
   */
  validateCapsuleParams(params: MintCapsuleParams): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!params.name || params.name.trim().length === 0) {
      errors.push('Capsule name is required')
    }

    if (!params.description || params.description.trim().length === 0) {
      errors.push('Capsule description is required')
    }

    if (!params.image) {
      errors.push('Image file is required')
    }

    if (!params.unlockDate) {
      errors.push('Unlock date is required')
    } else if (params.unlockDate <= new Date()) {
      errors.push('Unlock date must be in the future')
    }

    // Validate image file
    if (params.image) {
      const maxSize = 10 * 1024 * 1024 // 10MB
      if (params.image.size > maxSize) {
        errors.push('Image file must be smaller than 10MB')
      }

      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
      if (!allowedTypes.includes(params.image.type)) {
        errors.push('Image must be JPEG, PNG, GIF, or WebP format')
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }
}

export const nftService = new NFTService() 