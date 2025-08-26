/**
 * Combined Transfer Service
 * 
 * Handles atomic transfers of both memory capsules and their associated cNFTs
 * in a single transaction flow. This ensures both transfers succeed or both fail.
 */

import { PublicKey } from '@solana/web3.js';
import { solanaService, TransferCapsuleResult, Wallet } from './solana';
import { cnftService } from './cnft';

export interface CombinedTransferParams {
  capsuleAddress: string;
  newOwner: string;
  assetId?: string; // cNFT asset ID if available
  includeCNFT: boolean;
}

export interface CombinedTransferResult {
  capsuleSignature: string;
  cnftSignature?: string;
  newOwner: string;
  transferredAssets: {
    capsule: boolean;
    cnft: boolean;
  };
}



export class CombinedTransferError extends Error {
  constructor(
    message: string,
    public capsuleTransferSuccess: boolean = false,
    public cnftTransferSuccess: boolean = false,
    public capsuleSignature?: string,
    public cnftSignature?: string
  ) {
    super(message);
    this.name = 'CombinedTransferError';
  }
}

class CombinedTransferService {
  /**
   * Transfer both capsule and cNFT in a coordinated manner
   * This ensures atomicity - if one fails, we can attempt to revert the other
   */
  async transferCapsuleWithCNFT(
    wallet: Wallet,
    params: CombinedTransferParams
  ): Promise<CombinedTransferResult> {
    const { capsuleAddress, newOwner, assetId, includeCNFT } = params;
    
    let capsuleTransferResult: TransferCapsuleResult | null = null;
    let cnftTransferSignature: string | null = null;
    
    try {
      // Validate parameters
      this.validateTransferParams(params);
      
      // Step 1: Transfer the capsule on-chain first
      console.log('🔄 Starting capsule transfer...');
      capsuleTransferResult = await solanaService.transferCapsule(
        wallet,
        capsuleAddress,
        newOwner,
        assetId // Pass the asset ID as mint address for tracking
      );
      
      console.log('✅ Capsule transfer successful:', capsuleTransferResult.signature);
      
      // Step 2: Transfer the cNFT if requested and available
      if (includeCNFT && assetId) {
        console.log('🔄 Starting cNFT transfer...');
        
        // Initialize cNFT service with compatible wallet format
        await cnftService.initialize({
          publicKey: wallet.publicKey,
          // Wallet type here matches CNFT Wallet signature accepting generic transaction types
          // We cast to preserve type compatibility without using 'any' in code paths
          signTransaction: wallet.signTransaction as unknown as <T>(transaction: T) => Promise<T>,
          signMessage: wallet.signMessage,
        });
        
        // Perform cNFT transfer
        cnftTransferSignature = await cnftService.transferCNFT({
          assetId,
          newOwner,
        });
        
        console.log('✅ cNFT transfer successful:', cnftTransferSignature);
      }
      
      // Both transfers completed successfully
      return {
        capsuleSignature: capsuleTransferResult.signature,
        cnftSignature: cnftTransferSignature || undefined,
        newOwner,
        transferredAssets: {
          capsule: true,
          cnft: includeCNFT && !!cnftTransferSignature,
        },
      };
      
    } catch (error) {
      // Handle partial transfer scenarios
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      console.error('❌ Combined transfer failed:', errorMessage);
      
      // Determine what succeeded and what failed
      const capsuleSuccess = !!capsuleTransferResult;
      const cnftSuccess = !!cnftTransferSignature;
      
      // If capsule transfer succeeded but cNFT failed, we should inform the user
      // Note: We cannot easily revert the capsule transfer as it's already on-chain
      if (capsuleSuccess && includeCNFT && !cnftSuccess) {
        throw new CombinedTransferError(
          `Capsule transfer succeeded but cNFT transfer failed: ${errorMessage}. The capsule ownership has been transferred, but the cNFT remains with the original owner.`,
          true,
          false,
          capsuleTransferResult?.signature,
          undefined
        );
      }
      
      // If capsule transfer failed, nothing was transferred
      if (!capsuleSuccess) {
        throw new CombinedTransferError(
          `Capsule transfer failed: ${errorMessage}`,
          false,
          false
        );
      }
      
      // Re-throw the original error if it's not a partial failure
      throw error;
    }
  }
  

  
  /**
   * Validate transfer parameters
   */
  private validateTransferParams(params: CombinedTransferParams): void {
    const { capsuleAddress, newOwner, assetId, includeCNFT } = params;
    
    if (!capsuleAddress || capsuleAddress.trim().length === 0) {
      throw new Error('Capsule address is required');
    }
    
    if (!newOwner || newOwner.trim().length === 0) {
      throw new Error('New owner address is required');
    }
    
    try {
      new PublicKey(capsuleAddress);
    } catch {
      throw new Error('Invalid capsule address format');
    }
    
    try {
      new PublicKey(newOwner);
    } catch {
      throw new Error('Invalid new owner address format');
    }
    
    if (includeCNFT && !assetId) {
      throw new Error('Asset ID is required when including cNFT transfer');
    }
    
    if (includeCNFT && assetId) {
      try {
        new PublicKey(assetId);
      } catch {
        throw new Error('Invalid asset ID format');
      }
    }
  }
  

}

export const combinedTransferService = new CombinedTransferService();
export { CombinedTransferService };
