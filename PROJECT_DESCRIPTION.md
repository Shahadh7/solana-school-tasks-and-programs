# Project Description

**Deployed Frontend URL:** [Frontend Application](https://your-frontend-url.com)

**Solana Program ID:** `88fRjJ3XvAHH1N6468YQd6xuSiPXUX2kyTeD4d3Yz8ng`

**Merkle Tree Acoount:** `DcwsMGM6gqTPFuVSKQnNjoMCSNyTyy6ML4GdTEqCfkr7`

## Project Overview

### Description
Dear Future is a decentralized time-locked memory capsule application built on Solana. Users can create encrypted memory capsules with future unlock dates, transfer them to others, and unlock them when the time comes. The application integrates compressed NFTs (cNFTs) for efficient storage and includes advanced features like IPFS integration, encryption, and Merkle tree-based minting. This dApp demonstrates advanced Solana program development concepts including PDAs, account compression, time-based logic, and cross-chain data integration.

### Key Features
- **Create Capsule**: Initialize a new encrypted memory capsule with custom unlock date
- **Transfer Capsule**: Transfer ownership of capsules to other users
- **Unlock Capsule**: Access capsule contents when the unlock date is reached
- **Update Capsule**: Modify capsule metadata before unlocking
- **Close Capsule**: Remove capsules and recover rent
- **Compressed NFT Integration**: Efficient storage using Merkle trees
- **IPFS Storage**: Decentralized content storage
- **Time-based Logic**: Automatic unlock mechanisms

### How to Use the dApp

#### 1. **Landing & Introduction**
- Visit the dApp and explore the landing page showcasing the Dear Future concept
- Learn about time-locked memory capsules and their features
- Review the benefits of compressed NFTs and decentralized storage

#### 2. **Wallet Connection**
- Connect your Solana wallet to the dApp
- Ensure you have sufficient devnet SOL for transaction fees

#### 3. **Create Memory Capsule**
- Navigate to the "Create Capsule" tab
- Fill in capsule details:
  - **Name**: Give your capsule a meaningful title
  - **Description**: Describe what's inside the capsule
  - **Unlock Date**: Set when the capsule should become accessible (must be in the future)
  - **Image**: Upload a visual representation of your memory
- Submit the transaction to create your capsule on-chain

#### 4. **Manage Your Capsules**
- Switch to the "My Capsules" tab to view all your created capsules
- See capsule status: locked (future date) or unlocked (past date)
- View capsule details including creation date, unlock date, and transaction history
- Access transaction signatures and blockchain explorer links

#### 5. **Mint Compressed NFT (Optional)**
- For capsules without NFTs, you can mint a compressed NFT representation
- The cNFT will be stored using Merkle tree compression for optimal storage costs
- Track minting progress with real-time status updates

#### 6. **Update Capsule (Before Unlock)**
- Modify capsule metadata before the unlock date arrives
- Update description, image, or other details
- Changes are recorded on-chain with new transaction signatures

#### 7. **Unlock Capsule**
- When the unlock date arrives, access your capsule contents
- View the original image, description, and metadata
- Decrypt and retrieve your stored memories
- The capsule becomes permanently accessible

#### 8. **Transfer Capsule**
- Transfer your capsules to friends, family, or other users if needed
- Transfer includes both the capsule data and associated NFT (if minted)
- Recipients can view and manage transferred capsules
- Perfect for gifting memories or collaborative time capsules

#### 9. **Close Capsule (Optional)**
- Remove capsules you no longer need
- Recover rent fees from closed capsule accounts

#### 10. **Advanced Features**
- **Real-time Updates**: WebSocket integration for live transaction status
- **IPFS Storage**: Decentralized content storage with IPFS(Pinata) integration
- **Encryption**: Client-side encryption for capsule privacy
- **Blockchain Explorer**: Direct links to Solscan and Solana Explorer

## Program Architecture
The Dear Future dApp uses a sophisticated architecture with multiple account types, advanced instructions, and integration with external services. The program leverages PDAs for deterministic addressing, account compression for efficiency, and time-based logic for capsule management.

### PDA Usage
The program uses Program Derived Addresses to create deterministic accounts for configuration and user capsules.

**PDAs Used:**
- **Config PDA**: Derived from seeds `["config"]` - stores global program configuration
- **Capsule PDA**: Derived from seeds `["capsule", creator_pubkey, capsule_id]` - ensures each capsule has a unique address

### Program Instructions
**Instructions Implemented:**
- **Initialize Config**: Creates the global program configuration account
- **Create Capsule**: Creates a new memory capsule with encrypted content
- **Transfer Capsule**: Transfers capsule ownership to another user
- **Unlock Capsule**: Allows access to capsule contents when time permits
- **Update Capsule**: Modifies capsule metadata before unlocking
- **Close Capsule**: Removes capsule and recovers rent

### Account Structure
```rust
#[account]
pub struct Config {
    pub authority: Pubkey,        // Program authority
    pub total_capsules: u64,      // Total capsules created
    pub version: u8,              // Program version
}

#[account]
pub struct Capsule {
    pub creator: Pubkey,          // Original creator of the capsule
    pub owner: Pubkey,            // Current owner of the capsule
    pub id: u64,                  // Unique capsule identifier
    pub unlock_date: i64,         // Unix timestamp when capsule unlocks
    pub content_hash: String,     // IPFS hash of encrypted content
    pub metadata_hash: String,    // IPFS hash of metadata
    pub created_at: i64,          // Creation timestamp
    pub is_unlocked: bool,        // Whether capsule has been unlocked
}
```

## Deployment and Setup

### Prerequisites
- Solana CLI installed and configured
- Anchor Framework installed
- Node.js and npm/yarn
- Solana wallet with devnet SOL

### Deployment Steps

#### 1. Build the Program
```bash
cd anchor_project
anchor build
```

#### 2. Deploy to Devnet
```bash
# Deploy to devnet
anchor deploy --provider.cluster devnet
```

#### 3. Initialize Program Configuration
```bash
# Run the initialization script
npx ts-node scripts/initialize-config.ts
```

#### 4. Create Merkle Tree for Compressed NFTs
```bash
cd frontend
npx ts-node scripts/create-merkle-tree.ts
```

### Environment Configuration
After deployment, update your environment variables:

```bash
# Program Configuration
NEXT_PUBLIC_PROGRAM_ID=88fRjJ3XvAHH1N6468YQd6xuSiPXUX2kyTeD4d3Yz8ng
NEXT_PUBLIC_SOLANA_NETWORK=devnet

# Merkle Tree Configuration
NEXT_PUBLIC_MERKLE_TREE_ADDRESS=DcwsMGM6gqTPFuVSKQnNjoMCSNyTyy6ML4GdTEqCfkr7
```

## Testing

### Test Coverage
Comprehensive test suite covering all instructions with both successful operations and error conditions to ensure program security and reliability.

**Happy Path Tests:**
- **Initialize Config**: Successfully creates program configuration
- **Create Capsule**: Properly creates new memory capsules
- **Transfer Capsule**: Successfully transfers ownership
- **Unlock Capsule**: Allows access when time permits
- **Update Capsule**: Modifies metadata correctly
- **Close Capsule**: Removes capsules and recovers rent

**Unhappy Path Tests:**
- **Unauthorized Operations**: Fails when non-owners try to modify capsules
- **Time Restrictions**: Prevents unlocking before due date
- **Invalid States**: Handles edge cases and invalid operations
- **Account Validation**: Ensures proper account structure

### Running Tests
```bash
cd anchor_project
yarn install    # install dependencies
anchor test     # run tests
```

### Test Files
- `tests/dear_future_capsule.ts` - Core functionality tests
- `tests/dear_future_edge_cases.ts` - Edge case and error handling tests

## Merkle Tree Integration

### Tree Configuration
- **Tree Address**: `DcwsMGM6gqTPFuVSKQnNjoMCSNyTyy6ML4GdTEqCfkr7`
- **Max Depth**: 14 levels
- **Max Buffer Size**: 64
- **Capacity**: 16,384 compressed NFTs
- **Network**: Devnet

## Frontend Integration

### Technologies Used
- **Next.js**: React framework for the frontend
- **Solana Web3.js**: Blockchain interaction
- **Metaplex with Bubblegum**: NFT and compressed NFT handling
- **IPFS(Pinata)**: Decentralized content storage
- **Tailwind CSS**: Styling and UI components
- **Helius**: RPC provider

### Key Components
- **Wallet Connection**: Solana wallet integration
- **Capsule Management**: Create, view, and manage capsules
- **Transaction Handling**: Real-time transaction status
- **WebSocket Integration**: Live updates and notifications

## Additional Notes for Evaluators

This is the first time I’ve created a full-stack dApp with some cool features. It was a great learning experience, and I’m looking forward to building more applications.

**Note:** I encountered issues when making transactions with the Solflare wallet. Every time I sent a transaction, I received the following error: “Transaction simulation failed: This transaction has already been processed.”

The system works fine and as expected with the Phantom wallet. Please take this into consideration. Thank you!

**Technical Challenges Overcome:**
- **Account Compression**: Implemented Merkle tree-based storage for efficient NFT handling
- **Time-based Logic**: Complex unlock mechanisms with blockchain timestamp validation
- **Decentralized storage Integration**: IPFS(Pinata) integration for decentralized content storage
- **Encryption**: Secure content handling with client-side encryption
- **Helius usage**: Helius used as a RPC provider for reliable transactions

**Learning Journey:**
The development process involved learning several complex Solana concepts:
- Understanding account compression and Merkle trees
- Managing complex state transitions
- Integrating external services (IPFS, encryption)
- Handling compressed NFT operations

