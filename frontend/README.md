# 🧠 DearFuture Web3 - Frontend

A decentralized memory locker built with **Next.js**, **Solana**, **IPFS**, and **compressed NFTs**.

## 🌟 Features

- **Wallet Integration**: Connect with Phantom, Solflare, and other Solana wallets
- **Memory Capsules**: Upload images and create time-locked digital memories
- **Compressed NFTs**: Mint memories as cNFTs using Metaplex Bubblegum for low costs
- **IPFS Storage**: Secure, decentralized storage via Pinata
- **Time Locks**: Set future unlock dates for your memories
- **Beautiful UI**: Modern, responsive design with Tailwind CSS and Radix UI

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Solana wallet (Phantom recommended)

### Installation

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env.local
```

### Environment Variables

Create a `.env.local` file with:

```env
# Solana Configuration
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com

# IPFS / Pinata Configuration (Required)
NEXT_PUBLIC_PINATA_JWT=your_pinata_jwt_token_here
NEXT_PUBLIC_PINATA_GATEWAY=https://gateway.pinata.cloud

# Optional: Helius for better RPC performance
# NEXT_PUBLIC_RPC_URL=https://devnet.helius-rpc.com/?api-key=YOUR_API_KEY

# Application Settings
NEXT_PUBLIC_APP_NAME=DearFuture Web3
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Getting Pinata JWT

1. Sign up at [Pinata.cloud](https://pinata.cloud)
2. Go to API Keys section
3. Create a new JWT token
4. Add it to your `.env.local` file

### Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## 🎯 Usage

### Creating Memory Capsules

1. **Connect Wallet**: Click "Connect Wallet" and select your Solana wallet
2. **Upload Image**: Drag & drop or click to select an image (max 10MB)
3. **Add Details**: Give your memory a name and description
4. **Set Unlock Date**: Choose when this memory should be revealed
5. **Mint Capsule**: Create your compressed NFT memory capsule

### Viewing Your Capsules

- Navigate to "My Capsules" tab
- View locked/unlocked status
- Share or transfer capsules
- See unlock countdown for locked memories

## 🏗️ Architecture

### Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS, Radix UI, Lucide Icons
- **State Management**: Zustand
- **Blockchain**: Solana, Metaplex Bubblegum (compressed NFTs)
- **Storage**: IPFS via Pinata
- **Wallet**: Solana Wallet Adapter

### Key Components

```
src/
├── app/                    # Next.js App Router
├── components/             # React components
│   ├── ui/                # Base UI components
│   ├── CapsuleMinter.tsx  # Memory capsule creation
│   └── MyCapsules.tsx     # User's capsules display
├── contexts/               # React contexts
│   └── WalletContext.tsx  # Solana wallet provider
├── services/              # Business logic
│   ├── ipfs.ts           # IPFS/Pinata integration
│   └── nft.ts            # NFT minting service
├── stores/                # State management
│   └── appStore.ts       # Zustand store
└── lib/                   # Utilities
    └── utils.ts          # Helper functions
```

## 🔧 Development

### Adding New Features

1. **Services**: Add new blockchain/IPFS functionality in `src/services/`
2. **Components**: Create reusable UI components in `src/components/`
3. **State**: Extend the Zustand store in `src/stores/appStore.ts`
4. **Types**: Define TypeScript interfaces for type safety

### Environment Configuration

- **Development**: Uses Solana Devnet by default
- **Production**: Update RPC URLs for Mainnet deployment
- **IPFS**: Pinata for reliable IPFS pinning and gateways

## 📦 Deployment

### Vercel (Recommended)

```bash
# Deploy to Vercel
vercel --prod

# Set environment variables in Vercel dashboard
```

### Other Platforms

1. Build the application: `npm run build`
2. Deploy the `out/` directory to your hosting platform
3. Configure environment variables on your platform

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test

# Type checking
npm run type-check

# Linting
npm run lint
```

## 🎨 Customization

### Theming

- Modify `src/app/globals.css` for global styles
- Update Tailwind configuration in `tailwind.config.js`
- Customize color schemes in component files

### Branding

- Update logo and branding in `src/app/layout.tsx`
- Modify metadata and SEO information
- Change color gradients throughout the application

## 🔐 Security

- All private keys remain in user wallets
- IPFS content is publicly accessible by design
- Smart contract interactions are user-initiated
- No server-side key storage

## 🐛 Troubleshooting

### Common Issues

1. **Wallet Connection**: Ensure wallet extension is installed and unlocked
2. **RPC Errors**: Try switching to Helius or other RPC providers
3. **IPFS Upload**: Verify Pinata JWT token is correct
4. **Build Errors**: Clear node_modules and reinstall dependencies

### Support

- Check browser console for detailed error messages
- Verify network connectivity and wallet balance
- Ensure environment variables are properly configured

## 🚧 Roadmap

- [ ] Complete Metaplex Bubblegum integration
- [ ] Add Helius webhooks for delivery notifications
- [ ] Implement capsule transfer functionality
- [ ] Add batch operations
- [ ] Enhanced metadata and attributes
- [ ] Mobile app companion

## 📄 License

This project is part of the DearFuture Web3 ecosystem. See LICENSE file for details.

---

Built with ❤️ for preserving memories on the blockchain.
