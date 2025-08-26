import { PublicKey } from '@solana/web3.js';

export interface EncryptedData {
  encryptedUrl: string;
  iv: string;
}

export interface DecryptedData {
  decryptedUrl: string;
}

export class EncryptionService {
  async deriveSecretKey(
    walletPublicKey: PublicKey,
    title: string,
    unlockDate: number,
    creatorAddress: string
  ): Promise<CryptoKey> {
    const seed = `${walletPublicKey.toString()}-${title}-${unlockDate}-${creatorAddress}`;
    
    const encoder = new TextEncoder();
    const seedBuffer = encoder.encode(seed);
    
    const rawKey = await crypto.subtle.importKey(
      'raw',
      seedBuffer,
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );
    
    const derivedKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode('dear-future-salt'),
        iterations: 100000,
        hash: 'SHA-256'
      },
      rawKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
    
    return derivedKey;
  }

  async encryptPinataUrl(
    pinataUrl: string,
    walletPublicKey: PublicKey,
    title: string,
    unlockDate: number,
    creatorAddress: string
  ): Promise<EncryptedData> {
    try {
      const key = await this.deriveSecretKey(walletPublicKey, title, unlockDate, creatorAddress);
      
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      const encoder = new TextEncoder();
      const urlBuffer = encoder.encode(pinataUrl);
      
      const encryptedBuffer = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        urlBuffer
      );
      
      const encryptedUrl = btoa(String.fromCharCode(...new Uint8Array(encryptedBuffer)));
      const ivString = btoa(String.fromCharCode(...iv));
      
      return {
        encryptedUrl,
        iv: ivString
      };
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt Pinata URL');
    }
  }

  async decryptPinataUrl(
    encryptedData: EncryptedData,
    walletPublicKey: PublicKey,
    title: string,
    unlockDate: number,
    creatorAddress: string
  ): Promise<DecryptedData> {
    try {
      const key = await this.deriveSecretKey(walletPublicKey, title, unlockDate, creatorAddress);
      
      const encryptedBuffer = Uint8Array.from(atob(encryptedData.encryptedUrl), c => c.charCodeAt(0));
      const iv = Uint8Array.from(atob(encryptedData.iv), c => c.charCodeAt(0));
      
      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        encryptedBuffer
      );
      
      const decoder = new TextDecoder();
      const decryptedUrl = decoder.decode(decryptedBuffer);
      
      return {
        decryptedUrl
      };
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt Pinata URL');
    }
  }

  async extractPinataUrlForTransferredCapsule(
    encryptedData: EncryptedData,
    originalCreatorKey: PublicKey,
    title: string,
    unlockDate: number
  ): Promise<DecryptedData | null> {
    try {
      const key = await this.deriveSecretKey(originalCreatorKey, title, unlockDate, originalCreatorKey.toString());
      
      const encryptedBuffer = Uint8Array.from(atob(encryptedData.encryptedUrl), c => c.charCodeAt(0));
      const iv = Uint8Array.from(atob(encryptedData.iv), c => c.charCodeAt(0));
      
      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        encryptedBuffer
      );
      
      const decoder = new TextDecoder();
      const decryptedUrl = decoder.decode(decryptedBuffer);
      
      return {
        decryptedUrl
      };
    } catch (error) {
      // Failed to decrypt with original creator key for transferred capsule
      return null;
    }
  }

  constructDirectPinataUrl(ipfsHash: string): string {
    return `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
  }

  async tryExtractIPFSHash(encryptedData: EncryptedData): Promise<string | null> {
    try {
      const encryptedBuffer = Uint8Array.from(atob(encryptedData.encryptedUrl), c => c.charCodeAt(0));
      
      const decoder = new TextDecoder();
      const encryptedText = decoder.decode(encryptedBuffer);
      
      const ipfsHashMatch = encryptedText.match(/(Qm[1-9A-HJ-NP-Za-km-z]{44}|bafy[a-z2-7]{55})/);
      if (ipfsHashMatch) {
        return ipfsHashMatch[1];
      }
      
      return null;
    } catch (error) {
      // Failed to extract IPFS hash from encrypted data
      return null;
    }
  }

  async generateCapsuleHash(
    walletPublicKey: PublicKey,
    title: string,
    unlockDate: number,
    creatorAddress: string
  ): Promise<string> {
    const seed = `${walletPublicKey.toString()}-${title}-${unlockDate}-${creatorAddress}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(seed);
    
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return hashHex;
  }
}

export const encryptionService = new EncryptionService();
