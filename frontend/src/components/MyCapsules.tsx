'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Calendar, Lock, Unlock, Share2, Send, Eye, Loader2, ArrowRightLeft, ExternalLink } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import bs58 from 'bs58';
import { useAppStore, Capsule } from '@/stores/appStore';
import { formatDate, formatDatetime } from '@/lib/utils';
import { solanaService } from '@/services/solana';
import { encryptionService } from '@/services/encryption';
import { nftService, CNFTMintOptions } from '@/services/nft';
import { cnftService } from '@/services/cnft';
import { DasApiAsset, MintTransactionStatus } from '@/services/helius-das';
import { PublicKey } from '@solana/web3.js';

export function MyCapsules() {
  const { connected, publicKey, signTransaction, signMessage } = useWallet();
  const { userCapsules, setUserCapsules, updateCapsule } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [selectedCapsule, setSelectedCapsule] = useState<Capsule | null>(null);
  const [unlockingCapsule, setUnlockingCapsule] = useState<string | null>(null);
  const [mintingCapsule, setMintingCapsule] = useState<string | null>(null);
  const [mintAsCompressed, setMintAsCompressed] = useState(true);
  const [mintProgress, setMintProgress] = useState(0);
  const [mintStatus, setMintStatus] = useState<string>('');
  const [showMintDialog, setShowMintDialog] = useState<string | null>(null);
  const [showTransferDialog, setShowTransferDialog] = useState<string | null>(null);
  const [transferAddress, setTransferAddress] = useState('');
  const [transferring, setTransferring] = useState<string | null>(null);
  const [showNFTViewer, setShowNFTViewer] = useState<string | null>(null);

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
      // Fetch real capsules from Solana
      const solanaCapsules = await solanaService.getWalletCapsules({
        publicKey,
        signTransaction: signTransaction!,
        signMessage: signMessage!
      });



      // Transform Solana data to our app format
      const transformedCapsules: Capsule[] = await Promise.all(solanaCapsules.map(async (solanaCapsule: any) => {
        let contentData;
        try {
          contentData = JSON.parse(solanaCapsule.content);
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
              solanaCapsule.title,
              solanaCapsule.unlockDate.toNumber(),
              publicKey!.toString() // Use current wallet key, not creator from blockchain
            );
            imageUrl = decryptedImageUrl.decryptedUrl;
          } catch (error) {
            // Try alternative decryption methods
            try {
              // Try with different key derivation parameters
              const decryptedImageUrl = await encryptionService.decryptPinataUrl(
                {
                  encryptedUrl: contentData.encryptedImageUrl,
                  iv: contentData.encryptedImageIv
                },
                publicKey!,
                solanaCapsule.title.trim(), // Try trimmed title
                solanaCapsule.unlockDate.toNumber(),
                publicKey!.toString() // Use current wallet key
              );
              imageUrl = decryptedImageUrl.decryptedUrl;
            } catch (altError) {
              imageUrl = '';
            }
          }
        } else if (!solanaCapsule.isUnlocked && contentData.encryptedImageUrl) {
          // Check if capsule is ready to be unlocked (time has passed)
          const currentTime = Math.floor(Date.now() / 1000);
          if (solanaCapsule.unlockDate.toNumber() <= currentTime) {
            // The unlock button will be shown to the user
          }
        }

        const capsule = {
          id: solanaCapsule.address,
          mint: solanaCapsule.mint?.toString() || '',
          name: solanaCapsule.title,
          description: contentData.description || 'No description',
          imageUrl: imageUrl,
          unlockDate: new Date(solanaCapsule.unlockDate.toNumber() * 1000),
          createdAt: new Date(solanaCapsule.createdAt.toNumber() * 1000),
          owner: solanaCapsule.owner?.toString() || solanaCapsule.creator.toString(), // Use owner if available, fallback to creator
          isLocked: !solanaCapsule.isUnlocked,
          metadata: {
            attributes: [
              { trait_type: 'Unlock Date', value: new Date(solanaCapsule.unlockDate.toNumber() * 1000).toISOString() },
              { trait_type: 'Status', value: solanaCapsule.isUnlocked ? 'Unlocked' : 'Locked' },
              { trait_type: 'Creator', value: solanaCapsule.creator.toString() }
            ],
            creator: solanaCapsule.creator.toString(),
            transferredAt: solanaCapsule.transferredAt ? solanaCapsule.transferredAt.toNumber() : null,
            mintCreator: solanaCapsule.mintCreator?.toString() || null
          }
        };

        return capsule;
      }));


      
      // Restore NFT minting status from localStorage
      const capsulesWithNFTStatus = transformedCapsules.map(capsule => {
        const savedNFTStatus = localStorage.getItem(`capsule_nft_${capsule.id}`);
        if (savedNFTStatus) {
          try {
            const nftData = JSON.parse(savedNFTStatus);

            return {
              ...capsule,
              metadata: {
                ...capsule.metadata,
                nftMinted: nftData.nftMinted,
                mintSignature: nftData.mintSignature
              }
            };
          } catch (e) {
            // Failed to parse saved NFT status
          }
        }
        return capsule;
      });
      
      setUserCapsules(capsulesWithNFTStatus);
    } catch (error) {
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

  const handleTransferCapsule = (_capsule: Capsule) => {

    alert('Transfer functionality coming soon!');
  };

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
              
              // Save NFT status to localStorage for persistence
              localStorage.setItem(`capsule_nft_${capsule.id}`, JSON.stringify({
                nftMinted: true,
                mintSignature: mintResult.signature
              }));
              
              // Force reload capsules to ensure UI updates
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
        
        // Save to localStorage immediately for persistence
        localStorage.setItem(`capsule_nft_${capsule.id}`, JSON.stringify({
          nftMinted: true,
          mintSignature: mintResult.signature
        }));
        

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

  const handleTransferNFT = async (capsule: Capsule) => {
    if (!publicKey || !signTransaction || !signMessage || !transferAddress.trim()) {
      toast.error('Please enter a valid transfer address');
      return;
    }

    try {
      // Validate the address
      new PublicKey(transferAddress);
    } catch (error) {
      toast.error('Invalid Solana address');
      return;
    }

    setTransferring(capsule.id);

    try {
      toast.loading('Transferring capsule...', { id: 'transfer' });

      // Transfer the capsule using the Solana service
      const result = await solanaService.transferCapsule(
        {
          publicKey,
          signTransaction: signTransaction!,
          signMessage: signMessage!
        },
        capsule.id,
        transferAddress,
        capsule.metadata?.mintSignature // Pass mint signature as mint address
      );

      toast.success('🎉 Capsule transferred successfully!', { id: 'transfer' });

      // Remove the capsule from current user's list since it's been transferred
      const updatedCapsules = userCapsules.filter((c: Capsule) => c.id !== capsule.id);
      setUserCapsules(updatedCapsules);
      
      // Reload capsules to ensure UI is up to date
      setTimeout(() => {
        loadUserCapsules();
      }, 1000);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Transfer failed: ${errorMessage}`, { id: 'transfer' });
    } finally {
      setTransferring(null);
      setShowTransferDialog(null);
      setTransferAddress('');
    }
  };

  const handleUnlockCapsule = async (capsule: Capsule) => {
    if (!publicKey || !signTransaction || !signMessage) return;

    setUnlockingCapsule(capsule.id);
    try {
      let unlockResult;
      
      if (capsule.isLocked) {
        // Unlock the capsule on Solana
        unlockResult = await solanaService.unlockCapsule(
          {
            publicKey,
            signTransaction: signTransaction!,
            signMessage: signMessage!
          },
          capsule.id
        );
      } else {
        // Capsule is already unlocked, just try to decrypt the image
        unlockResult = {
          decryptedImageUrl: JSON.stringify({
            description: capsule.description,
            encryptedImageUrl: '', // We'll get this from the capsule data
            encryptedImageIv: ''
          }),
          encryptedUrl: ''
        };
      }

      // Get the encrypted data from the capsule content
      // We need to fetch the capsule data again to get the encrypted content
      const solanaCapsules = await solanaService.getWalletCapsules({
        publicKey,
        signTransaction: signTransaction!,
        signMessage: signMessage!
      });
      
      const currentCapsule = solanaCapsules.find((c: any) => c.address === capsule.id);
      if (!currentCapsule) {
        throw new Error('Capsule not found');
      }
      
      let contentData;
      try {
        contentData = JSON.parse(currentCapsule.content);
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

    } catch (error) {
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
      <Card className="max-w-2xl mx-auto mx-4 md:mx-auto">
        <CardHeader className="text-center p-4 md:p-6">
          <CardTitle className="text-lg md:text-xl">Connect Your Wallet</CardTitle>
          <CardDescription className="text-sm md:text-base">
            Please connect your wallet to view your memory capsules
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="max-w-2xl mx-auto mx-4 md:mx-auto">
        <CardHeader className="text-center p-4 md:p-6">
          <CardTitle className="text-lg md:text-xl">Loading Your Capsules...</CardTitle>
          <CardDescription className="text-sm md:text-base">
            Fetching your memory capsules from the blockchain
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center p-6">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-purple-600" />
        </CardContent>
      </Card>
    );
  }

  if (userCapsules.length === 0) {
    return (
      <Card className="max-w-2xl mx-auto mx-4 md:mx-auto">
        <CardHeader className="text-center p-4 md:p-6">
          <CardTitle className="text-lg md:text-xl">No Capsules Found</CardTitle>
          <CardDescription className="text-sm md:text-base">
            You haven't created any memory capsules yet. Create your first one to get started!
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 px-4 md:px-0">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">My Memory Capsules</h2>
        <p className="text-gray-600 mt-2">
          Manage and unlock your time-locked memories
        </p>
        <Button
          onClick={loadUserCapsules}
          disabled={loading}
          variant="outline"
          size="sm"
          className="mt-4"
        >
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Refresh Capsules
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {userCapsules.map((capsule) => (
          <Card key={capsule.id} className="overflow-hidden">
            <div className="aspect-square bg-gray-100 flex items-center justify-center">
              {capsule.imageUrl && !capsule.isLocked ? (
                <img
                  src={capsule.imageUrl}
                  alt={capsule.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center p-4">
                  {capsule.isLocked ? (
                    isUnlocked(capsule.unlockDate) ? (
                      <div>
                        <Unlock className="mx-auto h-12 w-12 text-amber-500" />
                        <p className="text-sm text-amber-600 mt-2 font-medium">Ready to Unlock!</p>
                      </div>
                    ) : (
                      <div>
                        <Lock className="mx-auto h-12 w-12 text-gray-400" />
                        <p className="text-sm text-gray-500 mt-2">Locked</p>
                      </div>
                    )
                  ) : (
                    <div>
                      {capsule.imageUrl ? (
                        <div>
                          <img
                            src={capsule.imageUrl}
                            alt={capsule.name}
                            className="mx-auto max-h-32 rounded"
                          />
                          <p className="text-sm text-green-600 mt-2">Image Loaded</p>
                        </div>
                      ) : (
                        <div>
                          <Unlock className="mx-auto h-12 w-12 text-green-400" />
                          <p className="text-sm text-green-600 mt-2">Unlocked (No Image)</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <CardContent className="p-4">
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold text-lg truncate">{capsule.name}</h3>
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {capsule.description}
                  </p>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {capsule.isLocked ? 'Unlocks' : 'Unlocked'}: {formatDate(capsule.unlockDate)}
                  </span>
                </div>

                {capsule.isLocked && (
                  <div className="flex items-center gap-2 text-sm text-amber-600">
                    <Clock className="h-4 w-4" />
                    <span>
                      {isUnlocked(capsule.unlockDate) ? 'Ready to Unlock!' : getTimeUntilUnlock(capsule.unlockDate)}
                    </span>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewCapsule(capsule)}
                    className="flex-1"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>

                  {capsule.isLocked && isUnlocked(capsule.unlockDate) && (
                    <Button
                      size="sm"
                      onClick={() => handleUnlockCapsule(capsule)}
                      disabled={unlockingCapsule === capsule.id}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      {unlockingCapsule === capsule.id ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Unlock className="h-4 w-4 mr-1" />
                      )}
                      Unlock
                    </Button>
                  )}
                  
                  {!capsule.isLocked && !capsule.imageUrl && isUnlocked(capsule.unlockDate) && (
                    <Button
                      size="sm"
                      onClick={() => handleUnlockCapsule(capsule)}
                      disabled={unlockingCapsule === capsule.id}
                      className="flex-1 bg-amber-600 hover:bg-amber-700"
                    >
                      {unlockingCapsule === capsule.id ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Unlock className="h-4 w-4 mr-1" />
                      )}
                      Re-unlock
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
                          className="flex-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200"
                          disabled={mintingCapsule === capsule.id}
                        >
                          {mintingCapsule === capsule.id ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <Lock className="h-4 w-4 mr-1" />
                          )}
                          Mint cNFT
                        </Button>
                      )}

                      {/* Show Transfer button only if NFT is minted */}
                      {capsule.metadata?.nftMinted && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowTransferDialog(capsule.id)}
                          className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                          disabled={transferring === capsule.id}
                        >
                          {transferring === capsule.id ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <ArrowRightLeft className="h-4 w-4 mr-1" />
                          )}
                          Transfer cNFT
                        </Button>
                      )}

                      {/* View NFT button for minted NFTs */}
                      {capsule.metadata?.nftMinted && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowNFTViewer(capsule.id)}
                          className="flex-1 bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View cNFT
                        </Button>
                      )}

                      {/* Share button for non-minted capsules */}
                      {!capsule.metadata?.nftMinted && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleShareCapsule(capsule)}
                          className="flex-1"
                        >
                          <Share2 className="h-4 w-4 mr-1" />
                          Share
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Capsule Detail Modal */}
      {selectedCapsule && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{selectedCapsule.name}</CardTitle>
                <Button variant="ghost" size="sm" onClick={handleCloseCapsule}>
                  ×
                </Button>
              </div>
              <CardDescription>
                Created on {formatDatetime(selectedCapsule.createdAt)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedCapsule.imageUrl && !selectedCapsule.isLocked && (
                <img
                  src={selectedCapsule.imageUrl}
                  alt={selectedCapsule.name}
                  className="w-full rounded-lg"
                />
              )}
              
              <div>
                <h4 className="font-semibold mb-2">Message</h4>
                <p className="text-gray-700">{selectedCapsule.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Status:</span>
                  <span className={`ml-2 ${selectedCapsule.isLocked ? 'text-amber-600' : 'text-green-600'}`}>
                    {selectedCapsule.isLocked ? 'Locked' : 'Unlocked'}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Unlock Date:</span>
                  <span className="ml-2">{formatDatetime(selectedCapsule.unlockDate)}</span>
                </div>
                <div>
                  <span className="font-medium">Current Owner:</span>
                  <span className="ml-2 font-mono text-xs">
                    {selectedCapsule.owner.slice(0, 4)}...{selectedCapsule.owner.slice(-4)}
                  </span>
                </div>
                {selectedCapsule.metadata?.creator && selectedCapsule.metadata.creator !== selectedCapsule.owner && (
                  <div>
                    <span className="font-medium">Original Creator:</span>
                    <span className="ml-2 font-mono text-xs">
                      {selectedCapsule.metadata.creator.slice(0, 4)}...{selectedCapsule.metadata.creator.slice(-4)}
                    </span>
                  </div>
                )}
                {selectedCapsule.metadata?.transferredAt && (
                  <div>
                    <span className="font-medium">Transferred:</span>
                    <span className="ml-2 text-xs">
                      {new Date(selectedCapsule.metadata.transferredAt * 1000).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {selectedCapsule.mint && (
                  <div>
                    <span className="font-medium">NFT Mint:</span>
                    <span className="ml-2 font-mono text-xs">
                      {selectedCapsule.mint.slice(0, 4)}...{selectedCapsule.mint.slice(-4)}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4">
                {selectedCapsule.isLocked && isUnlocked(selectedCapsule.unlockDate) && (
                  <Button
                    onClick={() => handleUnlockCapsule(selectedCapsule)}
                    disabled={unlockingCapsule === selectedCapsule.id}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {unlockingCapsule === selectedCapsule.id ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Unlock className="h-4 w-4 mr-2" />
                    )}
                    Unlock Capsule
                  </Button>
                )}
                
                <Button variant="outline" onClick={handleCloseCapsule}>
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Mint NFT Dialog */}
      {showMintDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Lock className="h-5 w-5 text-purple-600" />
                Mint Capsule as NFT
              </CardTitle>
              <CardDescription>
                Choose the type of NFT to mint for your unlocked capsule
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {mintingCapsule === showMintDialog ? (
                // Minting in progress
                <div className="space-y-4">
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-purple-600" />
                    <p className="text-sm font-medium">{mintStatus}</p>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${mintProgress}%` }}
                    />
                  </div>
                  
                  <p className="text-xs text-center text-gray-500">
                    {mintProgress}% Complete
                  </p>
                </div>
              ) : (
                // NFT type selection
                <>
                  <div className="space-y-3">
                    <div className="text-center">
                      <div className="inline-flex items-center gap-2 px-3 py-2 bg-purple-50 rounded-lg">
                        <Lock className="h-4 w-4 text-purple-600" />
                        <span className="text-sm font-medium text-purple-700">Compressed NFT (cNFT)</span>
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-500 text-center max-w-sm mx-auto">
                      <p>
                        <strong>Compressed NFT:</strong> Cost-efficient NFT stored in Merkle trees with real-time WebSocket monitoring. 
                        Perfect for memory capsules with ~99% lower minting costs.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      onClick={() => {
                        const capsule = userCapsules.find(c => c.id === showMintDialog);
                        if (capsule) handleMintNFT(capsule);
                      }}
                      className="flex-1 bg-purple-600 hover:bg-purple-700"
                      disabled={!showMintDialog}
                    >
                      <Lock className="mr-2 h-4 w-4" />
                      Mint cNFT
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowMintDialog(null)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Transfer cNFT Dialog */}
      {showTransferDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5 text-blue-600" />
                Transfer cNFT
              </CardTitle>
              <CardDescription>
                Transfer your compressed NFT to another wallet
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Recipient Address</label>
                <input
                  type="text"
                  value={transferAddress}
                  onChange={(e) => setTransferAddress(e.target.value)}
                  placeholder="Enter Solana wallet address..."
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    const capsule = userCapsules.find(c => c.id === showTransferDialog);
                    if (capsule) handleTransferNFT(capsule);
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
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
                      Transfer
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowTransferDialog(null);
                    setTransferAddress('');
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* NFT Viewer Dialog */}
      {showNFTViewer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-lg w-full">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Eye className="h-5 w-5 text-green-600" />
                View cNFT Details
              </CardTitle>
              <CardDescription>
                Compressed NFT information and verification
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {(() => {
                const capsule = userCapsules.find(c => c.id === showNFTViewer);
                if (!capsule) return null;

                return (
                  <>
                    <div className="text-center">
                      <img 
                        src={capsule.imageUrl} 
                        alt={capsule.name}
                        className="w-32 h-32 object-cover rounded-lg mx-auto mb-4"
                      />
                      <h3 className="font-semibold text-lg">{capsule.name}</h3>
                      <p className="text-sm text-gray-600">{capsule.description}</p>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Type:</span>
                        <span className="font-medium">Compressed NFT</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Status:</span>
                        <span className="font-medium text-green-600">✅ Minted</span>
                      </div>
                      {capsule.metadata?.mintSignature && (
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Transaction:</span>
                            <div className="flex gap-2">
                              <a 
                                href={`https://solscan.io/tx/${convertSignatureToBase58(capsule.metadata.mintSignature)}?cluster=devnet`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium text-blue-600 hover:underline flex items-center gap-1 text-xs"
                              >
                                Solscan <ExternalLink className="h-3 w-3" />
                              </a>
                              <a 
                                href={`https://explorer.solana.com/tx/${convertSignatureToBase58(capsule.metadata.mintSignature)}?cluster=devnet`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium text-green-600 hover:underline flex items-center gap-1 text-xs"
                              >
                                Explorer <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          </div>
                          <div className="bg-gray-800 border border-gray-700 p-2 rounded text-xs font-mono break-all text-gray-300">
                            {convertSignatureToBase58(capsule.metadata.mintSignature)}
                          </div>
                        </div>
                      )}
                      
                      {/* Transaction verification info */}
                      <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                        <h4 className="text-sm font-semibold text-blue-800 mb-2">Verification Guide</h4>
                        <p className="text-xs text-blue-700 mb-2">
                          To verify this cNFT on blockchain explorers, use the transaction signature above.
                        </p>
                        <div className="text-xs text-blue-600">
                          • <strong>Transaction:</strong> Shows the mint transaction details<br/>
                          • <strong>Tree Address:</strong> Shows the Merkle tree containing your cNFT<br/>
                          • cNFTs are stored in compressed format in Merkle trees, not as individual accounts
                        </div>
                      </div>
                      
                      {/* Merkle Tree Address */}
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Tree Address:</span>
                          <button
                            onClick={() => {
                              const treeAddress = process.env.NEXT_PUBLIC_MERKLE_TREE_ADDRESS || '2HrpJ9aJ55syANL4YfknaDDsnTX7GiGCU8Rq9FpABJ9j';
                              navigator.clipboard.writeText(treeAddress);
                              toast.success('Tree address copied to clipboard!');
                            }}
                            className="text-blue-600 hover:underline text-xs"
                            title="Click to copy Merkle Tree Address"
                          >
                            Copy Address
                          </button>
                        </div>
                        <div className="bg-gray-800 border border-gray-700 p-2 rounded text-xs font-mono break-all text-gray-300">
                          {process.env.NEXT_PUBLIC_MERKLE_TREE_ADDRESS || '2HrpJ9aJ55syANL4YfknaDDsnTX7GiGCU8Rq9FpABJ9j'}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {capsule.metadata?.mintSignature && (
                        <Button
                          variant="outline"
                          onClick={() => window.open(`https://solscan.io/tx/${convertSignatureToBase58(capsule.metadata!.mintSignature)}?cluster=devnet`, '_blank')}
                          className="flex-1"
                          size="sm"
                        >
                          <ExternalLink className="mr-1 h-3 w-3" />
                          Solscan
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        onClick={() => {
                          const treeAddress = process.env.NEXT_PUBLIC_MERKLE_TREE_ADDRESS || '2HrpJ9aJ55syANL4YfknaDDsnTX7GiGCU8Rq9FpABJ9j';
                          const solscanUrl = `https://solscan.io/account/${treeAddress}?cluster=devnet`;
                          window.open(solscanUrl, '_blank');
                        }}
                        className="flex-1"
                        size="sm"
                      >
                        <ExternalLink className="mr-1 h-3 w-3" />
                        View Tree
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowNFTViewer(null)}
                        className="flex-1"
                        size="sm"
                      >
                        Close
                      </Button>
                    </div>
                  </>
                );
              })()}
            </CardContent>
          </Card>
        </div>
      )}

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