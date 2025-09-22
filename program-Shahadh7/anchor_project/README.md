# Dear Future - Solana Program

A Solana smart contract built with Anchor Framework that enables time-locked memory capsules with cNFT integration. This program allows users to create, manage, and unlock time-based memory capsules on the Solana blockchain.

## 🌟 Features

- **Time-Locked Capsules**: Create memory capsules that unlock at a specific future date
- **Encrypted Content**: Support for encrypted URLs and content storage
- **cNFT Integration**: Mint Compressed NFTs for your capsules
- **Transferable**: Transfer capsule ownership to other users
- **Immutable History**: Once unlocked, capsules cannot be modified
- **On-Chain Storage**: All capsule data is stored securely on Solana blockchain

## 🏗️ Architecture

This is a Solana program written in Rust using the Anchor framework:

- **Program**: `dear_future` - Main smart contract logic
- **State Management**: PDA-based account structure for capsules and configuration
- **Instructions**: Six core functions for capsule lifecycle management
- **Security**: Built-in access controls and validation

## 📋 Prerequisites

- [Rust](https://rustup.rs/) (latest stable version)
- [Solana CLI](https://docs.solana.com/cli/install-solana-cli-tools) (latest stable version)
- [Node.js](https://nodejs.org/) (v18 or higher)
- [Yarn](https://yarnpkg.com/) package manager
- [Anchor CLI](https://book.anchor-lang.com/getting_started/installation.html)

## 🚀 Quick Start

### 1. Setup

```bash
# Navigate to the anchor project directory
cd anchor_project

# Install dependencies
yarn install
```

### 2. Build the Program

```bash
# Build the Solana program
anchor build

```

### 3. Configure Solana

```bash
# Set to devnet (or localnet for local development)
solana config set --url devnet

# Create a new wallet (if you don't have one)
solana-keygen new

# Airdrop SOL for testing
solana airdrop 2
```

### 4. Deploy the Program

```bash
# Deploy to devnet
anchor deploy

```

## 🧪 Testing

Run the comprehensive test suite:

```bash
# Run all tests
anchor test

# Run specific test file
yarn test tests/dear_future_capsule.ts

# Run edge case tests
yarn test tests/dear_future_edge_cases.ts
```

## 📚 Program Instructions

### Core Functions

1. **`initialize_config`**: Initialize the program configuration
2. **`create_capsule`**: Create a new time-locked memory capsule
3. **`update_capsule`**: Update capsule content before unlock date
4. **`unlock_capsule`**: Unlock a capsule when the time has come
5. **`close_capsule`**: Close and clean up a capsule
6. **`transfer_capsule`**: Transfer capsule ownership to another user

### Capsule Structure

Each capsule contains:
- **Title**: Up to 100 characters
- **Content**: Up to 300 characters  
- **Unlock Date**: Unix timestamp when capsule becomes accessible
- **Encrypted URL**: Optional encrypted content URL (up to 500 characters)
- **NFT Mint**: Optional cNFT mint address
- **Ownership**: Creator and current owner information
- **Metadata**: Creation, update, and transfer timestamps

## 🔧 Configuration

### Program IDs

- **Devnet**: `88fRjJ3XvAHH1N6468YQd6xuSiPXUX2kyTeD4d3Yz8ng`

### Network Configuration

The project is configured for:
- **Provider Cluster**: Devnet
- **Registry URL**: https://api.apr.dev
- **Package Manager**: Yarn

## 🎯 Usage Examples

### Creating a Capsule

```typescript
const tx = await program.methods
  .createCapsule(
    "My Future Self", 
    "Remember to check this in 2025!", 
    new anchor.BN(unlockTimestamp), 
    null
  )
  .accounts({
    config: configPda,
    capsule: capsulePda,
    creator: wallet.publicKey,
    systemProgram: SystemProgram.programId,
  })
  .rpc();
```

### Unlocking a Capsule

```typescript
const tx = await program.methods
  .unlockCapsule()
  .accounts({
    capsule: capsulePda,
    owner: wallet.publicKey,
  })
  .rpc();
```

## 📁 Project Structure

```
anchor_project/
├── programs/
│   └── dear_future/          # Solana program source
│       ├── src/
│       │   ├── instructions/ # Program instructions
│       │   ├── state.rs      # Data structures
│       │   ├── errors.rs     # Custom error types
│       │   ├── events.rs     # Event definitions
│       │   └── lib.rs        # Main program logic
│       └── Cargo.toml
├── tests/                    # Test files
├── migrations/               # Deployment scripts
├── scripts/                  # Utility scripts
└── Anchor.toml              # Anchor configuration
```

## 🔗 Links

- **Anchor Framework**: https://www.anchor-lang.com/
- **Solana**: https://solana.com/

---

Built with ❤️ using Anchor Framework and Solana
