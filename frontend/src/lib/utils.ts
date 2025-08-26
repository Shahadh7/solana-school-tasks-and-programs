import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { getNetwork } from "./rpc-config"
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generate Solscan URL with proper cluster parameter based on current network configuration
 */
export function getSolscanUrl(type: 'tx' | 'account' | 'token', identifier: string): string {
  const network = getNetwork()
  
  let cluster = ''
  switch (network) {
    case WalletAdapterNetwork.Devnet:
      cluster = '?cluster=devnet'
      break
    case WalletAdapterNetwork.Testnet:
      cluster = '?cluster=testnet'
      break
    case WalletAdapterNetwork.Mainnet:
      // Mainnet doesn't need cluster parameter
      cluster = ''
      break
    default:
      cluster = '?cluster=devnet'
  }
  
  return `https://solscan.io/${type}/${identifier}${cluster}`
}

/**
 * Generate Solana Explorer URL with proper cluster parameter based on current network configuration
 */
export function getSolanaExplorerUrl(type: 'tx' | 'address' | 'block', identifier: string): string {
  const network = getNetwork()
  
  let cluster = ''
  switch (network) {
    case WalletAdapterNetwork.Devnet:
      cluster = '?cluster=devnet'
      break
    case WalletAdapterNetwork.Testnet:
      cluster = '?cluster=testnet'
      break
    case WalletAdapterNetwork.Mainnet:
      // Mainnet doesn't need cluster parameter
      cluster = ''
      break
    default:
      cluster = '?cluster=devnet'
  }
  
  return `https://explorer.solana.com/${type}/${identifier}${cluster}`
}

export function formatAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

export function formatDatetime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
} 

export function getTimeUntil(date: Date): string {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  if (diff <= 0) return 'Unlocked';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}