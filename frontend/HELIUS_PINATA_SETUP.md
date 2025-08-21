# 🚀 Helius RPC & Pinata IPFS Setup Guide

This guide will help you configure your DearFuture Web3 project to use **Helius RPC** for improved Solana performance and **Pinata IPFS** for decentralized storage.

## 📋 Prerequisites

- Node.js 18+ installed
- A Solana wallet (Phantom recommended)
- Internet connection for API setup

## 🔧 Step 1: Set Up Helius RPC

### 1.1 Create Helius Account
1. Go to [Helius.xyz](https://helius.xyz/)
2. Sign up for a free account
3. Verify your email address

### 1.2 Get Your API Key
1. Log in to your Helius dashboard
2. Navigate to "API Keys" section
3. Create a new API key for your project
4. Copy the API key (you'll need this for the next step)

### 1.3 Choose Your Network
- **Devnet** (recommended for development): `https://devnet.helius-rpc.com/?api-key=YOUR_API_KEY`
- **Mainnet** (for production): `https://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY`

## 📌 Step 2: Set Up Pinata IPFS

### 2.1 Create Pinata Account
1. Go to [Pinata.cloud](https://pinata.cloud/)
2. Sign up for a free account (1GB free storage)
3. Verify your email address

### 2.2 Generate JWT Token
1. Log in to your Pinata dashboard
2. Go to "API Keys" in the left sidebar
3. Click "New Key"
4. Give it a name like "DearFuture Web3"
5. Select permissions:
   - ✅ **pinFileToIPFS**
   - ✅ **pinJSONToIPFS**
   - ✅ **hashMetadata**
6. Click "Create Key"
7. **Important**: Copy the JWT token immediately (you won't see it again!)

## ⚙️ Step 3: Configure Environment Variables

Create a `.env.local` file in the `front-end` directory with the following configuration:

```bash
# Solana Configuration - Helius RPC
NEXT_PUBLIC_RPC_URL=https://devnet.helius-rpc.com/?api-key=YOUR_HELIUS_API_KEY

# For production/mainnet, use:
# NEXT_PUBLIC_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_HELIUS_API_KEY

# IPFS / Pinata Configuration
NEXT_PUBLIC_PINATA_JWT=your_pinata_jwt_token_here
NEXT_PUBLIC_PINATA_GATEWAY=https://gateway.pinata.cloud

# Application Settings
NEXT_PUBLIC_APP_NAME=DearFuture Web3
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Network Configuration
NEXT_PUBLIC_NETWORK=devnet
```

### 3.1 Replace the Placeholders
- Replace `YOUR_HELIUS_API_KEY` with your actual Helius API key
- Replace `your_pinata_jwt_token_here` with your actual Pinata JWT token

### 3.2 Example Configuration
```bash
# Example (with fake keys - use your real ones!)
NEXT_PUBLIC_RPC_URL=https://devnet.helius-rpc.com/?api-key=abc123-def456-ghi789
NEXT_PUBLIC_PINATA_JWT=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_PINATA_GATEWAY=https://gateway.pinata.cloud
NEXT_PUBLIC_APP_NAME=DearFuture Web3
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_NETWORK=devnet
```

## 🏃‍♂️ Step 4: Test Your Setup

### 4.1 Start the Development Server
```bash
cd front-end
npm install
npm run dev
```

### 4.2 Check the Console
Open your browser's developer console and look for these success messages:
- `🚀 Using Helius RPC for enhanced performance`
- `📌 Pinata IPFS service initialized successfully`

### 4.3 Test Functionality
1. Connect your Solana wallet
2. Try creating a memory capsule
3. Upload an image to test IPFS integration

## 🎯 Benefits of This Setup

### Helius RPC Advantages:
- ⚡ **Faster transaction processing** (up to 2x faster than default RPC)
- 🛡️ **Enhanced reliability** with 99.9% uptime
- 📊 **Better error handling** and detailed transaction info
- 🔄 **WebSocket support** for real-time updates
- 📈 **Higher rate limits** for API calls

### Pinata IPFS Advantages:
- 🔒 **Reliable pinning** - your files won't disappear
- 🌍 **Global CDN** for fast file access worldwide
- 📊 **Analytics** to track file usage
- 🛠️ **Easy management** through dashboard
- 💾 **1GB free storage** to get started

## 🐛 Troubleshooting

### Common Issues:

**1. "Cannot connect to wallet"**
- Check if your wallet extension is installed and unlocked
- Verify you're on the correct network (devnet/mainnet)
- Try refreshing the page

**2. "IPFS upload failed"**
- Verify your Pinata JWT token is correct
- Check that your Pinata account has sufficient storage
- Ensure the image file is under 10MB

**3. "RPC connection timeout"**
- Verify your Helius API key is correct and active
- Check your internet connection
- Try switching between devnet/mainnet

**4. Environment variables not loading**
- Ensure `.env.local` is in the `front-end` directory
- Restart your development server after adding variables
- Make sure variable names start with `NEXT_PUBLIC_`

### Getting Help:
- Check the browser console for detailed error messages
- Verify your API keys are active in their respective dashboards
- Ensure your wallet has some SOL for transaction fees (devnet SOL is free)

## 🚀 Next Steps

Once configured, your app will automatically:
- Use Helius for all Solana RPC calls
- Upload images and metadata to Pinata IPFS
- Provide faster transaction processing
- Offer better error handling and user experience

## 💡 Pro Tips

1. **Rate Limits**: Helius free tier provides higher limits than default RPC
2. **Monitoring**: Check your Helius and Pinata dashboards for usage stats
3. **Backup**: Consider setting up multiple RPC endpoints for redundancy
4. **Security**: Never commit your `.env.local` file to version control
5. **Production**: Switch to mainnet URLs when deploying to production

---

🎉 **You're all set!** Your DearFuture Web3 app is now powered by Helius RPC and Pinata IPFS for optimal performance and reliability. 