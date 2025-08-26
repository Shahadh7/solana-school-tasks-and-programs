'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useEffect, useState } from 'react';
import Image from 'next/image';

export function Navigation() {
  const { connected, publicKey } = useWallet();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="border-b border-white/10 bg-black/20 backdrop-blur-xl sticky top-0 z-50">
      <div className="container mx-auto px-3 md:px-6 py-3 md:py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 md:space-x-3 min-w-0 flex-1">
            <div className="relative flex-shrink-0">
              <div className="w-8 h-8 md:w-12 md:h-12 bg-gradient-to-r from-amber-400 via-yellow-500 to-orange-400 rounded-lg md:rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/25 p-1">
                <Image 
                  src="/logo.svg" 
                  alt="DearFuture Web3 Logo" 
                  width={48}
                  height={48}
                  className="w-full h-full object-contain"
                  priority
                />
              </div>
              <div className="absolute -inset-1 bg-gradient-to-r from-amber-400 via-yellow-500 to-orange-400 rounded-lg md:rounded-xl blur opacity-30 animate-pulse"></div>
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg md:text-2xl font-bold crypto-text-gradient truncate">
                DearFuture Web3
              </h1>
              <p className="text-xs text-gray-400 font-mono hidden sm:block">Decentralized Memory Locker</p>
            </div>
          </div>

          <div className="flex items-center flex-shrink-0 ml-2">
            {!mounted ? (
              <div className="h-10 w-32 bg-gray-800/50 rounded-lg animate-pulse"></div>
            ) : connected && publicKey ? (
              <div className="flex items-center space-x-2 md:space-x-4">
                <div className="relative hidden lg:block">
                  <div className="absolute -inset-4 bg-gradient-to-r from-amber-400/20 to-yellow-500/20 rounded-2xl blur-lg"></div>
                  <div className="relative bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl px-3 md:px-4 py-2 md:py-3">
                    <p className="text-amber-400 font-mono text-xs md:text-sm">
                      {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}
                    </p>
                  </div>
                </div>
                <WalletMultiButton />
              </div>
            ) : (
              <WalletMultiButton />
            )}
          </div>
        </div>
      </div>
    </header>
  );
} 