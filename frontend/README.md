# Dear Future - Solana Memory Capsule dApp

[![Deployed Frontend](https://img.shields.io/badge/Frontend-Deployed-brightgreen)](https://your-frontend-url.com)

A decentralized time-locked memory capsule application built on Solana blockchain. Create encrypted memory capsules with future unlock dates, transfer them to others, and unlock them when the time comes. Features compressed NFTs (cNFTs), IPFS integration, and advanced encryption.

## 🚀 Live Demo

**Frontend Application:** [https://your-frontend-url.com](https://your-frontend-url.com)


## ✨ Features

### Core Functionality
- **🕐 Time-locked Capsules**: Create memory capsules that unlock at specific future dates
- **🔐 Encrypted Storage**: Client-side encryption for capsule privacy
- **🔄 Transfer Ownership**: Gift or transfer capsules to other users
- **📝 Update Metadata**: Modify capsule details before unlocking
- **🗑️ Close Capsules**: Remove capsules and recover rent fees

### Advanced Features
- **🎨 Compressed NFTs**: Efficient storage using Merkle tree compression
- **🌐 IPFS Integration**: Decentralized content storage via Pinata
- **📱 Real-time Updates**: WebSocket integration for live transaction status
- **🔗 Blockchain Explorer**: Direct links to Solscan and Solana Explorer
- **📱 Mobile Responsive**: Optimized for all device sizes

### Technical Features
- **⚡ Solana Program**: Rust-based smart contracts with Anchor framework
- **🔑 PDA Integration**: Program Derived Addresses for deterministic account creation
- **⏰ Time-based Logic**: Blockchain timestamp validation for unlock mechanisms
- **🛡️ Security**: Comprehensive access controls and input validation

## 🏗️ Architecture

### Frontend Stack
- **Framework**: Next.js 15 with React 19
- **Styling**: Tailwind CSS with custom UI components
- **State Management**: Zustand for application state
- **Wallet Integration**: Solana wallet adapters (Phantom, Solflare)
- **Blockchain**: Solana Web3.js and Anchor client

### Backend Integration
- **Solana Program**: Custom Rust smart contracts
- **NFT Handling**: Metaplex with Bubblegum for compressed NFTs
- **Storage**: IPFS via Pinata for decentralized content
- **RPC Provider**: Helius for reliable blockchain interaction

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm/yarn
- Solana wallet (Phantom recommended)
- Devnet SOL for transaction fees

### Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd program-Shahadh7/frontend
```

2. **Install dependencies**
```bash
npm install
# or
yarn install
```

3. **Set up environment variables**
```bash
cp .env.example .env.local
```

Update `.env.local` with your configuration:
```env

# App Configuration
NEXT_PUBLIC_APP_NAME="DearFuture Web3"
NEXT_PUBLIC_APP_URL==app-url

# Solana Configuration
NEXT_PUBLIC_NETWORK=devnet
NEXT_PUBLIC_PROGRAM_ID=deployed-program-id

# Merkle Tree Configuration
NEXT_PUBLIC_MERKLE_TREE_ADDRESS=merkle-tree-account-address

# IPFS Configuration (Pinata)
NEXT_PUBLIC_PINATA_GATEWAY=your-pinata-gateway-url
PINATA_JWT=your-pinata-jwt

# Helius Configuration
NEXT_PUBLIC_HELIUS_API_KEY=helius-api-key
NEXT_PUBLIC_RPC_URL=https://devnet.helius-rpc.com/?your-helius-api-key
NEXT_PUBLIC_HELIUS_WEBSOCKET_URL=wss://devnet.helius-rpc.com/?your-helius-api-key
NEXT_PUBLIC_HELIUS_DAS_URL=https://devnet.helius-rpc.com

```

4. **Create Merkle Tree for Compressed NFTs**
```bash
npm run create-tree
# or
yarn create-tree
```

5. **Run the development server**
```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📱 How to Use

### 1. **Connect Wallet**
- Click "Connect Wallet" and select your Solana wallet
- Ensure you have sufficient devnet SOL for transactions

### 2. **Create Memory Capsule**
- Navigate to "Create Capsule" tab
- Fill in capsule details:
  - **Name**: Give your capsule a meaningful title
  - **Description**: Describe what's inside
  - **Unlock Date**: Set future unlock date
  - **Image**: Upload visual representation
- Submit transaction to create on-chain

### 3. **Manage Capsules**
- View all capsules in "My Capsules" tab
- See status: locked (future) or unlocked (past)
- Access transaction history and explorer links

### 4. **Mint Compressed NFT**
- For capsules without NFTs, mint a compressed NFT
- Uses Merkle tree compression for optimal storage costs
- Real-time minting progress updates

### 5. **Update Capsule**
- Modify metadata before unlock date
- Update description, image, or other details
- Changes recorded on-chain

### 6. **Unlock Capsule**
- Access contents when unlock date arrives
- View original image, description, and metadata
- Decrypt and retrieve stored memories

### 7. **Transfer Capsule**
- Gift capsules to friends or family
- Transfer includes capsule data and NFT (if minted)
- Recipients can view and manage transferred capsules

### 8. **Close Capsule**
- Remove unwanted capsules
- Recover rent fees from closed accounts


## 🚀 Deployment

### Build for Production
```bash
npm run build
# or
yarn build
```

### Deploy to Vercel
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Environment Variables for Production
Ensure all required environment variables are set in your deployment platform:

## 🔧 Development

### Project Structure
```
frontend/
├── src/
│   ├── app/                 # Next.js app router
│   ├── components/          # React components
│   │   ├── ui/             # Reusable UI components
│   │   └── ...             # Feature-specific components
│   ├── contexts/            # React contexts
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Utility functions
│   ├── services/            # External service integrations
│   └── stores/              # State management
├── scripts/                 # Build and deployment scripts
├── public/                  # Static assets
└── tests/                   # Test files
```

### Key Components
- **CapsuleMinter**: NFT minting interface
- **MyCapsules**: Capsule management dashboard
- **TransactionDisplay**: Real-time transaction status
- **WebSocketStatus**: Live connection monitoring
- **WalletContext**: Solana wallet integration


## 🌐 Network Configuration

### Devnet
- **RPC Endpoint**: Helius devnet
- **Program ID**: `88fRjJ3XvAHH1N6468YQd6xuSiPXUX2kyTeD4d3Yz8ng`
- **Merkle Tree**: `DcwsMGM6gqTPFuVSKQnNjoMCSNyTyy6ML4GdTEqCfkr7`

## 🆘 Support

### Known Issues
- **Solflare Wallet**: May encounter "Transaction already processed" errors
- **Phantom Wallet**: Recommended for optimal compatibility

### Getting Help
- Create an issue on GitHub
- Check the [Solana Cookbook](https://solanacookbook.com/)
- Join the [Solana Discord](https://discord.gg/solana)

## 🙏 Acknowledgments

- **School of Solana** for comprehensive blockchain education
- **Anchor Framework** for simplifying Solana development
- **Metaplex** for NFT infrastructure
- **Helius** for reliable RPC services
- **Pinata** for IPFS integration

---

**Built with ❤️ on Solana**

*Create memories that transcend time with blockchain technology.*
