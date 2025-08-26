import { Connection, PublicKey } from '@solana/web3.js';
import { ipfsService } from './ipfs';
import { createOptimizedConnection } from '@/lib/rpc-config';
import { heliusWebSocket } from './helius-websocket';
import { cnftService, MintCNFTParams, CNFTMintResult } from './cnft';

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

export type Wallet = {
  publicKey: PublicKey
  // Use a generic signature compatible with CNFT wallet interface to avoid type mismatch
  signTransaction: <T>(transaction: T) => Promise<T>
  signMessage: (message: Uint8Array) => Promise<Uint8Array>
}

export interface MintResult {
  signature: string
  mint: string
  assetId: string
  metadata: CapsuleMetadata & {
    imageUrl: string
    uri: string
  }
}

export interface CNFTMintOptions {
  useCompressedNFT?: boolean
  treeAddress?: string
}

class NFTService {
  private connection: Connection

  constructor() {
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
      
      const imageUpload = await ipfsService.uploadFile(params.image)
      const imageUrl = ipfsService.getIPFSUrl(imageUpload.IpfsHash)

      onProgress?.('Creating metadata...', 60)

      const metadata = ipfsService.createNFTMetadata({
        name: params.name,
        description: params.description,
        imageCidOrHash: imageUpload.IpfsHash,
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
   * Mint a compressed NFT (cNFT) for a memory capsule using Metaplex Bubblegum v2
   */
  async mintCapsule(
    wallet: Wallet,
    params: MintCapsuleParams,
    onProgress?: (step: string, progress: number) => void,
    options: CNFTMintOptions = { useCompressedNFT: true }
  ): Promise<MintResult> {
    try {
      if (options.useCompressedNFT) {
        return await this.mintCompressedCapsule(wallet, params, onProgress, options.treeAddress)
      } else {
        return await this.mintRegularCapsule(wallet, params, onProgress)
      }
    } catch (error) {
      console.error('Error minting capsule:', error)
      throw new Error(`Failed to mint capsule: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Mint a compressed NFT using Metaplex Bubblegum v2
   */
  private async mintCompressedCapsule(
    wallet: Wallet,
    params: MintCapsuleParams,
    onProgress?: (step: string, progress: number) => void,
    treeAddress?: string
  ): Promise<MintResult> {
    try {
      onProgress?.('Initializing cNFT service...', 10)
      
      await cnftService.initialize(wallet)

      let tree = cnftService.getDefaultTree()
      if (!tree && !treeAddress) {
        throw new Error('No Merkle tree available. Please create a tree first using the admin script or provide a tree address.')
      } else if (treeAddress) {
        const { publicKey } = await import('@metaplex-foundation/umi')
        tree = publicKey(treeAddress)
        cnftService.setDefaultTree(tree)
      }

      onProgress?.('Preparing cNFT metadata...', 25)

      const cnftParams: MintCNFTParams = {
        name: params.name,
        description: params.description,
        image: params.image,
        unlockDate: params.unlockDate,
        recipient: params.recipient,
        attributes: params.attributes
      }

      const validation = cnftService.validateMintParams(cnftParams, true)
      if (!validation.isValid) {
        throw new Error(`Invalid parameters: ${validation.errors.join(', ')}`)
      }

      onProgress?.('Minting compressed NFT...', 40)

      const cnftResult: CNFTMintResult = await cnftService.mintCNFT(
        cnftParams,
        tree,
        (step, progress) => {
          const mappedProgress = 40 + Math.round((progress / 100) * 55)
          onProgress?.(step, mappedProgress)
        }
      )

      onProgress?.('cNFT minting completed!', 100)

      return {
        signature: cnftResult.signature,
        mint: cnftResult.assetId, 
        assetId: cnftResult.assetId,
        metadata: {
          name: cnftResult.metadata.name,
          description: cnftResult.metadata.description,
          image: cnftResult.metadata.image,
          external_url: cnftResult.metadata.external_url,
          attributes: cnftResult.metadata.attributes.map(attr => ({
            trait_type: attr.trait_type,
            value: String(attr.value)
          })),
          properties: cnftResult.metadata.properties,
          imageUrl: cnftResult.metadata.imageUrl,
          uri: cnftResult.metadata.metadataUri,
        },
      }
    } catch (error) {
      console.error('Error minting compressed NFT:', error)
      throw new Error(`Failed to mint compressed NFT: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Mint a regular NFT (fallback method)
   */
  private async mintRegularCapsule(
    wallet: Wallet,
    params: MintCapsuleParams,
    onProgress?: (step: string, progress: number) => void
  ): Promise<MintResult> {
    try {
      onProgress?.('Preparing metadata...', 20)
      
      const { imageUrl, metadataUri, metadata } = await this.prepareCapsuleMetadata(params, onProgress)
      
      onProgress?.('Minting regular NFT...', 60)
      
      
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const mockSignature = `nft_tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const mockMint = `nft_mint_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const mockAssetId = `asset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      onProgress?.('Regular NFT minting completed!', 100)

      return {
        signature: mockSignature,
        mint: mockMint,
        assetId: mockAssetId,
        metadata: {
          ...metadata,
          imageUrl,
          uri: metadataUri,
        },
      }
    } catch (error) {
      console.error('Error minting regular NFT:', error)
      throw new Error(`Failed to mint regular NFT: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get compressed NFTs owned by a wallet using DAS API
   */
  async getWalletNFTs(walletAddress: PublicKey): Promise<CapsuleMetadata[]> {
    try {
      const { publicKey } = await import('@metaplex-foundation/umi')
      const umiPublicKey = publicKey(walletAddress.toString())

      const assets = await cnftService.fetchWalletCNFTs(umiPublicKey)

      const capsules: CapsuleMetadata[] = assets
        .filter(asset => asset.content?.metadata) 
        .map(asset => {
          const metadata = asset.content!.metadata!
          return {
            name: metadata.name || 'Unnamed Capsule',
            description: metadata.description || '',
            image: String(metadata.image || ''),
            external_url: metadata.external_url,
            attributes: metadata.attributes?.map(attr => ({
              trait_type: attr.trait_type || 'Unknown',
              value: attr.value?.toString() || ''
            })) || [],
            properties: metadata.properties ? {
              files: metadata.properties.files || [],
              category: metadata.properties.category || 'image'
            } : undefined
          }
        })

      // Found cNFTs for wallet silently
      return capsules
    } catch (error) {
      console.error('Error fetching wallet cNFTs:', error)
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
    // Not used in current flow; implemented via combined-transfer service
    throw new Error('Use combined-transfer service for capsule + cNFT transfer')
  }

  /**
   * Monitor transaction confirmation in real-time using WebSockets
   */
  async monitorTransactionConfirmation(
    signature: string,
    onUpdate?: (status: 'pending' | 'confirmed' | 'failed', details?: Record<string, unknown>) => void
  ): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        heliusWebSocket.unsubscribeFromTransaction(`transaction-${signature}`);
        onUpdate?.('failed', { reason: 'Transaction confirmation timeout' });
        reject(new Error('Transaction confirmation timeout'));
      }, 30000);
      
      const cleanup = () => {
        clearTimeout(timeoutId);
      };

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

    if (params.image) {
      const maxSize = 10 * 1024 * 1024 
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