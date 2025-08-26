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
  transfer,
} from '@metaplex-foundation/mpl-bubblegum'
import bs58 from 'bs58'
import { heliusDasService, DasApiAsset, MintTransactionStatus } from './helius-das'
import { PublicKey } from '@solana/web3.js'

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
    this.rpcEndpoint = rpcEndpoint || process.env.NEXT_PUBLIC_RPC_URL || 'https://api.devnet.solana.com';
    
    this.umi = createUmiWithDefaults(this.rpcEndpoint)

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
      const walletAdapter = walletAdapterIdentity({
        publicKey: wallet.publicKey,
        signTransaction: wallet.signTransaction,
        signMessage: wallet.signMessage,
        signAllTransactions: wallet.signAllTransactions,
      });
      
      this.umi.use(walletAdapter);

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
        maxDepth = 14,        
        maxBufferSize = 64,   
        canopyDepth = 0,      
        public: isPublic = true  
      } = params || {}



      const merkleTree = generateSigner(this.umi)
      
      const createTreeTx = createTree(this.umi, {
        merkleTree,
        maxDepth,
        maxBufferSize,
        canopyDepth,
        treeCreator: this.umi.identity,
        public: isPublic,
      })

      const result = await (await createTreeTx).sendAndConfirm(this.umi, {
        send: { commitment: 'confirmed' },
        confirm: { commitment: 'confirmed' }
      })

      const totalCapacity = Math.pow(2, maxDepth)
      
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
      const merkleTree = treeAddress || this.defaultTreeAddress
      if (!merkleTree) {
        throw new Error('No Merkle tree specified. Create a tree first or provide a tree address.')
      }

      onProgress?.('Uploading image to IPFS...', 20)

      const imageUrl = await this.uploadImageToIPFS(params.image)

      onProgress?.('Creating metadata...', 40)

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

      const metadataUri = await this.uploadMetadataToIPFS(metadata)

      onProgress?.('Minting compressed NFT...', 70)

      const metadataArgs: MetadataArgsArgs = {
        name: params.name,
        symbol: 'CAPSULE',
        uri: metadataUri,
        sellerFeeBasisPoints: 0, 
        primarySaleHappened: false,
        isMutable: true,
        editionNonce: some(0),
        tokenStandard: some(0), 
        collection: none(), 
        uses: none(),
        tokenProgramVersion: 0, 
        creators: [
          {
            address: this.umi.identity.publicKey,
            verified: true,
            share: 100,
          }
        ],
      }

      const leafOwner = params.recipient 
        ? createPublicKey(params.recipient)
        : this.umi.identity.publicKey


      const mintTx = mintV1(this.umi, {
        leafOwner,
        merkleTree,
        metadata: metadataArgs,
      })

      onProgress?.('Confirming transaction...', 90)

      const result = await mintTx.sendAndConfirm(this.umi, {
        send: { commitment: 'confirmed' },
        confirm: { commitment: 'confirmed' }
      })

      onProgress?.('cNFT minted successfully!', 100)

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

      const assetId = signature


      if (onProgress) {
        onProgress('Monitoring transaction confirmation...', 95)
        
        heliusDasService.monitorMintTransaction(signature, (status: MintTransactionStatus) => {
          
          if (status.status === 'confirmed') {
            onProgress('cNFT minted and confirmed!', 100)
          } else if (status.status === 'failed') {
          }
        }).catch(() => {
        })
      }

      return {
        signature,
        assetId,
        leafIndex: 0, 
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
   * This implementation fetches asset data and merkle proofs from DAS API and constructs the transfer properly
   */
  async transferCNFT(params: {
    assetId: string
    newOwner: string | UmiPublicKey
  }): Promise<string> {
    try {
      const newOwnerKey = typeof params.newOwner === 'string' 
        ? createPublicKey(params.newOwner)
        : params.newOwner;

      console.log('🔄 Starting cNFT transfer with improved implementation...');

      // Fetch asset data from DAS API
      const asset = await heliusDasService.getAsset(params.assetId);
      if (!asset) {
        throw new Error('Asset not found in DAS API');
      }

      if (!asset.compression?.compressed) {
        throw new Error('Asset is not a compressed NFT');
      }

      console.log('✅ Asset data fetched:', {
        owner: asset.ownership?.owner,
        delegate: asset.ownership?.delegate,
        tree: asset.compression.tree
      });

      // Verify ownership
      if (!asset.ownership) {
        throw new Error('Asset ownership information not available');
      }
      
      const currentOwner = asset.ownership.owner;
      if (currentOwner !== this.umi.identity.publicKey.toString()) {
        throw new Error(`Transfer denied: Asset owner is ${currentOwner}, but signer is ${this.umi.identity.publicKey.toString()}`);
      }

      // Fetch merkle proof
      const proofData = await heliusDasService.getAssetProof(params.assetId);
      if (!proofData) {
        throw new Error('Failed to fetch merkle proof for asset transfer');
      }

      console.log('✅ Proof data fetched:', {
        root: proofData.root,
        proofLength: proofData.proof.length,
        leafIndex: asset.compression.leaf_id
      });

      // Prepare transfer parameters
      const merkleTree = createPublicKey(asset.compression.tree);
      const leafIndex = asset.compression.leaf_id;
      const proof = proofData.proof.map(p => createPublicKey(p));
      
      // Use the correct owner and delegate from the asset
      const leafOwner = createPublicKey(asset.ownership.owner);
      const leafDelegate = asset.ownership.delegate 
        ? createPublicKey(asset.ownership.delegate) 
        : leafOwner; // If no delegate, use owner

      console.log('🔄 Creating transfer instruction with parameters:', {
        leafOwner: leafOwner.toString(),
        leafDelegate: leafDelegate.toString(),
        newLeafOwner: newOwnerKey.toString(),
        merkleTree: merkleTree.toString(),
        leafIndex,
        proofLength: proof.length
      });

      // Create transfer instruction
      const transferTx = transfer(this.umi, {
        leafOwner,
        leafDelegate,
        newLeafOwner: newOwnerKey,
        merkleTree,
        root: bs58.decode(proofData.root),
        dataHash: bs58.decode(asset.compression.data_hash),
        creatorHash: bs58.decode(asset.compression.creator_hash),
        nonce: asset.compression.leaf_id,
        index: leafIndex,
        proof,
      });

      console.log('🔄 Sending transfer transaction...');

      const result = await transferTx.sendAndConfirm(this.umi, {
        send: { commitment: 'confirmed' },
        confirm: { commitment: 'confirmed' }
      });

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

      console.log('✅ cNFT transfer successful:', signature);

      return signature;
    } catch (error) {
      console.error('❌ cNFT transfer failed:', error);
      
      // Enhanced error logging for debugging
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          assetId: params.assetId,
          newOwner: params.newOwner,
          currentSigner: this.umi.identity?.publicKey?.toString()
        });
      }
      
      throw new Error(`cNFT transfer failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Fetch compressed NFTs owned by a wallet using Helius DAS API
   */
  async fetchWalletCNFTs(ownerAddress: UmiPublicKey): Promise<DasApiAsset[]> {
    try {

      const publicKey = new PublicKey(ownerAddress.toString())
      
      const assets = await heliusDasService.getCapsuleNFTs(publicKey)
      
      return assets
    } catch (error) {
      return []
    }
  }

  /**
   * Fetch a specific compressed NFT by asset ID using Helius DAS API
   */
  async fetchCNFT(assetId: UmiPublicKey): Promise<DasApiAsset | null> {
    try {

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

export const cnftService = new CNFTService()

export { CNFTService }
