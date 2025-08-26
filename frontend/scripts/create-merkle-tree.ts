/**
 * Script to create a Merkle tree for compressed NFTs using admin wallet
 * Run with: npx ts-node scripts/create-merkle-tree.ts
 */

import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { generateSigner, createSignerFromKeypair, keypairIdentity } from '@metaplex-foundation/umi'
import { createTree } from '@metaplex-foundation/mpl-bubblegum'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'


const RPC_ENDPOINT = process.env.NEXT_PUBLIC_RPC_URL || 'https:
const TREE_CONFIG = {
  maxDepth: 14,        
  maxBufferSize: 64,   
  canopyDepth: 0,      
  public: true         
}

async function createMerkleTree() {
  try {
    console.log('🌳 Creating Merkle Tree for Compressed NFTs')
    console.log('=====================================')
    console.log('RPC Endpoint:', RPC_ENDPOINT)
    console.log('Tree Config:', TREE_CONFIG)
    console.log('')

      
  const umi = createUmi(RPC_ENDPOINT)

    
    const adminKeypair = await loadOrCreateAdminKeypair()
    umi.use(keypairIdentity(adminKeypair))

    console.log('Admin wallet:', adminKeypair.publicKey.toString())
    console.log('')

    
    const merkleTree = generateSigner(umi)
    console.log('Generated tree address:', merkleTree.publicKey.toString())

    
    console.log('Creating tree transaction...')
    const createTreeTx = createTree(umi, {
      merkleTree,
      maxDepth: TREE_CONFIG.maxDepth,
      maxBufferSize: TREE_CONFIG.maxBufferSize,
      canopyDepth: TREE_CONFIG.canopyDepth,
      treeCreator: umi.identity,
      public: TREE_CONFIG.public,
    })

    
    console.log('Sending transaction...')
    const result = await (await createTreeTx).sendAndConfirm(umi, {
      send: { commitment: 'confirmed' },
      confirm: { commitment: 'confirmed' }
    })

    console.log('')
    console.log('✅ Tree Created Successfully!')
    console.log('=====================================')
    console.log('Tree Address:', merkleTree.publicKey.toString())
    console.log('Transaction:', result.signature.toString())
    console.log('Capacity:', Math.pow(2, TREE_CONFIG.maxDepth), 'cNFTs')
    console.log('')

    
    await saveTreeConfig({
      treeAddress: merkleTree.publicKey.toString(),
      signature: result.signature.toString(),
      maxDepth: TREE_CONFIG.maxDepth,
      maxBufferSize: TREE_CONFIG.maxBufferSize,
      canopyDepth: TREE_CONFIG.canopyDepth,
      capacity: Math.pow(2, TREE_CONFIG.maxDepth),
      createdAt: new Date().toISOString(),
      rpcEndpoint: RPC_ENDPOINT
    })

    console.log('📄 Tree configuration saved to: scripts/tree-config.json')
    console.log('')
    console.log('🔧 Next Steps:')
    console.log('1. Add the tree address to your environment variables:')
    console.log(`   NEXT_PUBLIC_MERKLE_TREE_ADDRESS=${merkleTree.publicKey.toString()}`)
    console.log('2. Update your frontend code to use this tree')
    console.log('3. Test minting with the new tree')

  } catch (error) {
    console.error('❌ Error creating tree:', error)
    process.exit(1)
  }
}

async function loadOrCreateAdminKeypair() {
  const keypairPath = path.join(__dirname, 'admin-keypair.json')
  
  try {
    if (fs.existsSync(keypairPath)) {
      console.log('Loading existing admin keypair...')
      const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf8'))
      const umi = createUmi(RPC_ENDPOINT)
      const keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(keypairData))
      return createSignerFromKeypair(umi, keypair)
    }
  } catch (error) {
    console.log('Could not load existing keypair, creating new one...')
  }

  
  console.log('Generating new admin keypair...')
  const umi = createUmi(RPC_ENDPOINT)
  const keypair = generateSigner(umi)
  
  
  fs.writeFileSync(keypairPath, JSON.stringify(Array.from(keypair.secretKey)))
  console.log('✅ Admin keypair saved to:', keypairPath)
  console.log('⚠️  IMPORTANT: Fund this wallet with SOL before creating the tree!')
  console.log('   Wallet address:', keypair.publicKey.toString())
  console.log('   Required: ~0.1 SOL for tree creation')
  
  return keypair
}

async function saveTreeConfig(config: any) {
  const configPath = path.join(__dirname, 'tree-config.json')
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
}


const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)


if (import.meta.url === `file:
  createMerkleTree()
    .then(() => {
      console.log('Script completed successfully!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('Script failed:', error)
      process.exit(1)
    })
}
