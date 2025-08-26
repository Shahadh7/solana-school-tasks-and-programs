#!/usr/bin/env ts-node

/**
 * Generate or extract a Solana keypair as JSON
 * 
 * Usage:
 *   npm run generate-keypair
 *   npx ts-node scripts/generate-keypair.ts
 * 
 * Options:
 *   --from-secret <base58_secret>  Convert base58 secret key to JSON
 *   --from-file <path>            Convert existing keypair file to JSON
 *   --generate                    Generate new random keypair (default)
 */

import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { generateSigner } from '@metaplex-foundation/umi';
import { Keypair } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';
import bs58 from 'bs58';
import { fileURLToPath } from 'url';

const RPC_ENDPOINT = process.env.NEXT_PUBLIC_RPC_URL || 'https:

function printUsage() {
  console.log(`
🔑 Solana Keypair Generator & Converter

Usage:
  npm run generate-keypair [options]

Options:
  --generate                     Generate new random keypair (default)
  --from-secret <base58_secret>  Convert base58 secret key to JSON array
  --from-file <file_path>        Convert existing keypair file to JSON array
  --help                         Show this help message

Examples:
  npm run generate-keypair
  npm run generate-keypair -- --from-secret 5J7...abc
  npm run generate-keypair -- --from-file ~/.config/solana/id.json

Output:
  - Displays public key
  - Shows JSON array format for secret key
  - Saves to admin-keypair.json (for --generate option)
`);
}

function generateNewKeypair() {
  console.log('🔄 Generating new keypair...\n');
  
  const umi = createUmi(RPC_ENDPOINT);
  const signer = generateSigner(umi);
  
  const secretKeyArray = Array.from(signer.secretKey);
  const publicKey = signer.publicKey.toString();
  
  const outputPath = path.join(__dirname, 'admin-keypair.json');
  fs.writeFileSync(outputPath, JSON.stringify(secretKeyArray, null, 2));
  
  console.log('✅ New keypair generated successfully!');
  console.log('📍 Public Key:', publicKey);
  console.log('💾 Saved to:', outputPath);
  console.log('🔢 Secret Key JSON Array:');
  console.log(JSON.stringify(secretKeyArray));
  console.log('\n⚠️  SECURITY WARNING:');
  console.log('   - Keep your secret key secure and never share it');
  console.log('   - Fund this wallet with SOL before creating Merkle trees');
  console.log('   - Required: ~0.1 SOL for tree creation on devnet');
  
  return { publicKey, secretKeyArray };
}

function convertFromSecret(base58Secret: string) {
  try {
    console.log('🔄 Converting base58 secret key to JSON array...\n');
    
    const secretKeyBytes = bs58.decode(base58Secret);
    const secretKeyArray = Array.from(secretKeyBytes);
    
    const keypair = Keypair.fromSecretKey(secretKeyBytes);
    const publicKey = keypair.publicKey.toString();
    
    console.log('✅ Conversion successful!');
    console.log('📍 Public Key:', publicKey);
    console.log('🔢 Secret Key JSON Array:');
    console.log(JSON.stringify(secretKeyArray));
    
    return { publicKey, secretKeyArray };
  } catch (error) {
    console.error('❌ Error converting secret key:', error);
    console.log('💡 Make sure your base58 secret key is valid');
    process.exit(1);
  }
}

function convertFromFile(filePath: string) {
  try {
    console.log(`🔄 Converting keypair file: ${filePath}\n`);
    
    if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${filePath}`);
      process.exit(1);
    }
    
    const fileContent = fs.readFileSync(filePath, 'utf8');
    let secretKeyArray: number[];
    
    try {
      secretKeyArray = JSON.parse(fileContent);
      if (!Array.isArray(secretKeyArray) || secretKeyArray.length !== 64) {
        throw new Error('Invalid JSON array format');
      }
    } catch (jsonError) {
      try {
        const base58Key = fileContent.trim();
        const secretKeyBytes = bs58.decode(base58Key);
        secretKeyArray = Array.from(secretKeyBytes);
      } catch (base58Error) {
        throw new Error('File is neither valid JSON array nor base58 string');
      }
    }
    
    const keypair = Keypair.fromSecretKey(new Uint8Array(secretKeyArray));
    const publicKey = keypair.publicKey.toString();
    
    console.log('✅ Conversion successful!');
    console.log('📍 Public Key:', publicKey);
    console.log('🔢 Secret Key JSON Array:');
    console.log(JSON.stringify(secretKeyArray));
    
    return { publicKey, secretKeyArray };
  } catch (error) {
    console.error('❌ Error reading keypair file:', error);
    console.log('💡 Make sure the file contains a valid keypair (JSON array or base58 string)');
    process.exit(1);
  }
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help')) {
    printUsage();
    return;
  }
  
  if (args.includes('--from-secret')) {
    const secretIndex = args.indexOf('--from-secret');
    const secret = args[secretIndex + 1];
    
    if (!secret) {
      console.error('❌ Error: --from-secret requires a base58 secret key');
      printUsage();
      process.exit(1);
    }
    
    convertFromSecret(secret);
    return;
  }
  
  if (args.includes('--from-file')) {
    const fileIndex = args.indexOf('--from-file');
    const filePath = args[fileIndex + 1];
    
    if (!filePath) {
      console.error('❌ Error: --from-file requires a file path');
      printUsage();
      process.exit(1);
    }
    
    convertFromFile(filePath);
    return;
  }
  
  generateNewKeypair();
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (import.meta.url === `file:
  main();
}

export { generateNewKeypair, convertFromSecret, convertFromFile };
