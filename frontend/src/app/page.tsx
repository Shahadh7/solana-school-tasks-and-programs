'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { LandingPage } from '@/components/LandingPage';
import { TabNavigation } from '@/components/TabNavigation';

export default function Home() {
  const { connected } = useWallet();

  if (!connected) {
    return <LandingPage />;
  }

  return <TabNavigation />;
} 