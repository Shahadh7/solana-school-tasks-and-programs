'use client';

import React, { ReactNode, useMemo } from 'react';
import {
  ConnectionProvider,
  WalletProvider,
} from '@solana/wallet-adapter-react';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare';
import {
  WalletModalProvider,
} from '@solana/wallet-adapter-react-ui';
import { getRPCEndpoint, getNetwork, isUsingHelius } from '@/lib/rpc-config';

// Import wallet adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css';

interface WalletContextProviderProps {
  children: ReactNode;
}

export const WalletContextProvider: React.FC<WalletContextProviderProps> = ({
  children,
}) => {
  // Get optimized RPC endpoint (Helius or fallback)
  const endpoint = useMemo(() => getRPCEndpoint(), []);
  
  // Get network configuration
  const network = useMemo(() => getNetwork(), []);

  // Log RPC provider info for debugging
  useMemo(() => {
    if (isUsingHelius()) {
      console.log('🚀 Using Helius RPC for enhanced performance');
    } else {
      console.log('📡 Using default Solana RPC');
    }
    console.log('🌐 Network:', network);
    console.log('🔗 Endpoint:', endpoint);
  }, [endpoint, network]);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    [] // No dependencies needed for static wallet adapters
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}; 