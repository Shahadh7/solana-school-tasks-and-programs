import { Connection, PublicKey, Transaction, VersionedTransaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Program, AnchorProvider, web3, BN, Idl } from '@coral-xyz/anchor';
import { createOptimizedConnection } from '@/lib/rpc-config';
import idlJson from '@/idl/dear_future.json';

type DearFutureProgram = Program<Idl>;

export interface CapsuleData {
  title: string;
  content: string;
  unlockDate: number;
  encryptedImageUrl: string;
  encryptedImageIv: string;
}

export interface CreateCapsuleResult {
  signature: string;
  capsuleAddress: string;
  capsuleId: number;
}

export interface UnlockCapsuleResult {
  signature: string;
  decryptedImageUrl: string;
  encryptedUrl?: string;
}

export interface TransferCapsuleResult {
  signature: string;
  newOwner: string;
}

export interface Wallet {
  publicKey: PublicKey;
  signTransaction: <T extends Transaction | VersionedTransaction>(transaction: T) => Promise<T>;
  signMessage: (message: Uint8Array) => Promise<Uint8Array>;
}

class SolanaService {
  private connection: Connection;
  private programId: PublicKey;
  private provider: AnchorProvider;

  constructor() {
    this.connection = createOptimizedConnection();
    this.programId = new PublicKey(process.env.NEXT_PUBLIC_PROGRAM_ID || '4UHykQD4g6ANrhZXYnKtECq9dq4HxV3JbFCkkRE4krX5');
    this.provider = {} as AnchorProvider;
  }

  setProvider(wallet: Wallet): void {
    this.provider = new AnchorProvider(
      this.connection,
      {
        publicKey: wallet.publicKey,
        signTransaction: wallet.signTransaction,
        signAllTransactions: async (transactions) => {
          const signedTxs = [];
          for (const tx of transactions) {
            signedTxs.push(await wallet.signTransaction(tx));
          }
          return signedTxs;
        },
      },
      { commitment: 'confirmed' }
    );
  }

  private getProgram(): DearFutureProgram {
    const idl = idlJson as Idl;
    return new Program(idl, this.provider);
  }

  private findConfigPDA(): [PublicKey, number] {
    const seeds = [Buffer.from('config')];
    return PublicKey.findProgramAddressSync(seeds, this.programId);
  }

  private findCapsulePDA(creator: PublicKey, capsuleId: number): [PublicKey, number] {
    const seeds = [
      Buffer.from('capsule'),
      creator.toBuffer(),
      new BN(capsuleId).toArray('le', 8)
    ];
    return PublicKey.findProgramAddressSync(seeds, this.programId);
  }

  async initializeConfig(wallet: Wallet): Promise<string> {
    this.setProvider(wallet);
    const program = this.getProgram();
    const [configPda] = this.findConfigPDA();

    const tx = await program.methods
      .initializeConfig()
      .accounts({
        config: configPda,
        authority: wallet.publicKey,
        systemProgram: web3.SystemProgram.programId,
      })
      .rpc();

    return tx;
  }

  async createCapsule(wallet: Wallet, capsuleData: CapsuleData): Promise<CreateCapsuleResult> {
    this.setProvider(wallet);
    const program = this.getProgram();
    
    const [configPda] = this.findConfigPDA();
    
    let capsuleId = 0;
    try {
      const configAccount = await (program.account as Record<string, unknown>)['config'].fetch(configPda);
      capsuleId = configAccount.totalCapsules.toNumber();
    } catch {
      capsuleId = 0;
    }
    
    const [capsulePda] = this.findCapsulePDA(wallet.publicKey, capsuleId);
    
    const tx = await program.methods
      .createCapsule(
        capsuleData.title,
        capsuleData.content,
        new BN(capsuleData.unlockDate),
        capsuleData.encryptedImageUrl || null
      )
      .accounts({
        config: configPda,
        capsule: capsulePda,
        creator: wallet.publicKey,
        systemProgram: web3.SystemProgram.programId,
      })
      .rpc();

    return {
      signature: tx,
      capsuleAddress: capsulePda.toString(),
      capsuleId
    };
  }

  async updateCapsule(
    wallet: Wallet,
    capsuleAddress: string,
    newContent?: string,
    newUnlockDate?: number,
    newEncryptedUrl?: string,
    removeEncryptedUrl?: boolean
  ): Promise<string> {
    this.setProvider(wallet);
    const program = this.getProgram();
    
    const capsulePubkey = new PublicKey(capsuleAddress);
    
    const tx = await program.methods
      .updateCapsule(
        newContent || null,
        newUnlockDate ? new BN(newUnlockDate) : null,
        newEncryptedUrl || null,
        removeEncryptedUrl || false
      )
      .accounts({
        capsule: capsulePubkey,
        owner: wallet.publicKey,
      })
      .rpc();

    return tx;
  }

  async unlockCapsule(wallet: Wallet, capsuleAddress: string): Promise<UnlockCapsuleResult> {
    this.setProvider(wallet);
    const program = this.getProgram();
    
    const capsulePubkey = new PublicKey(capsuleAddress);
    
    const tx = await program.methods
      .unlockCapsule()
      .accounts({
        capsule: capsulePubkey,
        owner: wallet.publicKey,
      })
      .rpc();

    const capsuleAccount = await (program.account as Record<string, unknown>)['capsule'].fetch(capsulePubkey);
    
    return {
      signature: tx,
      decryptedImageUrl: capsuleAccount.content,
      encryptedUrl: capsuleAccount.encryptedUrl
    };
  }

  async closeCapsule(wallet: Wallet, capsuleAddress: string): Promise<string> {
    this.setProvider(wallet);
    const program = this.getProgram();
    
    const capsulePubkey = new PublicKey(capsuleAddress);
    
    const tx = await program.methods
      .closeCapsule()
      .accounts({
        capsule: capsulePubkey,
        owner: wallet.publicKey,
      })
      .rpc();

    return tx;
  }

  async transferCapsule(
    wallet: Wallet,
    capsuleAddress: string,
    newOwner: string,
    mintAddress?: string
  ): Promise<TransferCapsuleResult> {
    this.setProvider(wallet);
    const program = this.getProgram();
    
    try {
      // Transfer capsule inputs logged silently

      const capsulePubkey = new PublicKey(capsuleAddress);
      const newOwnerPubkey = new PublicKey(newOwner);
      
      let mintPubkey = null;
      if (mintAddress) {
        try {
          mintPubkey = new PublicKey(mintAddress);
        } catch (error) {
          // Invalid mint address provided, using null instead
          mintPubkey = null;
        }
      } else {
        // No mint address provided
      }
      
      const tx = await program.methods
        .transferCapsule(mintPubkey)
        .accounts({
          capsule: capsulePubkey,
          currentOwner: wallet.publicKey,
          newOwner: newOwnerPubkey,
          systemProgram: web3.SystemProgram.programId,
        })
        .rpc();

      // Transfer transaction successful

      return {
        signature: tx,
        newOwner: newOwner,
      };
    } catch (error) {
      console.error('Transfer capsule error:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('Invalid public key input')) {
          throw new Error(`Invalid address format. Please check: ${newOwner}`);
        } else if (error.message.includes('NotOwner')) {
          throw new Error('You are not the owner of this capsule');
        } else if (error.message.includes('CannotTransferToSelf')) {
          throw new Error('Cannot transfer capsule to yourself');
        } else {
          throw new Error(`Transfer failed: ${error.message}`);
        }
      }
      
      throw error;
    }
  }

    async getWalletCapsules(wallet: Wallet): Promise<Record<string, unknown>[]> {
    this.setProvider(wallet);
    const program = this.getProgram();
    

    
    try {
      const allCapsules = await (program.account as Record<string, unknown>)['capsule'].all();

      
      const userCapsules = allCapsules.filter((capsule: Record<string, unknown>) => 
        capsule.account.creator.toString() === wallet.publicKey.toString() ||
        capsule.account.owner.toString() === wallet.publicKey.toString()
      );
      

      
      const capsules = userCapsules.map((capsule: Record<string, unknown>) => ({
        address: capsule.publicKey.toString(),
        ...capsule.account,
      }));
      
      capsules.sort((a: Record<string, unknown>, b: Record<string, unknown>) => b.createdAt.toNumber() - a.createdAt.toNumber());
      
      return capsules;
    } catch {
      
      const accounts = await this.connection.getProgramAccounts(this.programId);


      const capsules = [];
      for (const account of accounts) {
        try {
          const capsuleData = await (program.account as Record<string, unknown>)['capsule'].fetch(account.pubkey);

          
          if (capsuleData.creator.toString() === wallet.publicKey.toString() ||
              capsuleData.owner.toString() === wallet.publicKey.toString()) {
            capsules.push({
              address: account.pubkey.toString(),
              ...capsuleData,
            });

          }
        } catch {
          continue;
        }
      }



      capsules.sort((a: Record<string, unknown>, b: Record<string, unknown>) => b.createdAt.toNumber() - a.createdAt.toNumber());

      return capsules;
    }
  }

  isReadyToUnlock(unlockDate: number): boolean {
    const currentTime = Math.floor(Date.now() / 1000);
    return currentTime >= unlockDate;
  }

  getTimeUntilUnlock(unlockDate: number): string {
    const currentTime = Math.floor(Date.now() / 1000);
    const diff = unlockDate - currentTime;
    
    if (diff <= 0) return 'Unlocked';
    
    const days = Math.floor(diff / (24 * 60 * 60));
    const hours = Math.floor((diff % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((diff % (60 * 60)) / 60);
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }

  getConnection(): Connection {
    return this.connection;
  }

  getConnectionStatus(): boolean {
    return this.connection.rpcEndpoint !== '';
  }

  async getCurrentSlot(): Promise<number> {
    try {
      return await this.connection.getSlot();
    } catch {
      return 0;
    }
  }

  async getWalletBalance(walletAddress: PublicKey): Promise<number> {
    try {
      const balance = await this.connection.getBalance(walletAddress);
      return balance / LAMPORTS_PER_SOL;
    } catch {
      return 0;
    }
  }
}

export const solanaService = new SolanaService();
