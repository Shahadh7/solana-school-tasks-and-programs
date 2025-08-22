/**
 * Compressed NFT (cNFT) Service using Metaplex Bubblegum v2
 * 
 * This service provides a clean interface for:
 * - Creating Merkle trees for cNFT storage
 * - Minting compressed NFTs with metadata
 * - Transferring and managing cNFTs
 * - Querying cNFT data using DAS API
 */

import { 
  Umi,
  PublicKey as UmiPublicKey,
  generateSigner,
  some,
  none,
  publicKey as createPublicKey,
} from '@metaplex-foundation/umi'
import { createUmi as createUmiWithDefaults } from '@metaplex-foundation/umi-bundle-defaults'
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters'
import { 
  createTree,
  mintV1,
  MetadataArgsArgs,
} from '@metaplex-foundation/mpl-bubblegum'
import bs58 from 'bs58'
// Import DAS API types from Helius service
import { heliusDasService, DasApiAsset, MintTransactionStatus } from './helius-das'
import { PublicKey } from '@solana/web3.js'

// Types for the service
export interface CNFTMetadata {
  name: string
  description: string
  image: string
  external_url?: string
  attributes: Array<{ trait_type: string; value: string | number }>
  properties?: {
    files: Array<{ uri: string; type: string }>
    category: string
  }
}

export interface MintCNFTParams {
  name: string
  description: string
  image: File
  unlockDate: Date
  recipient?: string
  attributes?: Array<{ trait_type: string; value: string | number }>
  collection?: UmiPublicKey
}

export interface CNFTMintResult {
  signature: string
  assetId: string
  leafIndex: number
  metadata: CNFTMetadata & {
    imageUrl: string
    metadataUri: string
  }
}

export interface TreeInfo {
  treeAddress: UmiPublicKey
  maxDepth: number
  maxBufferSize: number
  canopyDepth: number
  totalMinted: number
  remaining: number
}

export interface Wallet {
  publicKey: PublicKey
  signTransaction: <T>(transaction: T) => Promise<T>
  signAllTransactions?: <T>(transactions: T[]) => Promise<T[]>
  signMessage: (message: Uint8Array) => Promise<Uint8Array>
}

/**
 * CNFTService - A comprehensive service for Metaplex Bubblegum v2 operations
 */
class CNFTService {
  private umi: Umi
  private rpcEndpoint: string
  private defaultTreeAddress?: UmiPublicKey

  constructor(rpcEndpoint?: string) {
    // Use Helius RPC endpoint with fallback to Solana mainnet
    this.rpcEndpoint = rpcEndpoint || process.env.NEXT_PUBLIC_RPC_URL || 'https://api.mainnet-beta.solana.com'
    
    // Initialize UMI with bundle defaults
    this.umi = createUmiWithDefaults(this.rpcEndpoint)

    // Set default tree from environment variable if available
    const envTreeAddress = process.env.NEXT_PUBLIC_MERKLE_TREE_ADDRESS
    if (envTreeAddress) {
      this.defaultTreeAddress = createPublicKey(envTreeAddress)
    }
  }

  /**
   * Initialize the service with a connected wallet
   */
  async initialize(wallet: Wallet): Promise<void> {
    try {
      // Set up wallet adapter identity
      this.umi.use(walletAdapterIdentity(wallet))

    } catch (error) {
      throw new Error(`CNFTService initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Create a new Merkle tree for storing compressed NFTs
   */
  async createTree(params?: {
    maxDepth?: number
    maxBufferSize?: number
    canopyDepth?: number
    public?: boolean
  }): Promise<TreeInfo> {
    try {
      const {
        maxDepth = 14,        // Supports up to 16,384 cNFTs (2^14)
        maxBufferSize = 64,   // Buffer size for concurrent operations
        canopyDepth = 0,      // Canopy depth for cheaper transfers (0 = no canopy)
        public: isPublic = true  // Whether anyone can mint to this tree
      } = params || {}



      // Generate a new keypair for the tree
      const merkleTree = generateSigner(this.umi)
      
      // Create the tree transaction
      const createTreeTx = createTree(this.umi, {
        merkleTree,
        maxDepth,
        maxBufferSize,
        canopyDepth,
        treeCreator: this.umi.identity,
        public: isPublic,
      })

      // Send and confirm the transaction
      const result = await (await createTreeTx).sendAndConfirm(this.umi, {
        send: { commitment: 'confirmed' },
        confirm: { commitment: 'confirmed' }
      })

      // Calculate capacity
      const totalCapacity = Math.pow(2, maxDepth)
      
      // Store the tree address for future use
      this.defaultTreeAddress = merkleTree.publicKey

      return {
        treeAddress: merkleTree.publicKey,
        maxDepth,
        maxBufferSize,
        canopyDepth,
        totalMinted: 0,
        remaining: totalCapacity,
      }
    } catch (error) {
      throw new Error(`Tree creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Upload metadata to IPFS and return the URI
   */
  private async uploadMetadataToIPFS(metadata: CNFTMetadata): Promise<string> {
    try {
      // In a real implementation, you would use your IPFS service
      // For now, we'll simulate this or integrate with the existing ipfsService
      const { ipfsService } = await import('./ipfs')
      
      const metadataUpload = await ipfsService.uploadJSON(
        metadata,
        `${metadata.name.replace(/\s+/g, '-').toLowerCase()}-metadata.json`
      )
      
      return ipfsService.getIPFSUrl(metadataUpload.IpfsHash)
    } catch (error) {
      throw new Error(`Metadata upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Upload image to IPFS and return the URL
   */
  private async uploadImageToIPFS(imageFile: File): Promise<string> {
    try {
      const { ipfsService } = await import('./ipfs')
      
      const imageUpload = await ipfsService.uploadFile(imageFile)
      return ipfsService.getIPFSUrl(imageUpload.IpfsHash)
    } catch (error) {
      throw new Error(`Image upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Mint a compressed NFT to the specified tree
   */
  async mintCNFT(
    params: MintCNFTParams,
    treeAddress?: UmiPublicKey,
    onProgress?: (step: string, progress: number) => void
  ): Promise<CNFTMintResult> {
    try {
      // Use provided tree or default tree
      const merkleTree = treeAddress || this.defaultTreeAddress
      if (!merkleTree) {
        throw new Error('No Merkle tree specified. Create a tree first or provide a tree address.')
      }

      onProgress?.('Uploading image to IPFS...', 20)

      // Upload image to IPFS
      const imageUrl = await this.uploadImageToIPFS(params.image)

      onProgress?.('Creating metadata...', 40)

      // Prepare metadata
      const metadata: CNFTMetadata = {
        name: params.name,
        description: params.description,
        image: imageUrl,
        attributes: [
          { trait_type: 'Unlock Date', value: params.unlockDate.toISOString() },
          { trait_type: 'Created At', value: new Date().toISOString() },
          { trait_type: 'Type', value: 'Memory Capsule' },
          ...(params.attributes || [])
        ]
      }

      // Upload metadata to IPFS
      const metadataUri = await this.uploadMetadataToIPFS(metadata)

      onProgress?.('Minting compressed NFT...', 70)

      // Prepare metadata arguments for Bubblegum
      const metadataArgs: MetadataArgsArgs = {
        name: params.name,
        symbol: 'CAPSULE',
        uri: metadataUri,
        sellerFeeBasisPoints: 0, // No royalties for memory capsules
        primarySaleHappened: false,
        isMutable: true,
        editionNonce: some(0),
        tokenStandard: some(0), // NonFungible
        collection: none(), // Collection support can be added later
        uses: none(),
        tokenProgramVersion: 0, // Token Program
        creators: [
          {
            address: this.umi.identity.publicKey,
            verified: true,
            share: 100,
          }
        ],
      }

      // Determine the leaf owner (recipient or current user)
      const leafOwner = params.recipient 
        ? createPublicKey(params.recipient)
        : this.umi.identity.publicKey


      // Create mint transaction
      const mintTx = mintV1(this.umi, {
        leafOwner,
        merkleTree,
        metadata: metadataArgs,
      })

      onProgress?.('Confirming transaction...', 90)

      // Send and confirm the transaction
      const result = await mintTx.sendAndConfirm(this.umi, {
        send: { commitment: 'confirmed' },
        confirm: { commitment: 'confirmed' }
      })

      onProgress?.('cNFT minted successfully!', 100)

      // Convert signature to proper base58 string for Solscan compatibility
      let signature: string;
      try {
        if (result.signature instanceof Uint8Array) {
          signature = bs58.encode(result.signature);
        } else if (Array.isArray(result.signature)) {
          signature = bs58.encode(new Uint8Array(result.signature));
        } else {
          signature = String(result.signature);
        }
      } catch (error) {
        signature = String(result.signature);
      }

      // Use the transaction signature as the asset identifier for verification
      const assetId = signature


      // Set up WebSocket monitoring for real-time updates
      if (onProgress) {
        onProgress('Monitoring transaction confirmation...', 95)
        
        heliusDasService.monitorMintTransaction(signature, (status: MintTransactionStatus) => {
          
          if (status.status === 'confirmed') {
            onProgress('cNFT minted and confirmed!', 100)
          } else if (status.status === 'failed') {
            // Transaction failed
          }
        }).catch(error => {
          // Failed to monitor transaction
        })
      }

      return {
        signature,
        assetId,
        leafIndex: 0, // This would be derived from the transaction logs in a real implementation
        metadata: {
          ...metadata,
          imageUrl,
          metadataUri,
        },
      }
    } catch (error) {
      throw new Error(`cNFT minting failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Transfer a compressed NFT to another owner
   * Note: This is a placeholder implementation. In production, you would need:
   * - The current merkle root
   * - Data hash of the leaf
   * - Creator hash
   * - Nonce and leaf index
   * - Merkle proof path
   */
  async transferCNFT(params: {
    assetId: string
    newOwner: UmiPublicKey
    merkleTree: UmiPublicKey
    leafIndex: number
    proof?: UmiPublicKey[]
  }): Promise<string> {
    try {

  
      // This requires fetching the asset data and merkle proof from DAS API
      throw new Error('cNFT transfer not yet implemented. Requires DAS API integration for merkle proofs.')
      
      // In a full implementation, you would:
      // 1. Fetch the asset data using DAS API
      // 2. Get the merkle proof for the current leaf
      // 3. Create transfer transaction with all required parameters:
      //    - root, dataHash, creatorHash, nonce, index, proof
      
    } catch (error) {
      throw new Error(`cNFT transfer failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Fetch compressed NFTs owned by a wallet using Helius DAS API
   */
  async fetchWalletCNFTs(ownerAddress: UmiPublicKey): Promise<DasApiAsset[]> {
    try {

      // Convert UMI PublicKey to standard PublicKey for DAS API
      const publicKey = new PublicKey(ownerAddress.toString())
      
      // Use Helius DAS API to fetch capsule cNFTs
      const assets = await heliusDasService.getCapsuleNFTs(publicKey)
      
      return assets
    } catch (error) {
      // Return empty array on error to prevent UI breaks
      return []
    }
  }

  /**
   * Fetch a specific compressed NFT by asset ID using Helius DAS API
   */
  async fetchCNFT(assetId: UmiPublicKey): Promise<DasApiAsset | null> {
    try {

      // Use Helius DAS API to fetch specific asset
      const asset = await heliusDasService.getAsset(assetId.toString())
      
      return asset
    } catch (error) {
      return null
    }
  }

  /**
   * Get information about a Merkle tree
   */
  async getTreeInfo(treeAddress: UmiPublicKey): Promise<TreeInfo | null> {
    try {
      // In a real implementation, you would fetch tree account data
      // For now, return basic info
      
      // This is a placeholder - in reality you'd fetch the actual tree account
      return {
        treeAddress,
        maxDepth: 14,
        maxBufferSize: 64,
        canopyDepth: 0,
        totalMinted: 0,
        remaining: 16384,
      }
    } catch (error) {
      return null
    }
  }

  /**
   * Set the default tree address for minting operations
   */
  setDefaultTree(treeAddress: UmiPublicKey): void {
    this.defaultTreeAddress = treeAddress
  }

  /**
   * Get the current default tree address
   */
  getDefaultTree(): UmiPublicKey | undefined {
    return this.defaultTreeAddress
  }

  /**
   * Validate cNFT minting parameters
   */
  validateMintParams(params: MintCNFTParams, isForUnlockedCapsule: boolean = false): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!params.name || params.name.trim().length === 0) {
      errors.push('cNFT name is required')
    }

    if (!params.description || params.description.trim().length === 0) {
      errors.push('cNFT description is required')
    }

    if (!params.image) {
      errors.push('Image file is required')
    }

    if (!params.unlockDate) {
      errors.push('Unlock date is required')
    } else if (!isForUnlockedCapsule && params.unlockDate <= new Date()) {
      // Only validate future date for new capsules, not for minting existing unlocked ones
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

  /**
   * Get the current RPC endpoint
   */
  getRpcEndpoint(): string {
    return this.rpcEndpoint
  }

  /**
   * Check if the service is properly initialized
   */
  isInitialized(): boolean {
    return !!this.umi.identity
  }

  /**
   * Check if a capsule is ready to be unlocked based on its metadata
   */
  isReadyToUnlock(asset: DasApiAsset): boolean {
    return heliusDasService.isReadyToUnlock(asset)
  }

  /**
   * Monitor a minting transaction with real-time WebSocket updates
   */
  async monitorMintTransaction(
    signature: string,
    onUpdate: (status: MintTransactionStatus) => void
  ): Promise<void> {
    return heliusDasService.monitorMintTransaction(signature, onUpdate)
  }
}

// Export singleton instance
export const cnftService = new CNFTService()

// Export types and service class
export { CNFTService }
