# Project Description

**Deployed Frontend URL:** [TODO: Link to your deployed frontend]

**Solana Program ID:** 5BY4zzPL5qWSwDeArRD82YpSY1utsJGBsgNisTPpuHTm

## Project Overview

### Description
**Dear Future** is a decentralized application (dApp) built on Solana that allows users to create, store, and unlock time-locked memory capsules. Users can upload images, write personal messages, and set future unlock dates. The content remains encrypted and locked until the specified time, creating a digital time capsule experience. The dApp also supports minting these capsules as compressed NFTs (cNFTs) for additional value and ownership.

### Key Features
- **Time-locked Memory Capsules**: Create capsules with images and messages that unlock at future dates
- **Client-side Encryption**: All sensitive data is encrypted using derived keys from wallet addresses
- **IPFS Integration**: Images and metadata stored on decentralized IPFS via Pinata
- **Solana Blockchain Storage**: Capsule data stored securely on Solana using PDAs
- **Compressed NFT Minting**: Option to mint capsules as cNFTs for ownership and trading
- **Real-time Updates**: WebSocket integration for live transaction monitoring
- **Wallet Integration**: Seamless Solana wallet connection and transaction signing

## How to Use the dApp

1. **Connect Wallet**
   - Install a Solana wallet (Phantom, Solflare, etc.)
   - Connect your wallet to the application
   - Ensure you have SOL for transaction fees

2. **Create Memory Capsule**
   - Upload an image (PNG, JPG, GIF, WebP up to 10MB)
   - Enter a capsule name and personal message
   - Set a future unlock date and time
   - Click "Create Capsule" to upload to IPFS, encrypt data, and store on Solana

3. **Manage Capsules**
   - View all your created capsules in the "My Capsules" section
   - See unlock countdown timers for locked capsules
   - Update capsule details before unlocking (if needed)

4. **Unlock Capsules**
   - When the unlock date arrives, capsules become available for unlocking
   - Click "Unlock" to reveal the encrypted content
   - View the original image and message

5. **Mint cNFT (Optional)**
   - After creating a capsule, choose to mint it as a compressed NFT
   - The cNFT will contain the capsule metadata and image
   - Trade or transfer the cNFT as desired

## Program Architecture

### PDA Usage
The project implements Program Derived Addresses (PDAs) for secure account management:

**PDAs Used:**
- **Config PDA**: `[b"config"]` - Global program configuration and capsule counter
- **Capsule PDA**: `[b"capsule", creator_pubkey, capsule_id]` - Individual capsule accounts with unique addressing

### Program Instructions

**Instructions Implemented:**
- **`initialize_config`**: Sets up global program configuration (first-time setup)
- **`create_capsule`**: Creates new memory capsules with title, content, and unlock date
- **`update_capsule`**: Modifies capsule content and unlock date before unlocking
- **`unlock_capsule`**: Reveals capsule content when the time comes
- **`close_capsule`**: Closes and cleans up capsule accounts

### Account Structure

```rust
#[account]
pub struct Config {
    pub authority: Pubkey,        // Program authority
    pub total_capsules: u64,      // Global capsule counter
    pub version: u8,              // Program version
    pub reserved: [u8; 31],      // Reserved space for future use
}

#[account]
pub struct Capsule {
    pub creator: Pubkey,          // Capsule creator's wallet address
    pub id: u64,                  // Unique capsule identifier
    pub title: String,            // Capsule title (max 100 chars)
    pub content: String,          // Encrypted content and metadata (max 500 chars)
    pub unlock_date: i64,         // Unix timestamp for unlock
    pub is_unlocked: bool,        // Current lock status
    pub mint: Option<Pubkey>,     // Optional cNFT mint address
    pub created_at: i64,          // Creation timestamp
    pub updated_at: i64,          // Last update timestamp
    pub bump: u8,                 // PDA bump seed
}
```

## Technical Implementation

### Encryption System
- **Client-side Encryption**: Uses Web Crypto API with AES-GCM
- **Derived Keys**: Secret keys derived from wallet public key + capsule data
- **Deterministic**: Same capsule data always produces the same encryption key
- **No Storage**: Secret keys are never stored, only derived when needed

### Data Flow
1. **Image Upload**: User uploads image to Pinata IPFS
2. **Encryption**: Pinata URL encrypted using derived key
3. **Capsule Creation**: Encrypted data stored on Solana blockchain
4. **Unlocking**: When time comes, data decrypted and revealed
5. **cNFT Minting**: Optional step to create compressed NFT

### Frontend Architecture
- **Next.js 15**: Modern React framework with TypeScript
- **Tailwind CSS**: Utility-first CSS framework
- **Zustand**: Lightweight state management
- **Solana Wallet Adapters**: Wallet integration
- **WebSocket**: Real-time transaction monitoring

## Testing

### Test Coverage
The project includes comprehensive testing for all Solana program instructions:

**Happy Path Tests:**
- Config initialization with proper authority setup
- Capsule creation with valid parameters
- Capsule unlocking when time conditions are met
- Capsule updates before unlocking
- Capsule closure and cleanup

**Unhappy Path Tests:**
- Duplicate config initialization (should fail)
- Capsule creation with past unlock dates (should fail)
- Capsule unlocking before time (should fail)
- Invalid account constraints and permissions
- Data validation (title/content length limits)

### Running Tests
```bash
cd anchor_project
anchor test
```

### Test Scenarios
- PDA derivation and validation
- Account constraint verification
- Error handling and custom error codes
- Event emission verification
- State transitions and updates

## Deployment

### Smart Contract
- **Network**: Solana Devnet (configurable for Mainnet)
- **Program ID**: 5BY4zzPL5qWSwDeArRD82YpSY1utsJGBsgNisTPpuHTm
- **Status**: Ready for deployment

### Frontend
- **Framework**: Next.js with TypeScript
- **Deployment**: Ready for Vercel, Netlify, or other platforms
- **Environment**: Configurable for different Solana networks

## Security Features

- **PDA-based Addressing**: Prevents address collisions
- **Client-side Encryption**: Sensitive data never leaves user's device unencrypted
- **Deterministic Key Derivation**: No secret storage required
- **Account Constraints**: Proper validation of all account relationships
- **Time-based Access Control**: Content locked until specified date

## Future Enhancements

- **Real cNFT Minting**: Integration with Metaplex Bubblegum
- **Social Features**: Sharing and discovery of public capsules
- **Advanced Encryption**: Support for multiple encryption algorithms
- **Batch Operations**: Multiple capsule management
- **Mobile App**: Native mobile application
- **Analytics**: Capsule creation and usage statistics

## Additional Notes for Evaluators

This project demonstrates a comprehensive understanding of Solana development concepts including:
- **PDA Implementation**: Proper use of Program Derived Addresses for secure account management
- **Client-side Security**: Innovative approach to data privacy without server-side key storage
- **Real-time Integration**: WebSocket and transaction monitoring for enhanced user experience
- **Error Handling**: Comprehensive error scenarios and user feedback
- **State Management**: Efficient frontend state management with Zustand
- **Type Safety**: Full TypeScript implementation with proper interfaces

The dApp successfully combines blockchain technology with practical use cases, creating a unique platform for time-locked digital memories while maintaining user privacy and data security.