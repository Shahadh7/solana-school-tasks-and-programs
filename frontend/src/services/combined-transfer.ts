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

  async transferCapsuleWithCNFT(
    wallet: Wallet,
    params: CombinedTransferParams
  ): Promise<CombinedTransferResult> {
    const { capsuleAddress, newOwner, assetId, includeCNFT } = params;
    
    let capsuleTransferResult: TransferCapsuleResult | null = null;
    let cnftTransferSignature: string | null = null;
    
    try {

      this.validateTransferParams(params);
      

      console.log('🔄 Starting capsule transfer...');
      capsuleTransferResult = await solanaService.transferCapsule(
        wallet,
        capsuleAddress,
        newOwner,
        assetId 
      );
      
      console.log('✅ Capsule transfer successful:', capsuleTransferResult.signature);
      

      if (includeCNFT && assetId) {
        console.log('🔄 Starting cNFT transfer...');
        

        await cnftService.initialize({
          publicKey: wallet.publicKey,
          signTransaction: wallet.signTransaction as unknown as <T>(transaction: T) => Promise<T>,
          signMessage: wallet.signMessage,
        });
        

        cnftTransferSignature = await cnftService.transferCNFT({
          assetId,
          newOwner,
        });
        
        console.log('✅ cNFT transfer successful:', cnftTransferSignature);
      }
      

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

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      console.error('❌ Combined transfer failed:', errorMessage);
      

      const capsuleSuccess = !!capsuleTransferResult;
      const cnftSuccess = !!cnftTransferSignature;
      

      if (capsuleSuccess && includeCNFT && !cnftSuccess) {
        throw new CombinedTransferError(
          `Capsule transfer succeeded but cNFT transfer failed: ${errorMessage}. The capsule ownership has been transferred, but the cNFT remains with the original owner.`,
          true,
          false,
          capsuleTransferResult?.signature,
          undefined
        );
      }
      

      if (!capsuleSuccess) {
        throw new CombinedTransferError(
          `Capsule transfer failed: ${errorMessage}`,
          false,
          false
        );
      }
      

      throw error;
    }
  }
  

  

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
