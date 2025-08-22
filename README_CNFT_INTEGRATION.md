# CNFT Transfer Integration

This document describes the implementation of Compressed NFT (cNFT) transfer functionality in the Dear Future Memory Capsule project.

## Overview

The CNFT transfer feature allows capsule owners to transfer both their memory capsule and the associated compressed NFT to another wallet address. This provides a complete ownership transfer experience for users.

## Features Implemented

### 1. CNFT Transfer Service (`frontend/src/services/cnft.ts`)

- **Enhanced `transferCNFT` method**: Implements full cNFT transfer using Metaplex Bubblegum v2
- **DAS API Integration**: Fetches asset data and merkle proofs from Helius DAS API
- **Proper error handling**: Comprehensive error handling for transfer failures
- **Type safety**: Accepts both string and UMI public key formats for flexibility

### 2. Enhanced Transfer Dialog (`frontend/src/components/MyCapsules.tsx`)

- **CNFT Transfer Checkbox**: Users can choose to transfer both capsule and cNFT
- **Dynamic UI**: Checkbox only appears when capsule has associated cNFT
- **Smart Validation**: Prevents CNFT transfer when not applicable
- **User Feedback**: Clear messaging about what will be transferred

### 3. Transfer Logic

- **Owner Validation**: Only capsule owners can initiate transfers
- **Sequential Transfer**: Capsule transfer happens first, then CNFT transfer
- **Fallback Handling**: If CNFT transfer fails, capsule transfer still succeeds
- **State Management**: Proper cleanup of transfer states and dialogs

## Technical Implementation

### CNFT Transfer Process

1. **Asset Data Fetching**: Retrieves compressed NFT data from Helius DAS API
2. **Merkle Proof Generation**: Fetches merkle proofs required for transfer
3. **Transaction Creation**: Builds transfer transaction using Bubblegum v2
4. **Transaction Execution**: Sends and confirms the transfer transaction
5. **Result Handling**: Returns transaction signature for verification

### Key Components

```typescript
// CNFT Transfer Interface
interface CNFTTransferParams {
  assetId: string
  newOwner: string | UmiPublicKey
  merkleTree?: UmiPublicKey
  leafIndex?: number
  proof?: UmiPublicKey[]
}

// Transfer Result
interface TransferResult {
  signature: string
  newOwner: string
}
```

### DAS API Integration

- **Asset Proofs**: Fetches merkle proofs from `/assets/{assetId}/proof` endpoint
- **Asset Data**: Retrieves compression metadata and ownership information
- **Error Handling**: Graceful fallback when DAS API is unavailable

## User Experience

### Transfer Flow

1. **User clicks "Transfer" button** on a capsule
2. **Transfer dialog opens** with recipient address input
3. **CNFT checkbox appears** (if capsule has associated cNFT)
4. **User enters recipient address** and optionally checks CNFT transfer
5. **Transfer executes**:
   - Capsule ownership transfers on Solana
   - If selected, cNFT transfers via Bubblegum
6. **Success feedback** shows transfer completion

### UI Elements

- **Dynamic Button Text**: Shows "Transfer Capsule" or "Transfer Capsule & cNFT"
- **Conditional Checkbox**: Only appears when CNFT transfer is possible
- **Progress Indicators**: Separate loading states for capsule and CNFT transfers
- **Error Handling**: Clear error messages for failed transfers

## Security Features

### Access Control

- **Owner Verification**: Only capsule owners can initiate transfers
- **Signature Validation**: All transactions require proper wallet signatures
- **State Validation**: Ensures capsule state is valid before transfer

### Validation Checks

- **Address Format**: Validates Solana wallet addresses
- **CNFT Availability**: Checks if capsule has associated compressed NFT
- **Transfer State**: Prevents transfers during active operations

## Error Handling

### Transfer Failures

- **Capsule Transfer Failure**: User notified of complete failure
- **CNFT Transfer Failure**: Capsule transfer succeeds, CNFT transfer fails separately
- **Network Issues**: Graceful handling of RPC and API failures
- **User Feedback**: Clear error messages with actionable information

### Fallback Scenarios

- **DAS API Unavailable**: Falls back to capsule-only transfer
- **Proof Generation Failed**: Notifies user of CNFT transfer limitation
- **Transaction Timeout**: Automatic cleanup and user notification

## Configuration

### Environment Variables

```bash
# Required for CNFT functionality
NEXT_PUBLIC_HELIUS_API_KEY=your_helius_api_key
NEXT_PUBLIC_HELIUS_DAS_URL=https://api.helius.xyz
NEXT_PUBLIC_RPC_URL=your_rpc_endpoint

# Optional for Merkle tree management
NEXT_PUBLIC_MERKLE_TREE_ADDRESS=your_tree_address
```

### Dependencies

```json
{
  "@metaplex-foundation/mpl-bubblegum": "^5.0.2",
  "@metaplex-foundation/umi": "^1.2.0",
  "@metaplex-foundation/umi-bundle-defaults": "^1.2.0"
}
```

## Testing

### Test Scenarios

1. **Capsule-Only Transfer**: Transfer without CNFT
2. **Capsule + CNFT Transfer**: Complete ownership transfer
3. **Invalid Address**: Error handling for malformed addresses
4. **Non-Owner Transfer**: Access control validation
5. **CNFT Transfer Failure**: Partial transfer handling

### Test Commands

```bash
# Run linting
npm run lint

# Run tests (when implemented)
npm test

# Build project
npm run build
```

## Future Enhancements

### Planned Features

- **Batch Transfers**: Transfer multiple capsules simultaneously
- **Transfer History**: Track all transfer operations
- **Advanced Validation**: Additional security checks and validations
- **Performance Optimization**: Caching for frequently accessed data

### Integration Opportunities

- **Wallet Integration**: Direct wallet-to-wallet transfers
- **Marketplace Support**: Integration with NFT marketplaces
- **Analytics**: Transfer analytics and reporting
- **Notifications**: Real-time transfer status updates

## Troubleshooting

### Common Issues

1. **CNFT Transfer Fails**: Check DAS API availability and asset ownership
2. **Proof Generation Errors**: Verify Helius API key and endpoint configuration
3. **Transaction Timeouts**: Check RPC endpoint performance and network stability
4. **Type Errors**: Ensure all dependencies are properly installed and updated

### Debug Information

- **Console Logs**: Detailed transfer process logging
- **Error Messages**: Specific error details for troubleshooting
- **Transaction Signatures**: Blockchain transaction verification
- **API Responses**: DAS API response validation

## Conclusion

The CNFT transfer integration provides a comprehensive solution for transferring both memory capsules and their associated compressed NFTs. The implementation follows best practices for security, user experience, and error handling, ensuring a robust and user-friendly transfer experience.

For questions or issues, please refer to the project documentation or create an issue in the project repository.
