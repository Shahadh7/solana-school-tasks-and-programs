# 🔗 DearFuture Web3 - Solana Smart Contract

Anchor-based Solana program for time-locked memory capsules with NFT support and ownership transfers.

## 🌟 Features

- **Time-locked Capsules**: Create memory capsules with future unlock dates
- **Transfer System**: Complete ownership transfer functionality with NFT support
- **Owner vs Creator**: Distinct roles with appropriate permissions
- **NFT Integration**: Mint address tracking with creator attribution
- **Encrypted Content**: Support for encrypted URLs and off-chain data
- **Access Control**: Comprehensive security with owner-based permissions
- **Event Emissions**: All operations emit proper events for tracking

## 🚀 Quick Start

### Prerequisites

- Rust 1.70+
- Solana CLI 1.16+
- Anchor Framework 0.29+
- Node.js 18+ (for scripts)

### Installation

```bash
# Install dependencies
npm install

# Build the program
anchor build

# Run tests
anchor test
```

## 🔧 Deployment

### 🌐 Live Devnet Deployment

**Program is currently deployed and active on Solana Devnet:**

- **Program ID**: `4UHykQD4g6ANrhZXYnKtECq9dq4HxV3JbFCkkRE4krX5`
- **Network**: Devnet
- **Config PDA**: `8NxgAW7gbLJgSYk1fJaKLQTL6Wf3LbDZaFanRZtxjcKk`
- **Status**: ✅ Deployed and Initialized

**Explorer Links:**
- [Program Account](https://explorer.solana.com/address/4UHykQD4g6ANrhZXYnKtECq9dq4HxV3JbFCkkRE4krX5?cluster=devnet)
- [Config Account](https://explorer.solana.com/address/8NxgAW7gbLJgSYk1fJaKLQTL6Wf3LbDZaFanRZtxjcKk?cluster=devnet)

### Local Development

```bash
# Start local validator
solana-test-validator

# Deploy to localnet
anchor deploy
```

### Deploy to Devnet (New Instance)

```bash
# Configure for devnet
solana config set --url https://api.devnet.solana.com

# Generate new program keypair
solana-keygen new --outfile target/deploy/dear_future-keypair.json

# Update program ID in lib.rs and Anchor.toml
# Build and deploy
anchor build
anchor deploy --provider.cluster devnet
```

### Initialize Configuration

```bash
# Run initialization script (automated)
./scripts/init-config.sh

# Or manually initialize
ts-node scripts/initialize-config.ts
```

## 📋 Program Instructions

### `initialize_config`
Initializes the global program configuration.

**Accounts:**
- `config`: Global configuration PDA
- `authority`: Program authority (signer)
- `system_program`: Solana system program

### `create_capsule`
Creates a new time-locked memory capsule.

**Parameters:**
- `title`: Capsule title (max 100 chars)
- `content`: Capsule content (max 300 chars)
- `unlock_date`: Future timestamp when capsule unlocks
- `encrypted_url`: Optional encrypted URL for off-chain content (max 500 chars)

**Accounts:**
- `config`: Global configuration PDA
- `capsule`: New capsule PDA
- `creator`: Capsule creator (signer)
- `system_program`: Solana system program

### `update_capsule`
Updates capsule metadata (only before unlock, only by owner).

**Parameters:**
- `new_content`: New content (optional)
- `new_unlock_date`: New unlock date (can only extend, optional)
- `new_encrypted_url`: New encrypted URL (optional)
- `remove_encrypted_url`: Remove existing encrypted URL

**Accounts:**
- `capsule`: Capsule to update
- `owner`: Current capsule owner (signer)

### `unlock_capsule`
Unlocks a capsule after the unlock date has passed.

**Accounts:**
- `capsule`: Capsule to unlock
- `owner`: Current capsule owner (signer)

### `transfer_capsule`
Transfers capsule ownership to another user with optional NFT support.

**Parameters:**
- `mint_address`: Optional NFT mint address to associate with transfer

**Accounts:**
- `capsule`: Capsule to transfer
- `current_owner`: Current owner (signer)
- `new_owner`: New owner (unchecked account)
- `system_program`: Solana system program

### `close_capsule`
Closes and deletes an unlocked capsule, returning rent to owner.

**Accounts:**
- `capsule`: Capsule to close (must be unlocked)
- `owner`: Current capsule owner (signer)

## 🏗️ Program Architecture

### State Accounts

#### `Config`
```rust
pub struct Config {
    pub authority: Pubkey,
    pub total_capsules: u64,
    pub version: u8,
    pub reserved: [u8; 31],
}
```

#### `Capsule`
```rust
pub struct Capsule {
    // Core fields
    pub creator: Pubkey,              // Original creator
    pub owner: Pubkey,                // Current owner (can be different after transfer)
    pub id: u64,
    pub unlock_date: i64,
    pub created_at: i64,
    pub updated_at: i64,
    pub transferred_at: Option<i64>,   // When last transferred
    pub mint: Option<Pubkey>,          // NFT mint address if minted
    pub mint_creator: Option<Pubkey>,  // Creator when NFT was minted
    pub bump: u8,
    pub is_unlocked: bool,
    
    // String fields with max lengths
    pub title: String,                 // Max 100 chars
    pub content: String,               // Max 300 chars
    pub encrypted_url: Option<String>, // Max 500 chars
}
```

### PDAs (Program Derived Addresses)

- **Config PDA**: `["config"]`
- **Capsule PDA**: `["capsule", creator.key(), capsule_id.to_le_bytes()]`

## 🔒 Security Features

- **Time Lock Validation**: Prevents early unlocking of capsules
- **Owner vs Creator Access**: Distinct roles with appropriate permissions
- **Transfer Security**: Only current owners can transfer capsules
- **Self-Transfer Prevention**: Cannot transfer to same owner
- **PDA Security**: Uses secure program-derived addresses
- **Input Validation**: Validates all string inputs for length and content
- **Authority Control**: Global configuration controlled by program authority
- **State Validation**: Cannot update capsules after unlock

## 🧪 Testing

```bash
# Run all tests
anchor test

# Run specific test file
anchor test --skip-local-validator tests/dear_future_capsule.ts
```

### Test Coverage

**✅ 40 tests passing (100% success rate)**

- ✅ **Config initialization** - Program setup and configuration
- ✅ **Capsule creation** - All creation scenarios with validation
- ✅ **Capsule updates** - Content and metadata updates with restrictions
- ✅ **Time lock validation** - Unlock date enforcement and validation
- ✅ **Unlock functionality** - Time-based unlocking with owner verification
- ✅ **Transfer operations** - Complete ownership transfer system
- ✅ **Owner vs Creator access** - Distinct role permissions
- ✅ **NFT integration** - Mint address tracking and creator attribution
- ✅ **Edge cases** - Boundary values and error conditions
- ✅ **Security scenarios** - Access controls and data integrity
- ✅ **Error handling** - Comprehensive error validation

## 📊 Events

The program emits events for important operations:

### `CapsuleCreated`
```rust
pub struct CapsuleCreated {
    pub capsule: Pubkey,
    pub creator: Pubkey,
    pub title: String,
    pub unlock_date: i64,
    pub timestamp: i64,
}
```

### `CapsuleUpdated`
```rust
pub struct CapsuleUpdated {
    pub capsule: Pubkey,
    pub updater: Pubkey,
    pub new_unlock_date: Option<i64>,
    pub content_updated: bool,
    pub url_updated: bool,
    pub timestamp: i64,
}
```

### `CapsuleUnlocked`
```rust
pub struct CapsuleUnlocked {
    pub capsule: Pubkey,
    pub unlocker: Pubkey,
    pub timestamp: i64,
}
```

### `CapsuleTransferred`
```rust
pub struct CapsuleTransferred {
    pub capsule: Pubkey,
    pub from: Pubkey,
    pub to: Pubkey,
    pub mint: Option<Pubkey>,
    pub timestamp: i64,
}
```

### `CapsuleClosed`
```rust
pub struct CapsuleClosed {
    pub capsule: Pubkey,
    pub closer: Pubkey,
    pub timestamp: i64,
}
```

## 🛠️ Development Scripts

### Available Scripts

```bash
# Initialize program configuration on devnet
./scripts/init-config.sh

# Initialize with TypeScript directly
ts-node scripts/initialize-config.ts

# Run comprehensive tests
anchor test

# Run edge case tests
anchor test tests/dear_future_edge_cases.ts --skip-local-validator
```

### Environment Variables

```bash
# Set in your shell or .env file
ANCHOR_PROVIDER_URL=https://api.devnet.solana.com
ANCHOR_WALLET=~/.config/solana/id.json
```

## 🚀 Integration with Frontend

The program is designed to work seamlessly with the frontend application:

1. **Program ID**: Update `NEXT_PUBLIC_PROGRAM_ID` to `4UHykQD4g6ANrhZXYnKtECq9dq4HxV3JbFCkkRE4krX5`
2. **Network**: Set to `devnet` for development
3. **Config PDA**: Use `8NxgAW7gbLJgSYk1fJaKLQTL6Wf3LbDZaFanRZtxjcKk` for configuration queries
4. **IDL**: Generated IDL in `target/idl/dear_future.json` for TypeScript client
5. **Events**: Frontend can listen to all 5 program events for real-time updates

### Frontend Environment Variables
```bash
NEXT_PUBLIC_PROGRAM_ID=4UHykQD4g6ANrhZXYnKtECq9dq4HxV3JbFCkkRE4krX5
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_CONFIG_PDA=8NxgAW7gbLJgSYk1fJaKLQTL6Wf3LbDZaFanRZtxjcKk
```

## 🔧 Customization

### Modifying Program Logic

1. **Instructions**: Add new instructions in `src/instructions/`
2. **State**: Modify state structures in `src/state.rs`
3. **Events**: Add new events in `src/events.rs`
4. **Errors**: Define custom errors in `src/errors.rs`

### Configuration Options

- **Fee Structure**: Modify `fee_basis_points` in config
- **String Limits**: Adjust max lengths in validation
- **Time Constraints**: Customize minimum/maximum unlock periods

## 🐛 Troubleshooting

### Common Issues

1. **Build Errors**: Ensure Rust and Anchor versions are compatible
2. **Deploy Failures**: Check Solana CLI configuration and wallet balance
3. **Test Failures**: Verify local validator is running
4. **PDA Conflicts**: Ensure unique seeds for program-derived addresses

### Debugging

```bash
# View program logs
solana logs <PROGRAM_ID>

# Check account data
solana account <ACCOUNT_ADDRESS>

# Verify program deployment
solana program show <PROGRAM_ID>
```

## 📈 Performance Considerations

- **Account Size**: Capsule accounts are optimally sized for rent exemption
- **Compute Units**: Instructions are designed to stay within compute limits
- **Memory Usage**: Efficient string handling to minimize account size
- **PDA Generation**: Optimized seed generation for quick lookups

## 🔐 Security Auditing

Before mainnet deployment:

1. **Code Review**: Thoroughly review all instruction logic
2. **Test Coverage**: Ensure comprehensive test coverage
3. **Fuzzing**: Test with edge cases and invalid inputs
4. **Third-party Audit**: Consider professional security audit

## 📄 License

This program is part of the DearFuture Web3 ecosystem. See LICENSE file for details.

---

Built with ⚡ Anchor Framework for secure and efficient Solana programs.
