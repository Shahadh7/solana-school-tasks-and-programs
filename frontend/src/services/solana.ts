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
    this.programId = new PublicKey('5BY4zzPL5qWSwDeArRD82YpSY1utsJGBsgNisTPpuHTm');
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
    
    // Get current capsule count
    let capsuleId = 0;
    try {
      const configAccount = await (program.account as any)['config'].fetch(configPda);
      capsuleId = configAccount.totalCapsules.toNumber();
    } catch (error) {
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
    newUnlockDate?: number
  ): Promise<string> {
    this.setProvider(wallet);
    const program = this.getProgram();
    
    const capsulePubkey = new PublicKey(capsuleAddress);
    
    const tx = await program.methods
      .updateCapsule(
        newContent || null,
        newUnlockDate ? new BN(newUnlockDate) : null,
        null,
        false
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

    const capsuleAccount = await (program.account as any)['capsule'].fetch(capsulePubkey);
    
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
    
    const capsulePubkey = new PublicKey(capsuleAddress);
    const newOwnerPubkey = new PublicKey(newOwner);
    const mintPubkey = mintAddress ? new PublicKey(mintAddress) : null;
    
    const tx = await program.methods
      .transferCapsule(mintPubkey)
      .accounts({
        capsule: capsulePubkey,
        currentOwner: wallet.publicKey,
        newOwner: newOwnerPubkey,
        systemProgram: web3.SystemProgram.programId,
      })
      .rpc();

    return {
      signature: tx,
      newOwner: newOwner,
    };
  }

    async getWalletCapsules(wallet: Wallet): Promise<any[]> {
    this.setProvider(wallet);
    const program = this.getProgram();
    

    
    try {
      // Try to use Anchor's account query first
      const allCapsules = await (program.account as any)['capsule'].all();

      
      const userCapsules = allCapsules.filter((capsule: any) => 
        capsule.account.creator.toString() === wallet.publicKey.toString() ||
        capsule.account.owner.toString() === wallet.publicKey.toString()
      );
      

      
      // Transform to the expected format
      const capsules = userCapsules.map((capsule: any) => ({
        address: capsule.publicKey.toString(),
        ...capsule.account,
      }));
      
      // Sort capsules by creation date (newest first)
      capsules.sort((a: any, b: any) => b.createdAt.toNumber() - a.createdAt.toNumber());
      
      return capsules;
    } catch (error) {
      
      // Fallback to RPC method
      const accounts = await this.connection.getProgramAccounts(this.programId);


      const capsules = [];
      for (const account of accounts) {
        try {
          const capsuleData = await (program.account as any)['capsule'].fetch(account.pubkey);

          
          // Include capsules created by or owned by the current wallet
          if (capsuleData.creator.toString() === wallet.publicKey.toString() ||
              capsuleData.owner.toString() === wallet.publicKey.toString()) {
            capsules.push({
              address: account.pubkey.toString(),
              ...capsuleData,
            });

          }
        } catch (error) {
          // Skip accounts that aren't capsule accounts
          continue;
        }
      }



      // Sort capsules by creation date (newest first)
      capsules.sort((a: any, b: any) => b.createdAt.toNumber() - a.createdAt.toNumber());

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

  getConnectionStatus(): boolean {
    return this.connection.rpcEndpoint !== '';
  }

  async getCurrentSlot(): Promise<number> {
    try {
      return await this.connection.getSlot();
    } catch (error) {
      return 0;
    }
  }

  async getWalletBalance(walletAddress: PublicKey): Promise<number> {
    try {
      const balance = await this.connection.getBalance(walletAddress);
      return balance / LAMPORTS_PER_SOL;
    } catch (error) {
      return 0;
    }
  }
}

export const solanaService = new SolanaService();
