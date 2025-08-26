import { Connection, clusterApiUrl } from '@solana/web3.js';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';

export interface RPCConfig {
  endpoint: string;
  commitment: 'confirmed' | 'finalized' | 'processed';
  confirmTransactionInitialTimeout?: number;
  httpHeaders?: Record<string, string>;
}

/**
 * Get optimized RPC configuration for Helius or fallback
 */
export function getRPCConfig(): RPCConfig {
  const network = WalletAdapterNetwork.Devnet;
  
  const customRPC = process.env.NEXT_PUBLIC_RPC_URL;
  
  if (customRPC) {
    return {
      endpoint: customRPC,
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: 60000, 
      httpHeaders: {
        'Content-Type': 'application/json',
      },
    };
  }

  return {
    endpoint: clusterApiUrl(network),
    commitment: 'confirmed',
    confirmTransactionInitialTimeout: 30000,
  };
}

/**
 * Create optimized connection for Helius
 */
export function createOptimizedConnection(): Connection {
  const config = getRPCConfig();
  const wsEndpoint = getWebSocketEndpoint();
  
  return new Connection(
    config.endpoint,
    {
      commitment: config.commitment,
      confirmTransactionInitialTimeout: config.confirmTransactionInitialTimeout,
      httpHeaders: config.httpHeaders,
      wsEndpoint: wsEndpoint,
    }
  );
}

/**
 * Get the proper WebSocket endpoint for Helius
 */
export function getWebSocketEndpoint(): string {
  const dedicatedWsUrl = process.env.NEXT_PUBLIC_HELIUS_WEBSOCKET_URL;
  if (dedicatedWsUrl) {
    return dedicatedWsUrl;
  }
  
  const httpEndpoint = getRPCEndpoint();
  
  if (isUsingHelius()) {
    const wsEndpoint = httpEndpoint.replace('https://', 'wss://');
    return wsEndpoint;
  }
  
  if (httpEndpoint.includes('devnet')) {
    return 'wss://api.devnet.solana.com';
  } else if (httpEndpoint.includes('testnet')) {
    return 'wss://api.testnet.solana.com';
  } else if (httpEndpoint.includes('mainnet')) {
    return 'wss://api.mainnet-beta.solana.com';
  }
  
  return httpEndpoint.replace('https://', 'wss://');
}

/**
 * Get the current RPC endpoint
 */
export function getRPCEndpoint(): string {
  return getRPCConfig().endpoint;
}

/**
 * Check if using Helius RPC
 */
export function isUsingHelius(): boolean {
  const endpoint = getRPCEndpoint();
  return endpoint.includes('helius-rpc.com');
}

/**
 * Check if using dedicated WebSocket URL
 */
export function isUsingDedicatedWebSocket(): boolean {
  return !!process.env.NEXT_PUBLIC_HELIUS_WEBSOCKET_URL;
}

/**
 * Get WebSocket configuration info for debugging
 */
export function getWebSocketInfo(): {
  endpoint: string;
  isDedicated: boolean;
  isHelius: boolean;
  httpEndpoint: string;
} {
  const wsEndpoint = getWebSocketEndpoint();
  const httpEndpoint = getRPCEndpoint();
  
  return {
    endpoint: wsEndpoint,
    isDedicated: isUsingDedicatedWebSocket(),
    isHelius: isUsingHelius(),
    httpEndpoint: httpEndpoint
  };
}

/**
 * Get network type from environment or default
 */
export function getNetwork(): WalletAdapterNetwork {
  const networkEnv = process.env.NEXT_PUBLIC_NETWORK?.toLowerCase();
  
  switch (networkEnv) {
    case 'mainnet':
    case 'mainnet-beta':
      return WalletAdapterNetwork.Mainnet;
    case 'testnet':
      return WalletAdapterNetwork.Testnet;
    case 'devnet':
    default:
      return WalletAdapterNetwork.Devnet;
  }
} 