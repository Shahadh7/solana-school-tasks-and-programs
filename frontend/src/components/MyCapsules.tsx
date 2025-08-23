'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Calendar, Lock, Unlock, Share2, Eye, Loader2, ArrowRightLeft, ExternalLink, Maximize2, X, Edit3 } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import bs58 from 'bs58';
import { useAppStore, Capsule } from '@/stores/appStore';
import { formatDate, formatDatetime } from '@/lib/utils';
import { solanaService } from '@/services/solana';
import { encryptionService } from '@/services/encryption';
import { nftService, CNFTMintOptions } from '@/services/nft';
import { cnftService } from '@/services/cnft';
import { MintTransactionStatus } from '@/services/helius-das';
import { PublicKey } from '@solana/web3.js';
import { CapsuleUpdateModal } from '@/components/CapsuleUpdateModal';
import { Transaction, VersionedTransaction } from '@solana/web3.js';

export function MyCapsules() {
  const { connected, publicKey, signTransaction, signMessage } = useWallet();
  const { userCapsules, setUserCapsules, updateCapsule } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [selectedCapsule, setSelectedCapsule] = useState<Capsule | null>(null);
  const [unlockingCapsule, setUnlockingCapsule] = useState<string | null>(null);
  const [mintingCapsule, setMintingCapsule] = useState<string | null>(null);
  const [mintAsCompressed] = useState(true);
  const [mintProgress, setMintProgress] = useState(0);
  const [mintStatus, setMintStatus] = useState<string>('');
  const [showMintDialog, setShowMintDialog] = useState<string | null>(null);
  const [showTransferDialog, setShowTransferDialog] = useState<string | null>(null);
  const [transferAddress, setTransferAddress] = useState('');
  const [transferring, setTransferring] = useState<string | null>(null);
  const [transferCNFT, setTransferCNFT] = useState(false);
  const [showNFTViewer, setShowNFTViewer] = useState<string | null>(null);
  const [showFullscreenImage, setShowFullscreenImage] = useState<string | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState<string | null>(null);

  // Utility function to convert signature to base58 format
  const convertSignatureToBase58 = (signature: unknown): string => {
    try {
      if (typeof signature === 'string') {
        // Already a string, check if it looks like base58 or byte array string
        if (signature.includes(',')) {
          // It's a comma-separated byte array string
          const bytes = signature.split(',').map(num => parseInt(num.trim(), 10));
          return bs58.encode(new Uint8Array(bytes));
        }
        return signature; // Already base58
      } else if (Array.isArray(signature)) {
        // It's a byte array
        return bs58.encode(new Uint8Array(signature));
      } else if (signature instanceof Uint8Array) {
        // It's already a Uint8Array
        return bs58.encode(signature);
      }
      return String(signature);
    } catch (error) {
      return String(signature);
    }
  };

  // Create a type-safe wallet wrapper for solanaService calls
  const createWalletWrapper = () => {
    if (!publicKey || !signTransaction || !signMessage) return null;
    
    return {
      publicKey,
      signTransaction: async <T extends Transaction | VersionedTransaction>(transaction: T): Promise<T> => {
        return signTransaction(transaction);
      },
      signMessage
    };
  };

  // Helper function to check if a capsule has been minted as an NFT
  const hasMintedNFT = (capsule: Capsule): boolean => {
    // Check multiple indicators for NFT status
    return !!(
      capsule.mint || 
      capsule.metadata?.mintCreator || 
      capsule.metadata?.assetId ||
      capsule.metadata?.transferredAt ||
      capsule.metadata?.nftMinted
    );
  };

  useEffect(() => {
    if (connected && publicKey) {
      loadUserCapsules();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, publicKey]);

  const loadUserCapsules = async () => {
    if (!publicKey || !signTransaction || !signMessage) return;
    
    setLoading(true);
    try {
      // Create a type-safe wallet wrapper
      const walletWrapper = createWalletWrapper();
      if (!walletWrapper) return;

      // Fetch real capsules from Solana
      const solanaCapsules = await solanaService.getWalletCapsules(walletWrapper);

      // Transform Solana data to our app format
      const transformedCapsules: Capsule[] = await Promise.all(solanaCapsules.map(async (solanaCapsule: Record<string, unknown>) => {
        let contentData;
        try {
          contentData = JSON.parse(solanaCapsule.content as string);
        } catch {
          contentData = { description: solanaCapsule.content };
        }

        let imageUrl = '';
        
        // If capsule is already unlocked, decrypt the image URL
        if (solanaCapsule.isUnlocked && contentData.encryptedImageUrl) {
          try {
            const decryptedImageUrl = await encryptionService.decryptPinataUrl(
              {
                encryptedUrl: contentData.encryptedImageUrl,
                iv: contentData.encryptedImageIv
              },
              publicKey!,
              solanaCapsule.title as string,
              (solanaCapsule.unlockDate as any).toNumber(),
              publicKey!.toString() // Use current wallet key, not creator from blockchain
            );
            imageUrl = decryptedImageUrl.decryptedUrl;
          } catch {
            // Try alternative decryption methods
            try {
              // Try with different key derivation parameters
              const decryptedImageUrl = await encryptionService.decryptPinataUrl(
                {
                  encryptedUrl: contentData.encryptedImageUrl,
                  iv: contentData.encryptedImageIv
                },
                publicKey!,
                (solanaCapsule.title as string).trim(), // Try trimmed title
                (solanaCapsule.unlockDate as any).toNumber(),
                publicKey!.toString() // Use current wallet key
              );
              imageUrl = decryptedImageUrl.decryptedUrl;
            } catch {
              imageUrl = '';
            }
          }
        } else if (!solanaCapsule.isUnlocked && contentData.encryptedImageUrl) {
          // Check if capsule is ready to be unlocked (time has passed)
          const currentTime = Math.floor(Date.now() / 1000);
          if ((solanaCapsule.unlockDate as any).toNumber() <= currentTime) {
            // The unlock button will be shown to the user
          }
        }

        const capsule = {
          id: solanaCapsule.address as string,
          mint: (solanaCapsule.mint as any)?.toString() || '',
          name: solanaCapsule.title as string,
          description: contentData.description || 'No description',
          imageUrl: imageUrl,
          unlockDate: new Date((solanaCapsule.unlockDate as any).toNumber() * 1000),
          createdAt: new Date((solanaCapsule.createdAt as any).toNumber() * 1000),
          owner: (solanaCapsule.owner as any)?.toString() || (solanaCapsule.creator as any).toString(), // Use owner if available, fallback to creator
          isLocked: !solanaCapsule.isUnlocked,
          metadata: {
            attributes: [
              { trait_type: 'Unlock Date', value: new Date((solanaCapsule.unlockDate as any).toNumber() * 1000).toISOString() },
              { trait_type: 'Status', value: solanaCapsule.isUnlocked ? 'Unlocked' : 'Locked' },
              { trait_type: 'Creator', value: (solanaCapsule.creator as any).toString() }
            ],
            creator: (solanaCapsule.creator as any).toString(),
            transferredAt: (solanaCapsule.transferredAt as any) ? (solanaCapsule.transferredAt as any).toNumber() : null,
            mintCreator: (solanaCapsule.mintCreator as any)?.toString() || null
          }
        };

        return capsule;
      }));

      // Check NFT minting status from on-chain data instead of localStorage
      const capsulesWithNFTStatus = transformedCapsules.map(capsule => {
        // Use the helper function to check multiple indicators for NFT status
        const nftMinted = hasMintedNFT(capsule);
        
        return {
          ...capsule,
          metadata: {
            ...capsule.metadata,
            nftMinted,
            mintSignature: capsule.mint || capsule.metadata?.mintCreator || undefined
          }
        };
      });
      
      setUserCapsules(capsulesWithNFTStatus);
    } catch {
      toast.error('Failed to load capsules. Please refresh and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleViewCapsule = (capsule: Capsule) => {
    setSelectedCapsule(capsule);
  };

  const handleCloseCapsule = () => {
    setSelectedCapsule(null);
  };

  const handleShareCapsule = (capsule: Capsule) => {

    navigator.clipboard.writeText(`Check out my memory capsule: ${capsule.name}`);
    alert('Share link copied to clipboard!');
  };

  // Removed unused function - transfer functionality is handled by handleTransferNFT

  const handleMintNFT = async (capsule: Capsule) => {
    if (!publicKey || !signTransaction || !signMessage) {
      toast.error('Please connect your wallet first');
      return;
    }

    // Check if capsule is unlocked
    const isUnlocked = new Date() >= capsule.unlockDate;
    if (!isUnlocked) {
      alert('This capsule cannot be minted as NFT until it is unlocked!');
      return;
    }

    setMintingCapsule(capsule.id);
    setMintProgress(0);
    setMintStatus('Starting mint process...');

    try {
      // Create a fake image file for minting (in real app, you'd have the original image)
      const response = await fetch(capsule.imageUrl);
      const blob = await response.blob();
      const imageFile = new File([blob], `${capsule.name}.jpg`, { type: 'image/jpeg' });

      const mintOptions: CNFTMintOptions = {
        useCompressedNFT: mintAsCompressed,
      };

      // Monitor transaction with WebSocket
      const mintResult = await nftService.mintCapsule(
        {
          publicKey,
          signTransaction: signTransaction!,
          signMessage: signMessage!
        },
        {
          name: capsule.name,
          description: capsule.description,
          image: imageFile,
          unlockDate: capsule.unlockDate,
          attributes: capsule.metadata?.attributes || []
        },
        (step, progress) => {
          setMintProgress(progress);
          setMintStatus(step);
        },
        mintOptions
      );

      // Set up real-time transaction monitoring with toast notifications
      if (mintAsCompressed) {
        toast.promise(
          cnftService.monitorMintTransaction(mintResult.signature, (status: MintTransactionStatus) => {
            
            if (status.status === 'confirmed') {
              setMintStatus('✅ cNFT minted successfully!');
              setMintProgress(100);
              
              // Update capsule with NFT info
              const updatedCapsule = {
                ...capsule,
                mint: mintResult.signature, // Use signature as the mint identifier
                metadata: {
                  ...capsule.metadata,
                  nftMinted: true,
                  mintSignature: mintResult.signature
                }
              };
              
              updateCapsule(capsule.id, updatedCapsule);
              
              // Force reload capsules to ensure UI updates and get fresh on-chain data
              setTimeout(() => {
                loadUserCapsules();
              }, 1000);
            } else if (status.status === 'failed') {
              setMintStatus(`❌ Minting failed: ${status.error}`);
              throw new Error(status.error || 'Minting failed');
            } else if (status.status === 'pending') {
              setMintStatus('⏳ Transaction pending confirmation...');
            }
          }),
          {
            loading: '⏳ Confirming cNFT transaction...',
            success: '🎉 cNFT minted and confirmed successfully!',
            error: (err) => `❌ Minting failed: ${err.message}`,
          }
        );
      } else {
        setMintStatus('✅ NFT minted successfully!');
        setMintProgress(100);
        toast.success('🎉 NFT minted successfully!');
      }



      // Immediately update the UI to show NFT as minted (optimistic update)
      if (mintResult.signature) {
        const updatedCapsuleData = {
          ...capsule,
          mint: mintResult.signature, // Use signature as the mint identifier
          metadata: {
            ...capsule.metadata,
            nftMinted: true,
            mintSignature: mintResult.signature
          }
        };
        
        updateCapsule(capsule.id, updatedCapsuleData);
        
        // Force reload capsules to ensure UI updates and get fresh on-chain data
        setTimeout(() => {
          loadUserCapsules();
        }, 1000);
        

      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to mint NFT: ${errorMessage}`);
      setMintStatus(`❌ Error: ${errorMessage}`);
      setMintProgress(0);
      toast.error(`❌ Minting failed: ${errorMessage}`);
    } finally {
      setTimeout(() => {
        setMintingCapsule(null);
        setMintProgress(0);
        setMintStatus('');
        setShowMintDialog(null);
      }, 3000); // Clear after 3 seconds
    }
  };

  // Helper function to check if capsule has an associated CNFT
  const hasAssociatedCNFT = (capsule: Capsule): boolean => {
    return !!(capsule.mint && capsule.metadata?.assetId);
  };

  // Helper function to check if current user is the capsule owner
  const isCurrentOwner = (capsule: Capsule): boolean => {
    return capsule.owner === publicKey?.toString();
  };

  // Helper function to get transfer button text and state
  const getTransferButtonInfo = (capsule: Capsule): { text: string; canTransfer: boolean; transferType: 'capsule' | 'cnft' | 'both' | 'none' | 'cnft-only' } => {
    const isOwner = isCurrentOwner(capsule);
    const hasCNFT = hasAssociatedCNFT(capsule);
    
    if (!isOwner) {
      // Check if this is a transferred capsule with CNFT
      if (hasCNFT) {
        return { text: 'Transfer cNFT', canTransfer: true, transferType: 'cnft-only' };
      }
      return { text: 'Not Owner', canTransfer: false, transferType: 'none' };
    }
    
    if (hasCNFT) {
      return { text: 'Transfer Capsule & cNFT', canTransfer: true, transferType: 'both' };
    }
    
    return { text: 'Transfer Capsule', canTransfer: true, transferType: 'capsule' };
  };

  // Helper function to get transfer button text for display
  const getTransferButtonText = (capsule: Capsule): string => {
    const { text } = getTransferButtonInfo(capsule);
    return text;
  };

  const handleTransferNFT = async (capsule: Capsule) => {
    if (!publicKey || !signTransaction || !signMessage) return;

    // Check if this is a CNFT-only transfer (transferred capsule)
    const isTransferredCapsule = !isCurrentOwner(capsule) && hasAssociatedCNFT(capsule);
    
    if (isTransferredCapsule) {
      // Handle CNFT-only transfer
      await handleCNFTOnlyTransfer(capsule);
      return;
    }

    // Validate that the current user is the capsule owner
    if (capsule.owner !== publicKey.toString()) {
      toast.error('Only the capsule owner can transfer this capsule');
      return;
    }

    const cleanAddress = transferAddress.trim();
    if (!cleanAddress) {
      toast.error('Please enter a valid recipient address');
      return;
    }

    try {
      new PublicKey(cleanAddress);
    } catch {
      toast.error('Please enter a valid Solana wallet address');
      return;
    }

    setTransferring(capsule.id);

    try {
      toast.loading('Transferring capsule...', { id: 'transfer' });

      console.log('Starting capsule transfer:', {
        capsuleId: capsule.id,
        fromAddress: publicKey.toString(),
        toAddress: cleanAddress,
        transferType: transferCNFT ? 'capsule-and-cnft' : 'capsule-only'
      });

      // Transfer the capsule using the Solana service
      const transferResult = await solanaService.transferCapsule(
        createWalletWrapper()!,
        capsule.id,
        cleanAddress
      );

      // If CNFT transfer is requested and the capsule has a mint address
      if (transferCNFT && capsule.mint && capsule.metadata?.assetId) {
        try {
          toast.loading('Transferring CNFT...', { id: 'cnft-transfer' });
          
          // Initialize CNFT service with the wallet
          await cnftService.initialize({
            publicKey,
            signTransaction: signTransaction!,
            signMessage: signMessage!
          });

          // Transfer the CNFT
          const cnftTransferSignature = await cnftService.transferCNFT({
            assetId: capsule.metadata.assetId,
            newOwner: cleanAddress, // Pass as string, CNFT service will convert
          });

          console.log('CNFT transfer successful:', cnftTransferSignature);
          toast.success('🎉 CNFT transferred successfully!', { id: 'cnft-transfer' });
        } catch (cnftError) {
          console.error('CNFT transfer failed:', cnftError);
          toast.error(`CNFT transfer failed: ${cnftError instanceof Error ? cnftError.message : 'Unknown error'}`, { id: 'cnft-transfer' });
          // Note: Capsule transfer was successful, but CNFT transfer failed
        }
      } else if (transferCNFT && (!capsule.mint || !capsule.metadata?.assetId)) {
        // User requested CNFT transfer but capsule doesn't have associated CNFT
        toast.error('⚠️ CNFT transfer requested but this capsule has no associated compressed NFT', { id: 'cnft-transfer' });
      }

      toast.success('🎉 Capsule transferred successfully!', { id: 'transfer' });

      // Remove the capsule from current user's list since it's been transferred
      const updatedCapsules = userCapsules.filter((c: Capsule) => c.id !== capsule.id);
      setUserCapsules(updatedCapsules);
      
      // Reload capsules to ensure UI is up to date
      setTimeout(() => {
        loadUserCapsules();
      }, 1000);

    } catch (error) {
      console.error('Transfer error details:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Transfer failed: ${errorMessage}`, { id: 'transfer' });
    } finally {
      setTransferring(null);
      setShowTransferDialog(null);
      setTransferAddress('');
      setTransferCNFT(false);
    }
  };

  const handleCNFTOnlyTransfer = async (capsule: Capsule) => {
    if (!publicKey || !signTransaction || !signMessage) return;

    const cleanAddress = transferAddress.trim();
    if (!cleanAddress) {
      toast.error('Please enter a valid recipient address');
      return;
    }

    try {
      new PublicKey(cleanAddress);
    } catch {
      toast.error('Please enter a valid Solana wallet address');
      return;
    }

    setTransferring(capsule.id);

    try {
      toast.loading('Transferring CNFT...', { id: 'cnft-transfer' });

      console.log('Starting CNFT-only transfer:', {
        capsuleId: capsule.id,
        fromAddress: publicKey.toString(),
        toAddress: cleanAddress,
      });

      // Initialize CNFT service with the wallet
      await cnftService.initialize({
        publicKey,
        signTransaction: signTransaction!,
        signMessage: signMessage!
      });

      // Transfer the CNFT
      const cnftTransferSignature = await cnftService.transferCNFT({
        assetId: capsule.metadata.assetId!,
        newOwner: cleanAddress, // Pass as string, CNFT service will convert
      });

      console.log('CNFT transfer successful:', cnftTransferSignature);
      toast.success('🎉 CNFT transferred successfully!', { id: 'cnft-transfer' });

      // Note: Capsule ownership remains unchanged for CNFT-only transfers
      // Just close the dialog and show success message

    } catch (error) {
      console.error('CNFT-only transfer error details:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`CNFT-only transfer failed: ${errorMessage}`, { id: 'cnft-transfer' });
    } finally {
      setTransferring(null);
      setShowTransferDialog(null);
      setTransferAddress('');
      setTransferCNFT(false);
    }
  };

  const handleUnlockCapsule = async (capsule: Capsule) => {
    if (!publicKey || !signTransaction || !signMessage) return;

    setUnlockingCapsule(capsule.id);
    try {
      if (capsule.isLocked) {
        // Unlock the capsule on Solana
        await solanaService.unlockCapsule(
          createWalletWrapper()!,
          capsule.id
        );
      }

      // Get the encrypted data from the capsule content
      // We need to fetch the capsule data again to get the encrypted content
      const walletWrapper = createWalletWrapper();
      if (!walletWrapper) return;
      
      const solanaCapsules = await solanaService.getWalletCapsules(walletWrapper);
      
      const currentCapsule = solanaCapsules.find((c: Record<string, unknown>) => c.address as string === capsule.id);
      if (!currentCapsule) {
        throw new Error('Capsule not found');
      }
      
      let contentData;
      try {
        contentData = JSON.parse(currentCapsule.content as string);
      } catch {
        throw new Error('Failed to parse capsule content');
      }
      

      
      const decryptedImageUrl = await encryptionService.decryptPinataUrl(
        {
          encryptedUrl: contentData.encryptedImageUrl,
          iv: contentData.encryptedImageIv
        },
        publicKey,
        capsule.name,
        Math.floor(capsule.unlockDate.getTime() / 1000),
        publicKey.toString() // Use current wallet key
      );



      // Update the capsule in our store
      updateCapsule(capsule.id, {
        isLocked: false,
        imageUrl: decryptedImageUrl.decryptedUrl
      });

      // Reload capsules to get fresh data
      await loadUserCapsules();

    } catch {
      toast.error('Failed to unlock capsule. Please try again.');
    } finally {
      setUnlockingCapsule(null);
    }
  };

  const isUnlocked = (unlockDate: Date) => {
    return new Date() >= unlockDate;
  };

  const getTimeUntilUnlock = (unlockDate: Date) => {
    const now = new Date();
    const diff = unlockDate.getTime() - now.getTime();
    
    if (diff <= 0) return 'Unlocked';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  if (!connected) {
    return (
      <Card className="max-w-2xl mx-auto mx-4 md:mx-auto border-amber-400/30 bg-gradient-to-br from-black/40 via-black/20 to-amber-950/20 backdrop-blur-xl">
        <CardHeader className="text-center p-4 md:p-6">
          <CardTitle className="text-lg md:text-xl text-white">Connect Your Wallet</CardTitle>
          <CardDescription className="text-sm md:text-base text-gray-300">
            Please connect your wallet to view your memory capsules
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="max-w-2xl mx-auto mx-4 md:mx-auto border-amber-400/30 bg-gradient-to-br from-black/40 via-black/20 to-amber-950/20 backdrop-blur-xl">
        <CardHeader className="text-center p-4 md:p-6">
          <CardTitle className="text-lg md:text-xl text-white">Loading Your Capsules...</CardTitle>
          <CardDescription className="text-sm md:text-base text-gray-300">
            Fetching your memory capsules from the blockchain
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center p-6">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-amber-400" />
        </CardContent>
      </Card>
    );
  }

  if (userCapsules.length === 0) {
    return (
      <Card className="max-w-2xl mx-auto mx-4 md:mx-auto border-amber-400/30 bg-gradient-to-br from-black/40 via-black/20 to-amber-950/20 backdrop-blur-xl">
        <CardHeader className="text-center p-4 md:p-6">
          <CardTitle className="text-lg md:text-xl text-white">No Capsules Found</CardTitle>
          <CardDescription className="text-sm md:text-base text-gray-300">
            You haven&apos;t created any memory capsules yet. Create your first one to get started!
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 px-4 md:px-0">
      <div className="text-center">
        <h2 className="text-4xl md:text-5xl font-black mb-6 crypto-text-gradient">My Memory Capsules</h2>
        <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
          Manage and unlock your time-locked memories
        </p>
        <Button
          onClick={loadUserCapsules}
          disabled={loading}
          variant="outline"
          size="sm"
          className="mt-6 border-amber-400/30 text-amber-300 hover:bg-amber-400/10 hover:border-amber-400/60"
        >
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Refresh Capsules
        </Button>
      </div>

      <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
        {userCapsules.map((capsule) => (
          <div
            key={capsule.id}
            className="group relative bg-gradient-to-br from-black/40 via-black/20 to-amber-950/20 rounded-3xl shadow-2xl hover:shadow-3xl transition-all duration-700 transform hover:-translate-y-3 border border-amber-400/30 backdrop-blur-xl overflow-hidden hover:border-amber-400/60"
          >
            {/* Status Badge */}
            <div className="absolute top-4 right-4 z-10">
              {capsule.isLocked ? (
                isUnlocked(capsule.unlockDate) ? (
                  <div className="flex items-center gap-1 bg-gradient-to-r from-amber-400 to-orange-500 text-black px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg">
                    <Unlock className="h-3 w-3" />
                    Ready
                  </div>
                ) : (
                  <div className="flex items-center gap-1 bg-gradient-to-r from-gray-500 to-gray-700 text-white px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg">
                    <Lock className="h-3 w-3" />
                    Locked
                  </div>
                )
              ) : (
                <div className="flex items-center gap-1 bg-gradient-to-r from-emerald-400 to-green-500 text-black px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg">
                  <Unlock className="h-3 w-3" />
                  Unlocked
                </div>
              )}
            </div>

            {/* NFT Badge */}
            {capsule.metadata?.nftMinted && (
              <div className="absolute top-4 left-4 z-10">
                <div className="flex items-center gap-1 bg-gradient-to-r from-purple-500 to-violet-600 text-white px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg">
                  <Lock className="h-3 w-3" />
                  cNFT
                </div>
              </div>
            )}

            {/* Gradient Overlay Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-amber-400/15 via-yellow-500/10 to-orange-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
            <div className="absolute top-4 right-4 w-24 h-24 bg-gradient-to-br from-amber-400/20 to-yellow-500/20 rounded-full blur-2xl"></div>

            {/* Image Section */}
            <div className="relative h-64 overflow-hidden bg-black/30">
              {capsule.imageUrl && !capsule.isLocked ? (
                <div className="relative h-full">
                  <img
                    src={capsule.imageUrl}
                    alt={capsule.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
              ) : (
                <div className="h-full flex items-center justify-center bg-gray-800/50">
                  <div className="text-center p-6">
                    {capsule.isLocked ? (
                      isUnlocked(capsule.unlockDate) ? (
                        <div className="space-y-3">
                          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                            <Unlock className="h-8 w-8 text-white" />
                          </div>
                          <p className="text-sm font-semibold text-amber-600">Ready to Unlock!</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center shadow-lg">
                            <Lock className="h-8 w-8 text-white" />
                          </div>
                          <p className="text-sm font-medium text-gray-500">Time Locked</p>
                        </div>
                      )
                    ) : (
                      <div className="space-y-3">
                        {capsule.imageUrl ? (
                          <div>
                            <img
                              src={capsule.imageUrl}
                              alt={capsule.name}
                              className="mx-auto max-h-32 rounded-lg shadow-md"
                            />
                            <p className="text-sm font-medium text-green-600 mt-2">Memory Revealed</p>
                          </div>
                        ) : (
                          <div>
                            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                              <Unlock className="h-8 w-8 text-white" />
                            </div>
                            <p className="text-sm font-medium text-green-600 mt-2">Unlocked</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Content Section */}
            <div className="relative z-10 p-8 space-y-6">
              {/* Title and Description */}
              <div className="space-y-3">
                <h3 className="font-black text-2xl text-white truncate group-hover:text-amber-400 transition-colors duration-300">
                  {capsule.name}
                </h3>
                <p className="text-base text-gray-300 line-clamp-2 leading-relaxed">
                  {capsule.description}
                </p>
              </div>

              {/* Metadata */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <div className="flex items-center gap-2 bg-white/5 px-4 py-2.5 rounded-xl border border-amber-400/20">
                    <Calendar className="h-4 w-4 text-amber-300" />
                    <span className="font-semibold text-white">
                      {capsule.isLocked ? 'Unlocks' : 'Unlocked'}: {formatDate(capsule.unlockDate)}
                    </span>
                  </div>
                </div>

                {capsule.isLocked && (
                  <div className="flex items-center gap-3 text-sm">
                    <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border ${
                      isUnlocked(capsule.unlockDate)
                        ? 'bg-amber-400/20 text-amber-100 border-amber-400/40'
                        : 'bg-gray-600/20 text-gray-300 border-gray-500/30'
                    }`}>
                      <Clock className="h-4 w-4" />
                      <span className="font-semibold">
                        {isUnlocked(capsule.unlockDate) ? 'Ready to Unlock!' : getTimeUntilUnlock(capsule.unlockDate)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleViewCapsule(capsule)}
                  className="flex-1 min-w-[120px] bg-white/5 hover:bg-amber-400/10 border-amber-400/30 hover:border-amber-400/60 text-white hover:text-amber-100 transition-all duration-300 px-4 py-2.5 rounded-xl"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  <span className="font-semibold">View</span>
                </Button>

                {/* Update Button - Show for all locked capsules */}
                {capsule.isLocked && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowUpdateModal(capsule.id)}
                    className="flex-1 min-w-[120px] bg-white/5 hover:bg-blue-400/10 text-white hover:text-blue-200 border-blue-400/30 hover:border-blue-400/60 transition-all duration-300 px-4 py-2.5 rounded-xl"
                  >
                    <Edit3 className="h-4 w-4 mr-2" />
                    <span className="font-semibold">Update</span>
                  </Button>
                )}

                {capsule.isLocked && isUnlocked(capsule.unlockDate) && (
                  <Button
                    size="sm"
                    onClick={() => handleUnlockCapsule(capsule)}
                    disabled={unlockingCapsule === capsule.id}
                    className="flex-1 min-w-[120px] bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 px-4 py-2.5 rounded-xl"
                  >
                    {unlockingCapsule === capsule.id ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Unlock className="h-4 w-4 mr-2" />
                    )}
                    <span className="font-semibold">Unlock</span>
                  </Button>
                )}
                
                {!capsule.isLocked && !capsule.imageUrl && isUnlocked(capsule.unlockDate) && (
                  <Button
                    size="sm"
                    onClick={() => handleUnlockCapsule(capsule)}
                    disabled={unlockingCapsule === capsule.id}
                    className="flex-1 min-w-[120px] bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 px-4 py-2.5 rounded-xl"
                  >
                    {unlockingCapsule === capsule.id ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Unlock className="h-4 w-4 mr-2" />
                    )}
                    <span className="font-semibold">Re-unlock</span>
                  </Button>
                )}

                {!capsule.isLocked && (
                  <>
                    {/* Show Mint NFT button only if NFT is not minted */}
                    {!capsule.metadata?.nftMinted && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowMintDialog(capsule.id)}
                        className="flex-1 min-w-[120px] bg-white/5 hover:bg-purple-400/10 text-white hover:text-purple-200 border-purple-400/30 hover:border-purple-400/60 transition-all duration-300 px-4 py-2.5 rounded-xl"
                        disabled={mintingCapsule === capsule.id}
                      >
                        {mintingCapsule === capsule.id ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Lock className="h-4 w-4 mr-2" />
                        )}
                        <span className="font-semibold">Mint cNFT</span>
                      </Button>
                    )}



                    {/* Transfer Button - Only show for capsule owners */}
                    {isCurrentOwner(capsule) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const { transferType } = getTransferButtonInfo(capsule);
                          setShowTransferDialog(capsule.id);
                          setTransferCNFT(transferType === 'both'); // Enable CNFT transfer only if both are available
                        }}
                        className="flex-1 min-w-[120px] bg-white/5 hover:bg-blue-400/10 text-white hover:text-blue-200 border-blue-400/30 hover:border-blue-400/60 transition-all duration-300 px-4 py-2.5 rounded-xl"
                        disabled={transferring === capsule.id || !getTransferButtonInfo(capsule).canTransfer}
                      >
                        <ArrowRightLeft className="mr-2 h-4 w-4" />
                        {getTransferButtonText(capsule)}
                      </Button>
                    )}

                    {/* CNFT Transfer Button - Show for transferred capsules with CNFTs */}
                    {!isCurrentOwner(capsule) && hasAssociatedCNFT(capsule) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowTransferDialog(capsule.id);
                          setTransferCNFT(true); // Always enable CNFT transfer for this case
                        }}
                        className="flex-1 min-w-[120px] bg-white/5 hover:bg-purple-400/10 text-white hover:text-purple-200 border-purple-400/30 hover:border-purple-400/60 transition-all duration-300 px-4 py-2.5 rounded-xl"
                        disabled={transferring === capsule.id}
                      >
                        <ArrowRightLeft className="mr-2 h-4 w-4" />
                        Transfer cNFT
                      </Button>
                    )}

                    {/* View NFT button for minted NFTs */}
                    {capsule.metadata?.nftMinted && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowNFTViewer(capsule.id)}
                        className="flex-1 min-w-[120px] bg-white/5 hover:bg-green-400/10 text-white hover:text-green-200 border-green-400/30 hover:border-green-400/60 transition-all duration-300 px-4 py-2.5 rounded-xl"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        <span className="font-semibold">View cNFT</span>
                      </Button>
                    )}


                  </>
                )}
              </div>
            </div>

            {/* Hover Glow Effect */}
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-amber-400/0 via-yellow-400/0 to-orange-400/0 group-hover:from-amber-400/10 group-hover:via-yellow-400/5 group-hover:to-orange-400/10 transition-all duration-700 pointer-events-none" />
          </div>
        ))}
      </div>

      {/* Capsule Detail Modal */}
      {selectedCapsule && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-black/40 via-black/20 to-amber-950/20 rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-amber-400/30 backdrop-blur-xl">
            <div className="relative">
              {/* Header */}
              <div className="p-6 pb-4 border-b border-gray-700/30">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-white">{selectedCapsule.name}</h2>
                    <p className="text-sm text-gray-400 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Created on {formatDatetime(selectedCapsule.createdAt)}
                    </p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleCloseCapsule}
                    className="text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded-full w-8 h-8 p-0"
                  >
                    ×
                  </Button>
                </div>
                
                {/* Status Badge */}
                <div className="mt-4">
                  {selectedCapsule.isLocked ? (
                    isUnlocked(selectedCapsule.unlockDate) ? (
                      <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-400 to-orange-500 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
                        <Unlock className="h-4 w-4" />
                        Ready to Unlock
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-2 bg-gradient-to-r from-gray-400 to-gray-600 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
                        <Lock className="h-4 w-4" />
                        Time Locked
                      </div>
                    )
                  ) : (
                    <div className="inline-flex items-center gap-2 bg-gradient-to-r from-green-400 to-emerald-500 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
                      <Unlock className="h-4 w-4" />
                      Unlocked
                    </div>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="p-8 space-y-8">
                {/* Image */}
                {selectedCapsule.imageUrl && !selectedCapsule.isLocked && (
                  <div className="relative overflow-hidden rounded-2xl shadow-lg group">
                    <img
                      src={selectedCapsule.imageUrl}
                      alt={selectedCapsule.name}
                      className="w-full h-80 object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />

                    {/* Fullscreen Icon */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowFullscreenImage(selectedCapsule.imageUrl)}
                      className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 border-white/30 text-white hover:border-white/60 transition-all duration-300 opacity-0 group-hover:opacity-100"
                    >
                      <Maximize2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {/* Message */}
                <div className="bg-white/5 rounded-2xl p-6 border border-amber-400/20">
                  <h4 className="font-bold text-white mb-4 flex items-center gap-3">
                    <div className="w-3 h-3 bg-amber-400 rounded-full"></div>
                    Memory Message
                  </h4>
                  <p className="text-gray-300 leading-relaxed text-lg">{selectedCapsule.description}</p>
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white/5 rounded-xl p-6 border border-amber-400/20">
                    <div className="flex items-center gap-3 text-base text-gray-300 mb-3">
                      <div className="w-3 h-3 bg-purple-400 rounded-full"></div>
                      Status
                    </div>
                    <div className={`font-bold text-lg ${selectedCapsule.isLocked ? 'text-amber-400' : 'text-green-400'}`}>
                      {selectedCapsule.isLocked ? 'Locked' : 'Unlocked'}
                    </div>
                  </div>

                  <div className="bg-white/5 rounded-xl p-6 border border-amber-400/20">
                    <div className="flex items-center gap-3 text-base text-gray-300 mb-3">
                      <div className="w-3 h-3 bg-pink-400 rounded-full"></div>
                      Unlock Date
                    </div>
                    <div className="font-bold text-lg text-white">{formatDatetime(selectedCapsule.unlockDate)}</div>
                  </div>

                  <div className="bg-white/5 rounded-xl p-6 border border-amber-400/20">
                    <div className="flex items-center gap-3 text-base text-gray-300 mb-3">
                      <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                      Current Owner
                    </div>
                    <div className="font-mono text-base font-bold text-white">
                      {selectedCapsule.owner.slice(0, 8)}...{selectedCapsule.owner.slice(-8)}
                    </div>
                  </div>

                  {selectedCapsule.metadata?.creator && selectedCapsule.metadata.creator !== selectedCapsule.owner && (
                    <div className="bg-white/5 rounded-xl p-6 border border-amber-400/20">
                      <div className="flex items-center gap-3 text-base text-gray-300 mb-3">
                        <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                        Original Creator
                      </div>
                      <div className="font-mono text-base font-bold text-white">
                        {selectedCapsule.metadata.creator.slice(0, 8)}...{selectedCapsule.metadata.creator.slice(-8)}
                      </div>
                    </div>
                  )}

                  {selectedCapsule.metadata?.transferredAt && (
                    <div className="bg-white/5 rounded-xl p-6 border border-amber-400/20">
                      <div className="flex items-center gap-3 text-base text-gray-300 mb-3">
                        <div className="w-3 h-3 bg-orange-400 rounded-full"></div>
                        Transferred
                      </div>
                      <div className="font-bold text-lg text-white">
                        {new Date(selectedCapsule.metadata.transferredAt * 1000).toLocaleDateString()}
                      </div>
                    </div>
                  )}

                  {selectedCapsule.mint && (
                    <div className="bg-white/5 rounded-xl p-6 border border-amber-400/20">
                      <div className="flex items-center gap-3 text-base text-gray-300 mb-3">
                        <div className="w-3 h-3 bg-violet-400 rounded-full"></div>
                        NFT Mint
                      </div>
                      <div className="font-mono text-base font-bold text-white">
                        {selectedCapsule.mint.slice(0, 8)}...{selectedCapsule.mint.slice(-8)}
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-4 pt-6">
                  {selectedCapsule.isLocked && isUnlocked(selectedCapsule.unlockDate) && (
                    <Button
                      onClick={() => handleUnlockCapsule(selectedCapsule)}
                      disabled={unlockingCapsule === selectedCapsule.id}
                      className="flex-1 min-w-[160px] bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl py-3"
                    >
                      {unlockingCapsule === selectedCapsule.id ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Unlock className="h-4 w-4 mr-2" />
                      )}
                      Unlock Capsule
                    </Button>
                  )}



                  <Button
                    variant="outline"
                    onClick={handleCloseCapsule}
                    className="flex-1 min-w-[120px] bg-white/5 hover:bg-amber-400/10 border-amber-400/30 hover:border-amber-400/60 text-white hover:text-amber-100 transition-all duration-300 rounded-xl py-3"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mint NFT Dialog */}
      {showMintDialog && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-black/40 via-black/20 to-amber-950/20 rounded-3xl shadow-2xl max-w-md w-full max-h-[90vh] border border-amber-400/30 backdrop-blur-xl overflow-hidden">
            <div className="p-8 overflow-y-auto max-h-[calc(90vh-64px)]">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-500 to-violet-600 rounded-3xl mb-6 shadow-2xl shadow-purple-500/30">
                  <Lock className="h-10 w-10 text-white" />
                </div>
                <h2 className="text-3xl font-black text-white mb-3">Mint Capsule as NFT</h2>
                <p className="text-lg text-gray-300 leading-relaxed">
                  Choose the type of NFT to mint for your unlocked capsule
                </p>
              </div>
              <div className="space-y-6">
              {mintingCapsule === showMintDialog ? (
                // Minting in progress
                <div className="space-y-6">
                  <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-amber-400" />
                    <p className="text-base font-semibold text-white">{mintStatus}</p>
                  </div>
                  
                  <div className="w-full bg-white/10 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-amber-400 to-orange-500 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${mintProgress}%` }}
                    />
                  </div>
                  
                  <p className="text-sm text-center text-gray-400">
                    {mintProgress}% Complete
                  </p>
                </div>
              ) : (
                // NFT type selection
                <>
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="inline-flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-purple-400/20 to-violet-400/20 rounded-xl border border-purple-400/30">
                        <Lock className="h-5 w-5 text-purple-400" />
                        <span className="text-base font-semibold text-purple-300">Compressed NFT (cNFT)</span>
                      </div>
                    </div>
                    
                    <div className="text-sm text-gray-400 text-center max-w-sm mx-auto leading-relaxed">
                      <p>
                        <strong>Compressed NFT:</strong> Cost-efficient NFT stored in Merkle trees with real-time WebSocket monitoring. 
                        Perfect for memory capsules with ~99% lower minting costs.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-6">
                    <Button
                      onClick={() => {
                        const capsule = userCapsules.find(c => c.id === showMintDialog);
                        if (capsule) handleMintNFT(capsule);
                      }}
                      className="flex-1 bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 py-3 rounded-xl font-semibold"
                      disabled={!showMintDialog}
                    >
                      <Lock className="mr-2 h-4 w-4" />
                      Mint cNFT
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowMintDialog(null)}
                      className="flex-1 bg-white/5 hover:bg-amber-400/10 border-amber-400/30 hover:border-amber-400/60 text-white hover:text-amber-100 transition-all duration-300 py-3 rounded-xl font-semibold"
                    >
                      Cancel
                    </Button>
                  </div>
                </>
              )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transfer cNFT Dialog */}
      {showTransferDialog && (() => {
        const capsule = userCapsules.find(c => c.id === showTransferDialog);
        if (!capsule) return null;
        
        const { transferType } = getTransferButtonInfo(capsule);
        const isOwner = isCurrentOwner(capsule);
        const isTransferredCapsule = !isOwner && hasAssociatedCNFT(capsule);
        
        if (!isOwner && !isTransferredCapsule) {
          return (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
              <div className="bg-gradient-to-br from-black/40 via-black/20 to-amber-950/20 rounded-3xl shadow-2xl max-w-md w-full max-h-[90vh] border border-amber-400/30 backdrop-blur-xl overflow-hidden">
                <div className="p-8 overflow-y-auto max-h-[calc(90vh-64px)]">
                  <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-red-400 to-red-600 rounded-3xl mb-6 shadow-2xl shadow-red-400/30">
                      <X className="h-10 w-10 text-white" />
                    </div>
                    <h2 className="text-3xl font-black text-white mb-3">Access Denied</h2>
                    <p className="text-lg text-gray-300 leading-relaxed">
                      Only the capsule owner can transfer this capsule
                    </p>
                  </div>
                  <div className="text-center">
                    <Button
                      onClick={() => {
                        setShowTransferDialog(null);
                        setTransferAddress('');
                        setTransferCNFT(false);
                      }}
                      className="bg-white/5 hover:bg-red-400/10 border-red-400/30 hover:border-red-400/60 text-white hover:text-red-100 transition-all duration-300 py-3 px-8 rounded-xl font-semibold"
                    >
                      Close
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        }
        
        // Determine the actual transfer type for the dialog
        let dialogTransferType = transferType;
        if (isTransferredCapsule) {
          dialogTransferType = 'cnft-only';
        }
        
        return (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <div className="bg-gradient-to-br from-black/40 via-black/20 to-amber-950/20 rounded-3xl shadow-2xl max-w-md w-full max-h-[90vh] border border-amber-400/30 backdrop-blur-xl overflow-hidden">
              <div className="p-8 overflow-y-auto max-h-[calc(90vh-64px)]">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-3xl mb-6 shadow-2xl shadow-amber-400/30">
                    <ArrowRightLeft className="h-10 w-10 text-black" />
                  </div>
                  <h2 className="text-3xl font-black text-white mb-3">
                    {dialogTransferType === 'both' ? 'Transfer Capsule & cNFT' : 
                     dialogTransferType === 'cnft-only' ? 'Transfer cNFT' : 'Transfer Capsule'}
                  </h2>
                  <p className="text-lg text-gray-300 leading-relaxed">
                    {dialogTransferType === 'both' 
                      ? 'Transfer both your memory capsule and the associated cNFT to another wallet'
                      : dialogTransferType === 'cnft-only'
                      ? 'Transfer the compressed NFT associated with this capsule to another wallet'
                      : 'Transfer your memory capsule to another wallet (capsule only, not the NFT)'
                    }
                  </p>
                </div>
                <div className="space-y-6">
                  <div>
                    <label className="text-base font-semibold text-white mb-3 block">Recipient Address</label>
                    <input
                      type="text"
                      value={transferAddress}
                      onChange={(e) => setTransferAddress(e.target.value.trim())}
                      placeholder="Enter Solana wallet address (e.g., 7wnLBEm3ftFJobu1yvv25JvyNVqzs4SEKYAfSbimCDN9)"
                      className="w-full px-4 py-3 border border-amber-400/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400/60 bg-white/5 text-white placeholder-gray-400 font-mono text-sm transition-all duration-300"
                    />
                    {transferAddress && (
                      <div className="mt-3 text-sm">
                        {(() => {
                          try {
                            new PublicKey(transferAddress.trim());
                            return <span className="text-emerald-400 font-medium">✅ Valid Solana address</span>;
                          } catch {
                            return <span className="text-red-400 font-medium">❌ Invalid address format</span>;
                          }
                        })()}
                      </div>
                    )}
                  </div>

                  {/* CNFT Transfer Checkbox - Only show for both transfer types */}
                  {dialogTransferType === 'both' && (
                    <div className="flex items-center space-x-3 p-4 bg-white/5 rounded-xl border border-amber-400/20">
                      <input
                        type="checkbox"
                        id="transferCNFT"
                        checked={transferCNFT}
                        onChange={(e) => setTransferCNFT(e.target.checked)}
                        className="w-5 h-5 text-amber-500 bg-transparent border-amber-400 rounded focus:ring-amber-400 focus:ring-2"
                      />
                      <label htmlFor="transferCNFT" className="text-white text-sm leading-relaxed">
                        <span className="font-semibold">Also transfer the associated cNFT</span>
                        <br />
                        <span className="text-gray-300 text-xs">
                          This will transfer both the capsule ownership and the compressed NFT to the recipient
                        </span>
                      </label>
                    </div>
                  )}

                  {/* CNFT-only transfer info */}
                  {dialogTransferType === 'cnft-only' && (
                    <div className="p-4 bg-purple-500/10 rounded-xl border border-purple-400/20">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="w-3 h-3 bg-purple-400 rounded-full"></div>
                        <span className="text-purple-300 font-semibold text-sm">CNFT Transfer Only</span>
                      </div>
                      <p className="text-gray-300 text-sm">
                        You can transfer the compressed NFT associated with this capsule to another wallet. 
                        The capsule ownership will remain unchanged.
                      </p>
                    </div>
                  )}

                  <div className="flex gap-4 pt-4">
                    <Button
                      onClick={() => {
                        if (capsule) handleTransferNFT(capsule);
                      }}
                      className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 py-3 rounded-xl font-semibold"
                      disabled={!transferAddress.trim() || transferring === showTransferDialog}
                    >
                      {transferring === showTransferDialog ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Transferring...
                        </>
                      ) : (
                        <>
                          <ArrowRightLeft className="mr-2 h-4 w-4" />
                          {dialogTransferType === 'both' ? 'Transfer Capsule & cNFT' : 
                           dialogTransferType === 'cnft-only' ? 'Transfer cNFT' : 'Transfer Capsule'}
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowTransferDialog(null);
                        setTransferAddress('');
                        setTransferCNFT(false);
                      }}
                      className="flex-1 bg-white/5 hover:bg-amber-400/10 border-amber-400/30 hover:border-amber-400/60 text-white hover:text-amber-100 transition-all duration-300 py-3 rounded-xl font-semibold"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* NFT Viewer Dialog */}
      {showNFTViewer && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-slate-900/95 via-black/90 to-slate-800/95 rounded-3xl shadow-2xl max-w-7xl w-full max-h-[90vh] border border-slate-600/30 backdrop-blur-xl overflow-hidden">
            <div className="p-8 overflow-y-auto max-h-[calc(90vh-64px)]">
              {/* Header */}
              <div className="text-center mb-10">
                <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-emerald-400 via-green-500 to-teal-600 rounded-3xl mb-6 shadow-2xl shadow-emerald-400/20">
                  <Eye className="h-12 w-12 text-white" />
                </div>
                <h2 className="text-4xl font-black text-white mb-3 bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent">
                  View cNFT Details
                </h2>
                <p className="text-xl text-gray-400 leading-relaxed">
                  Compressed NFT information and verification
                </p>
              </div>

              {(() => {
                const capsule = userCapsules.find(c => c.id === showNFTViewer);
                if (!capsule) return null;

                return (
                  <div className="space-y-8">
                    {/* Main NFT Display */}
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                      {/* NFT Image and Basic Info */}
                      <div className="xl:col-span-1">
                        <div className="bg-gradient-to-br from-slate-800/50 via-slate-700/30 to-slate-600/20 rounded-3xl p-8 border border-slate-600/30 shadow-xl h-full flex flex-col justify-center">
                          <div className="text-center">
                            <div className="relative mb-6">
                              <div className="absolute inset-0 bg-gradient-to-br from-amber-400/20 via-orange-500/20 to-red-500/20 rounded-3xl blur-xl"></div>
                              <img 
                                src={capsule.imageUrl} 
                                alt={capsule.name}
                                className="relative w-40 h-40 object-cover rounded-3xl mx-auto shadow-2xl border-2 border-white/10"
                              />
                              {/* cNFT Status Badge */}
                              {hasAssociatedCNFT(capsule) && (
                                <div className="absolute -top-2 -right-2 bg-gradient-to-r from-purple-500 to-violet-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg border-2 border-white/20">
                                  cNFT
                                </div>
                              )}
                            </div>
                            <h3 className="font-black text-3xl text-white mb-3 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                              {capsule.name}
                            </h3>
                            <p className="text-lg text-gray-300 leading-relaxed px-4">
                              {capsule.description}
                            </p>
                            {/* cNFT Info */}
                            {hasAssociatedCNFT(capsule) && (
                              <div className="mt-4 p-3 bg-purple-500/10 rounded-2xl border border-purple-400/20">
                                <div className="text-sm text-purple-200 font-medium">
                                  Compressed NFT Available
                                </div>
                                <div className="text-xs text-purple-300 mt-1">
                                  Asset ID: {capsule.metadata?.assetId?.slice(0, 8)}...
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* NFT Details Grid */}
                      <div className="xl:col-span-2">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Type and Status */}
                          <div className="group bg-gradient-to-br from-blue-600/10 via-blue-500/5 to-indigo-600/10 rounded-3xl p-6 border border-blue-500/20 shadow-lg hover:shadow-blue-500/10 transition-all duration-500 hover:scale-[1.02]">
                            <div className="flex items-center space-x-3 mb-4">
                              <div className="w-4 h-4 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full shadow-lg shadow-blue-400/30"></div>
                              <span className="text-blue-200 font-bold text-lg">Type & Status</span>
                            </div>
                            <div className="space-y-4">
                              <div className="flex justify-between items-center p-3 bg-blue-500/10 rounded-2xl border border-blue-400/20">
                                <span className="text-blue-100 font-medium">Type:</span>
                                <span className="font-bold text-white text-lg">Compressed NFT</span>
                              </div>
                              <div className="flex justify-between items-center p-3 bg-emerald-500/10 rounded-2xl border border-emerald-400/20">
                                <span className="text-emerald-100 font-medium">Status:</span>
                                <span className="flex items-center space-x-2">
                                  <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse"></div>
                                  <span className="font-bold text-emerald-300 text-lg">✅ Minted</span>
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Transaction Info */}
                          <div className="group bg-gradient-to-br from-purple-600/10 via-purple-500/5 to-violet-600/10 rounded-3xl p-6 border border-purple-500/20 shadow-lg hover:shadow-purple-500/10 transition-all duration-500 hover:scale-[1.02]">
                            <div className="flex items-center space-x-3 mb-4">
                              <div className="w-4 h-4 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full shadow-lg shadow-purple-400/30"></div>
                              <span className="text-purple-200 font-bold text-lg">Transaction</span>
                            </div>
                            {capsule.metadata?.mintSignature && (
                              <div className="space-y-4">
                                <div className="p-3 bg-slate-800/50 rounded-2xl border border-slate-600/30">
                                  <div className="text-xs text-gray-400 font-mono break-all leading-relaxed">
                                    {convertSignatureToBase58(capsule.metadata.mintSignature)}
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <a 
                                    href={`https://solscan.io/tx/${convertSignatureToBase58(capsule.metadata.mintSignature)}?cluster=devnet`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bg-gradient-to-r from-purple-500/20 to-purple-600/20 hover:from-purple-500/30 hover:to-purple-600/30 text-purple-200 hover:text-purple-100 px-4 py-3 rounded-2xl text-sm font-bold transition-all duration-300 flex items-center justify-center space-x-2 border border-purple-400/30 hover:border-purple-400/50 group-hover:shadow-purple-500/20"
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                    Solscan
                                  </a>
                                  <a 
                                    href={`https://explorer.solana.com/tx/${convertSignatureToBase58(capsule.metadata.mintSignature)}?cluster=devnet`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bg-gradient-to-r from-violet-500/20 to-violet-600/20 hover:from-violet-500/30 hover:to-violet-600/30 text-violet-200 hover:text-violet-100 px-4 py-3 rounded-2xl text-sm font-bold transition-all duration-300 flex items-center justify-center space-x-2 border border-violet-400/30 hover:border-violet-400/50 group-hover:shadow-violet-500/20"
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                    Explorer
                                  </a>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Merkle Tree Info */}
                          <div className="group bg-gradient-to-br from-amber-600/10 via-orange-500/5 to-red-600/10 rounded-3xl p-6 border border-amber-500/20 shadow-lg hover:shadow-amber-500/10 transition-all duration-500 hover:scale-[1.02]">
                            <div className="flex items-center space-x-3 mb-4">
                              <div className="w-4 h-4 bg-gradient-to-br from-amber-400 to-orange-600 rounded-full shadow-lg shadow-amber-400/30"></div>
                              <span className="text-amber-200 font-bold text-lg">Merkle Tree</span>
                            </div>
                            <div className="space-y-4">
                              <div className="p-3 bg-slate-800/50 rounded-2xl border border-slate-600/30">
                                <div className="text-xs text-gray-400 font-mono break-all leading-relaxed">
                                  {capsule.metadata?.treeAddress || 
                                   process.env.NEXT_PUBLIC_MERKLE_TREE_ADDRESS || 
                                   'Tree address not available'}
                                </div>
                              </div>
                              <button 
                                onClick={() => {
                                  const treeAddress = capsule.metadata?.treeAddress || 
                                                    process.env.NEXT_PUBLIC_MERKLE_TREE_ADDRESS;
                                  if (treeAddress) {
                                    navigator.clipboard.writeText(treeAddress);
                                    toast.success('Tree address copied to clipboard!');
                                  } else {
                                    toast.error('No tree address available to copy');
                                  }
                                }}
                                disabled={!capsule.metadata?.treeAddress && !process.env.NEXT_PUBLIC_MERKLE_TREE_ADDRESS}
                                className="w-full bg-gradient-to-r from-amber-500/20 to-orange-600/20 hover:from-amber-500/30 hover:to-orange-600/30 text-amber-200 hover:text-amber-100 px-4 py-3 rounded-2xl text-sm font-bold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed border border-amber-400/30 hover:border-amber-400/50 group-hover:shadow-amber-500/20"
                              >
                                Copy Tree Address
                              </button>
                            </div>
                          </div>

                          {/* Verification Guide */}
                          <div className="group bg-gradient-to-br from-emerald-600/10 via-green-500/5 to-teal-600/10 rounded-3xl p-6 border border-emerald-500/20 shadow-lg hover:shadow-emerald-500/10 transition-all duration-500 hover:scale-[1.02]">
                            <div className="flex items-center space-x-3 mb-4">
                              <div className="w-4 h-4 bg-gradient-to-br from-emerald-400 to-green-600 rounded-full shadow-lg shadow-emerald-400/30"></div>
                              <span className="text-emerald-200 font-bold text-lg">Verification</span>
                            </div>
                            <div className="space-y-3">
                              <div className="flex items-start space-x-3 p-3 bg-emerald-500/10 rounded-2xl border border-emerald-400/20">
                                <div className="w-2 h-2 bg-emerald-400 rounded-full mt-2 flex-shrink-0 shadow-lg shadow-emerald-400/50"></div>
                                <span className="text-sm text-emerald-100 leading-relaxed">Use transaction signature to verify on blockchain explorers</span>
                              </div>
                              <div className="flex items-start space-x-3 p-3 bg-emerald-500/10 rounded-2xl border border-emerald-400/20">
                                <div className="w-2 h-2 bg-emerald-400 rounded-full mt-2 flex-shrink-0 shadow-lg shadow-emerald-400/50"></div>
                                <span className="text-sm text-emerald-100 leading-relaxed">Merkle tree contains your compressed NFT data</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 pt-8">
                      <Button
                        onClick={() => {
                          const treeAddress = capsule.metadata?.treeAddress || 
                                            process.env.NEXT_PUBLIC_MERKLE_TREE_ADDRESS;
                          if (treeAddress) {
                            window.open(`https://solscan.io/account/${treeAddress}?cluster=devnet`, '_blank');
                          } else {
                            toast.error('No tree address available to view');
                          }
                        }}
                        disabled={!capsule.metadata?.treeAddress && !process.env.NEXT_PUBLIC_MERKLE_TREE_ADDRESS}
                        className="flex-1 bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 hover:from-blue-600 hover:via-blue-700 hover:to-blue-800 text-white border-0 shadow-xl hover:shadow-2xl hover:shadow-blue-500/25 transition-all duration-300 py-4 rounded-2xl font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02]"
                      >
                        <ExternalLink className="mr-3 h-5 w-5" />
                        View on Solscan
                      </Button>
                      <Button
                        onClick={() => {
                          const treeAddress = capsule.metadata?.treeAddress || 
                                            process.env.NEXT_PUBLIC_MERKLE_TREE_ADDRESS;
                          if (treeAddress) {
                            window.open(`https://explorer.solana.com/address/${treeAddress}?cluster=devnet`, '_blank');
                          } else {
                            toast.error('No tree address available to view');
                          }
                        }}
                        disabled={!capsule.metadata?.treeAddress && !process.env.NEXT_PUBLIC_MERKLE_TREE_ADDRESS}
                        className="flex-1 bg-gradient-to-r from-purple-500 via-purple-600 to-purple-700 hover:from-purple-600 hover:via-purple-700 hover:to-purple-800 text-white border-0 shadow-xl hover:shadow-2xl hover:shadow-purple-500/25 transition-all duration-300 py-4 rounded-2xl font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02]"
                      >
                        <ExternalLink className="mr-3 h-5 w-5" />
                        View on Explorer
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowNFTViewer(null)}
                        className="flex-1 bg-gradient-to-r from-slate-600/20 to-slate-700/20 hover:from-slate-600/30 hover:to-slate-700/30 border-slate-500/30 hover:border-slate-400/50 text-slate-200 hover:text-white transition-all duration-300 py-4 rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl transform hover:scale-[1.02]"
                      >
                        Close
                      </Button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Image Modal */}
      {showFullscreenImage && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setShowFullscreenImage(null)}>
          <div className="relative max-w-5xl max-h-full">
            <img
              src={showFullscreenImage}
              alt="Fullscreen view"
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setShowFullscreenImage(null);
              }}
              className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 border-white/30 text-white hover:border-white/60 transition-all duration-300"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Capsule Update Modal */}
      {showUpdateModal && (() => {
        const capsule = userCapsules.find(c => c.id === showUpdateModal);
        if (!capsule) return null;
        
        return (
          <CapsuleUpdateModal
            capsule={capsule}
            isOpen={!!showUpdateModal}
            onClose={() => setShowUpdateModal(null)}
            onUpdate={() => {
              // Reload capsules to get fresh data
              loadUserCapsules();
            }}
          />
        );
      })()}

      {/* Toast Container */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
          loading: {
            iconTheme: {
              primary: '#3b82f6',
              secondary: '#fff',
            },
          },
        }}
      />
    </div>
  );
} 