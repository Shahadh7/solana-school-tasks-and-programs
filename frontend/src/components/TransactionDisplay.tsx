'use client';

import { useEffect, useState } from 'react';
import { ExternalLink, Loader2 } from 'lucide-react';
import { getSolanaExplorerUrl } from '@/lib/utils';
import { solanaService } from '@/services/solana';
import { PublicKey } from '@solana/web3.js';

export interface TransactionDisplayProps {
  capsuleId: string;
  defaultSignature?: string | null;
}

export function TransactionDisplay({ capsuleId, defaultSignature }: TransactionDisplayProps) {
  const [signature, setSignature] = useState<string | null>(defaultSignature || null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (signature) return;

    const lookupTransaction = async () => {
      setLoading(true);
      try {
        const connection = solanaService.getConnection();
        const capsulePublicKey = new PublicKey(capsuleId);
        const signatures = await connection.getSignaturesForAddress(capsulePublicKey, { limit: 10 });
        if (signatures.length > 0) {
          const creationSignature = signatures[signatures.length - 1].signature;
          setSignature(creationSignature);
        }
      } catch {
      } finally {
        setLoading(false);
      }
    };

    void lookupTransaction();
  }, [capsuleId, signature]);

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
        <span className="text-sm text-gray-400">Looking up transaction...</span>
      </div>
    );
  }

  if (!signature) {
    return <div className="text-sm text-gray-400">No transaction signature available</div>;
  }

  return (
    <div className="flex items-center gap-2">
      <div className="font-mono text-sm font-bold text-white truncate">
        {signature.slice(0, 8)}...{signature.slice(-8)}
      </div>
      <a
        href={getSolanaExplorerUrl('tx', signature)}
        target="_blank"
        rel="noopener noreferrer"
        className="text-cyan-400 hover:text-cyan-300 transition-colors duration-200 flex items-center gap-1"
        title="View on Solana Explorer"
      >
        <ExternalLink className="h-4 w-4" />
      </a>
    </div>
  );
}

export default TransactionDisplay;

