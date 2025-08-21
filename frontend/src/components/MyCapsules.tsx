'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Calendar, Lock, Unlock, Share2, Send, Eye } from 'lucide-react';
import { useAppStore, Capsule } from '@/stores/appStore';
// Removed unused import: nftService
import { formatDate, formatDatetime } from '@/lib/utils';
import { getDummyCapsules } from '@/lib/dummyData';

export function MyCapsules() {
  const { connected, publicKey } = useWallet();
  const { userCapsules, setUserCapsules } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [selectedCapsule, setSelectedCapsule] = useState<Capsule | null>(null);

  useEffect(() => {
    if (connected && publicKey) {
      loadUserCapsules();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, publicKey]);

  const loadUserCapsules = async () => {
    if (!publicKey) return;
    
    setLoading(true);
    try {
      // Using dummy data for now to demonstrate the full application flow
      // TODO: Replace with actual blockchain data fetching
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate loading
      const dummyCapsules = getDummyCapsules(publicKey.toString());
      setUserCapsules(dummyCapsules);
    } catch (error) {
      console.error('Error loading capsules:', error);
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
    // TODO: Implement sharing functionality
    navigator.clipboard.writeText(`Check out my memory capsule: ${capsule.name}`);
    alert('Share link copied to clipboard!');
  };

  const handleTransferCapsule = (_capsule: Capsule) => {
    // TODO: Implement transfer functionality
    alert('Transfer functionality coming soon!');
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
        <CardContent className="text-center py-6 md:py-8 p-4 md:p-6">
          <div className="animate-spin w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full mx-auto"></div>
        </CardContent>
      </Card>
    );
  }

  if (userCapsules.length === 0) {
    return (
      <Card className="max-w-2xl mx-auto mx-4 md:mx-auto">
        <CardHeader className="text-center p-4 md:p-6">
          <div className="w-12 md:w-16 h-12 md:h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-6 md:w-8 h-6 md:h-8 text-gray-400" />
          </div>
          <CardTitle className="text-lg md:text-xl">No Memory Capsules Yet</CardTitle>
          <CardDescription className="text-sm md:text-base">
            You haven&apos;t created any memory capsules yet. Start by creating your first one!
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center p-4 md:p-6">
          <Button 
            onClick={() => window.location.href = '#create'}
            className="bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-yellow-700 w-full sm:w-auto"
          >
            Create Your First Capsule
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 px-4 md:px-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold">My Memory Capsules</h2>
          <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
            {userCapsules.length} capsule{userCapsules.length !== 1 ? 's' : ''} created
          </p>
        </div>
        <Button onClick={loadUserCapsules} variant="outline" size="sm">
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {userCapsules.map((capsule) => {
          const unlocked = isUnlocked(capsule.unlockDate);
          const timeUntilUnlock = getTimeUntilUnlock(capsule.unlockDate);

          return (
            <Card 
              key={capsule.id} 
              className={`relative overflow-hidden transition-all duration-200 hover:shadow-lg ${
                unlocked ? 'border-lime-200 hover:border-lime-300' : 'border-amber-200 hover:border-amber-300'
              }`}
            >
              <div className="relative">
                <img
                  src={capsule.imageUrl}
                  alt={capsule.name}
                  className={`w-full h-48 object-cover ${
                    !unlocked ? 'filter blur-sm' : ''
                  }`}
                />
                <div className={`absolute inset-0 flex items-center justify-center ${
                  !unlocked ? 'bg-black/50' : ''
                }`}>
                  {!unlocked && (
                    <div className="text-center text-white">
                      <Lock className="w-8 h-8 mx-auto mb-2" />
                      <p className="text-sm font-medium">Locked</p>
                      <p className="text-xs">{timeUntilUnlock}</p>
                    </div>
                  )}
                  {unlocked && (
                    <div className="absolute top-2 right-2 bg-lime-500 text-white rounded-full p-1">
                      <Unlock className="w-4 h-4" />
                    </div>
                  )}
                </div>
              </div>

              <CardHeader className="pb-2 p-3 md:p-4">
                <CardTitle className="text-base md:text-lg line-clamp-1">{capsule.name}</CardTitle>
                <CardDescription className="line-clamp-2 text-sm">
                  {capsule.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-2 md:space-y-3 p-3 md:p-4 pt-0">
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <Calendar className="w-4 h-4 mr-2" />
                  <span>
                    {unlocked ? 'Unlocked' : 'Unlocks'} {formatDatetime(capsule.unlockDate)}
                  </span>
                </div>

                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <Clock className="w-4 h-4 mr-2" />
                  <span>Created {formatDate(capsule.createdAt)}</span>
                </div>

                <div className="flex space-x-1 md:space-x-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleViewCapsule(capsule)}
                    className="flex-1 h-8 md:h-9 text-xs md:text-sm"
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    <span className="hidden sm:inline">View</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleShareCapsule(capsule)}
                    className="h-8 md:h-9 px-2 md:px-3"
                  >
                    <Share2 className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleTransferCapsule(capsule)}
                    className="h-8 md:h-9 px-2 md:px-3"
                  >
                    <Send className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Capsule Detail Modal */}
      {selectedCapsule && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto mx-4 md:mx-auto">
            <CardHeader className="p-4 md:p-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="flex-1">
                  <CardTitle className="text-lg md:text-xl lg:text-2xl line-clamp-2">{selectedCapsule.name}</CardTitle>
                  <CardDescription className="text-sm md:text-base mt-1">
                    {isUnlocked(selectedCapsule.unlockDate) ? 'Unlocked Memory' : 'Locked Memory'}
                  </CardDescription>
                </div>
                <Button variant="outline" onClick={handleCloseCapsule} size="sm" className="self-start">
                  ×
                </Button>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4 md:space-y-6 p-4 md:p-6">
              <div className="relative">
                <img
                  src={selectedCapsule.imageUrl}
                  alt={selectedCapsule.name}
                  className={`w-full rounded-lg ${
                    !isUnlocked(selectedCapsule.unlockDate) ? 'filter blur-sm' : ''
                  }`}
                />
                {!isUnlocked(selectedCapsule.unlockDate) && (
                  <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                    <div className="text-center text-white">
                      <Lock className="w-12 h-12 mx-auto mb-4" />
                      <p className="text-lg font-medium">Memory Locked</p>
                      <p className="text-sm">Unlocks in {getTimeUntilUnlock(selectedCapsule.unlockDate)}</p>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-medium mb-2">Description</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {selectedCapsule.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Created:</span>
                  <p className="text-gray-600 dark:text-gray-400">
                    {formatDatetime(selectedCapsule.createdAt)}
                  </p>
                </div>
                <div>
                  <span className="font-medium">Unlock Date:</span>
                  <p className="text-gray-600 dark:text-gray-400">
                    {formatDatetime(selectedCapsule.unlockDate)}
                  </p>
                </div>
              </div>

              <div>
                <span className="font-medium">NFT ID:</span>
                <p className="text-gray-600 dark:text-gray-400 font-mono text-xs break-all">
                  {selectedCapsule.mint}
                </p>
              </div>

              <div className="flex space-x-3">
                <Button
                  onClick={() => handleShareCapsule(selectedCapsule)}
                  variant="outline"
                  className="flex-1"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
                <Button
                  onClick={() => handleTransferCapsule(selectedCapsule)}
                  variant="outline"
                  className="flex-1"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Transfer
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
} 