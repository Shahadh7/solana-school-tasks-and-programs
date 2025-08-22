import { PublicKey } from '@solana/web3.js';

export interface EncryptedData {
  encryptedUrl: string;
  iv: string;
}

export interface DecryptedData {
  decryptedUrl: string;
}

class EncryptionService {
  /**
   * Derive a secret key from wallet public key and capsule data
   * This ensures the same capsule data always produces the same key
   */
  private async deriveSecretKey(
    walletPublicKey: PublicKey,
    title: string,
    unlockDate: number,
    creatorAddress: string
  ): Promise<CryptoKey> {
    // Create a deterministic seed from wallet and capsule data
    const seed = `${walletPublicKey.toString()}-${title}-${unlockDate}-${creatorAddress}`;
    
    // Convert seed to buffer
    const encoder = new TextEncoder();
    const seedBuffer = encoder.encode(seed);
    
    // Import the seed as a raw key
    const rawKey = await crypto.subtle.importKey(
      'raw',
      seedBuffer,
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );
    
    // Derive a key using PBKDF2 with the seed
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

  /**
   * Encrypt a Pinata URL using derived secret key
   */
  async encryptPinataUrl(
    pinataUrl: string,
    walletPublicKey: PublicKey,
    title: string,
    unlockDate: number,
    creatorAddress: string
  ): Promise<EncryptedData> {
    try {
      const key = await this.deriveSecretKey(walletPublicKey, title, unlockDate, creatorAddress);
      
      // Generate random IV
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      // Convert URL to buffer
      const encoder = new TextEncoder();
      const urlBuffer = encoder.encode(pinataUrl);
      
      // Encrypt the URL
      const encryptedBuffer = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        urlBuffer
      );
      
      // Convert to base64 strings for storage
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

  /**
   * Decrypt a Pinata URL using derived secret key
   */
  async decryptPinataUrl(
    encryptedData: EncryptedData,
    walletPublicKey: PublicKey,
    title: string,
    unlockDate: number,
    creatorAddress: string
  ): Promise<DecryptedData> {
    try {
      const key = await this.deriveSecretKey(walletPublicKey, title, unlockDate, creatorAddress);
      
      // Convert from base64 strings
      const encryptedBuffer = Uint8Array.from(atob(encryptedData.encryptedUrl), c => c.charCodeAt(0));
      const iv = Uint8Array.from(atob(encryptedData.iv), c => c.charCodeAt(0));
      
      // Decrypt the URL
      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        encryptedBuffer
      );
      
      // Convert back to string
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

  /**
   * Generate a deterministic hash for capsule identification
   */
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
