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
import { getRPCEndpoint, getNetwork } from '@/lib/rpc-config';


import '@solana/wallet-adapter-react-ui/styles.css';

interface WalletContextProviderProps {
  children: ReactNode;
}

export const WalletContextProvider: React.FC<WalletContextProviderProps> = ({
  children,
}) => {
  
  const endpoint = useMemo(() => getRPCEndpoint(), []);
  
  
  const network = useMemo(() => getNetwork(), []);
  void network; // keep computed for potential UI toggles; suppress unused var warning



  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    [] 
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