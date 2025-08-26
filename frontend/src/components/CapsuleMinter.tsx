'use client';

import { useState, useCallback, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Calendar, Loader2, CheckCircle, AlertCircle, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppStore } from '@/stores/appStore';

import { WebSocketStatus } from '@/components/WebSocketStatus';
import { ipfsService } from '@/services/ipfs';
import { solanaService, CapsuleData } from '@/services/solana';
import { encryptionService } from '@/services/encryption';
import { nftService, CNFTMintOptions } from '@/services/nft';

interface CapsuleMinterProps {
  onCapsuleCreated?: () => void;
}

export function CapsuleMinter({ onCapsuleCreated }: CapsuleMinterProps) {
  const { connected, publicKey, signTransaction, signMessage } = useWallet();
  const { minting, setMintingState, resetMinting, addCapsule } = useAppStore();
  const [mounted, setMounted] = useState(false);

  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    unlockDate: string;
    image: File | null;
  }>({
    name: '',
    description: '',
    unlockDate: '',
    image: null,
  });

  const [errors, setErrors] = useState<string[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [showMintPrompt, setShowMintPrompt] = useState(false);
  const [createdCapsule, setCreatedCapsule] = useState<{
    address: string;
    id: number;
    signature: string;
  } | null>(null);
  const [mintAsCompressed, setMintAsCompressed] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setFormData(prev => ({ ...prev, image: file }));
      setPreviewUrl(URL.createObjectURL(file));
      setErrors([]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors([]);
  };

  const validateForm = (): boolean => {
    const newErrors: string[] = [];

    if (!formData.name.trim()) newErrors.push('Capsule name is required');
    if (!formData.description.trim()) newErrors.push('Description is required');
    if (!formData.image) newErrors.push('Image is required');

    if (!formData.unlockDate) {
      newErrors.push('Unlock date is required');
    } else if (new Date(formData.unlockDate) <= new Date()) {
      newErrors.push('Unlock date must be in the future');
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleCreateCapsule = async () => {
    if (!connected || !publicKey || !validateForm()) return;

    if (!signTransaction || !signMessage) {
      console.error('Wallet methods not available');
      alert('Wallet not properly connected. Please reconnect your wallet.');
      return;
    }

    try {
      setMintingState({ isLoading: true, status: 'uploading', progress: 0 });

      const imageFile = formData.image!;
      const imageUpload = await ipfsService.uploadFileWithProgress(imageFile, (p) => {
        const mapped = Math.min(70, Math.max(0, Math.round(p.percentage * 0.7)));
        setMintingState({ status: 'uploading', progress: mapped });
      });

      const pinataUrl = ipfsService.getIPFSUrl(imageUpload.IpfsHash);
      setMintingState({ status: 'encrypting', progress: 75 });

      const unlockTimestamp = Math.floor(new Date(formData.unlockDate).getTime() / 1000);
      const encryptedData = await encryptionService.encryptPinataUrl(
        pinataUrl,
        publicKey,
        formData.name,
        unlockTimestamp,
        publicKey.toString()
      );

      setMintingState({ status: 'minting', progress: 85 });

      const capsuleData: CapsuleData = {
        title: formData.name,
        content: `${formData.description}|IV:${encryptedData.iv}`, // Store description + IV in content field
        unlockDate: unlockTimestamp,
        encryptedImageUrl: encryptedData.encryptedUrl,
        encryptedImageIv: encryptedData.iv
      };

      const result = await solanaService.createCapsule(
        {
          publicKey,
          signTransaction: signTransaction!,
          signMessage: signMessage!
        },
        capsuleData
      );

      setMintingState({ status: 'success', progress: 100 });
      setCreatedCapsule({
        address: result.capsuleAddress,
        id: result.capsuleId,
        signature: result.signature
      });

      addCapsule({
        id: result.capsuleAddress,
        mint: '',
        name: formData.name,
        description: formData.description,
        imageUrl: pinataUrl,
        unlockDate: new Date(formData.unlockDate),
        createdAt: new Date(),
        owner: publicKey.toString(),
        isLocked: true,
        metadata: {
          attributes: [
            { trait_type: 'Category', value: 'Personal Memory' },
            { trait_type: 'Unlock Date', value: formData.unlockDate },
            { trait_type: 'Created At', value: new Date().toISOString() }
          ],
          transactionId: result.signature,
          creator: publicKey.toString()
        }
      });

      toast.success('🎉 Memory capsule created successfully! Switching to My Capsules...', {
        duration: 4000,
      });

      setTimeout(() => {
        resetMinting();
      }, 2000);

      if (onCapsuleCreated) {
        onCapsuleCreated();
      }

    } catch (error) {
      console.error('Error creating capsule:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      toast.error(`❌ Failed to create capsule: ${errorMessage}`, {
        duration: 5000,
      });
      
      setMintingState({ 
        status: 'error', 
        progress: 0, 
        error: errorMessage
      });
    }
  };

  const handleMintCNFT = async () => {
    if (!createdCapsule || !publicKey) return;

    try {
      setMintingState({ isLoading: true, status: 'minting', progress: 0 });

      const mintOptions: CNFTMintOptions = {
        useCompressedNFT: mintAsCompressed,
      };

      const mintResult = await nftService.mintCapsule(
        {
          publicKey,
          signTransaction: signTransaction!,
          signMessage: signMessage!
        },
        {
          name: formData.name,
          description: formData.description,
          image: formData.image!,
          unlockDate: new Date(formData.unlockDate)
        },
        (step, progress) => {
          setMintingState({ status: 'minting', progress });
        },
        mintOptions
      );

      setMintingState({ status: 'success', progress: 100 });
      void mintResult; // prevent unused var warning while preserving future-use semantics

      // NFT minted successfully

      setShowMintPrompt(false);
      setCreatedCapsule(null);

      setFormData({
        name: '',
        description: '',
        unlockDate: '',
        image: null
      });
      setPreviewUrl('');
      resetMinting();

    } catch (error) {
      console.error('Error minting NFT:', error);
      setMintingState({ 
        status: 'error', 
        progress: 0, 
        error: error instanceof Error ? error.message : 'Failed to mint NFT' 
      });
    }
  };

  const handleSkipMint = () => {
    setShowMintPrompt(false);
    setCreatedCapsule(null);
    resetMinting();
    
    
    setFormData({
      name: '',
      description: '',
      unlockDate: '',
      image: null
    });
    setPreviewUrl('');
  };

  if (!mounted) return null;

  if (!connected) {
    return (
      <Card className="max-w-2xl mx-auto mx-4 md:mx-auto">
        <CardHeader className="text-center p-4 md:p-6">
          <CardTitle className="text-lg md:text-xl">Connect Your Wallet</CardTitle>
          <CardDescription className="text-sm md:text-base">
            Please connect your Solana wallet to create memory capsules
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (showMintPrompt && createdCapsule) {
    return (
      <Card className="max-w-2xl mx-auto mx-4 md:mx-auto">
        <CardHeader className="text-center p-4 md:p-6">
          <CardTitle className="text-lg md:text-xl flex items-center justify-center gap-2">
            <CheckCircle className="text-green-500" />
            Capsule Created Successfully!
          </CardTitle>
          <CardDescription className="text-sm md:text-base">
            Your memory capsule &quot;{formData.name}&quot; has been created and stored on Solana.
            <br />
            <span className="text-xs text-gray-500">
              Transaction: {createdCapsule.signature.slice(0, 8)}...{createdCapsule.signature.slice(-8)}
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-4">
              Would you like to mint this capsule as an NFT?
            </p>
            
            {}
            <div className="mb-6 space-y-3">
              <div className="flex items-center justify-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="nftType"
                    checked={mintAsCompressed}
                    onChange={() => setMintAsCompressed(true)}
                    className="text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm">Compressed NFT (cNFT)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="nftType"
                    checked={!mintAsCompressed}
                    onChange={() => setMintAsCompressed(false)}
                    className="text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm">Regular NFT</span>
                </label>
              </div>
              
              {}
              <div className="text-xs text-gray-500 max-w-md mx-auto">
                {mintAsCompressed ? (
                  <p>
                    <strong>Compressed NFT:</strong> Lower cost, stored efficiently in Merkle trees. 
                    Perfect for large collections and memory capsules.
                  </p>
                ) : (
                  <p>
                    <strong>Regular NFT:</strong> Traditional NFT with individual token account. 
                    Higher cost but maximum compatibility.
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-3 justify-center">
              <Button 
                onClick={handleMintCNFT}
                disabled={minting.isLoading}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {minting.isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Minting {mintAsCompressed ? 'cNFT' : 'NFT'}...
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    Mint {mintAsCompressed ? 'cNFT' : 'NFT'}
                  </>
                )}
              </Button>
              <Button 
                variant="outline" 
                onClick={handleSkipMint}
                disabled={minting.isLoading}
              >
                Skip for Now
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto mx-4 md:mx-auto">
      <CardHeader className="text-center p-4 md:p-6">
        <CardTitle className="text-lg md:text-xl">Create Memory Capsule</CardTitle>
        <CardDescription className="text-sm md:text-base">
          Upload an image and write a message to your future self
        </CardDescription>
        <WebSocketStatus />
      </CardHeader>

      <CardContent className="space-y-6 p-4 md:p-6">
        {}
        <div className="space-y-2">
          <label className="text-sm font-medium">Capsule Image</label>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              isDragActive ? 'border-purple-400 bg-purple-50' : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <input {...getInputProps()} />
            {previewUrl ? (
              <div className="space-y-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="Preview" className="mx-auto max-h-32 rounded" />
                <p className="text-sm text-gray-600">Click to change image</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="mx-auto h-8 w-8 text-gray-400" />
                <p className="text-sm text-gray-600">
                  {isDragActive ? 'Drop the image here' : 'Drag & drop an image, or click to select'}
                </p>
                <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
              </div>
            )}
          </div>
        </div>

        {}
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Capsule Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter a name for your capsule"
              maxLength={100}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <div className="flex justify-between items-center mt-1">
              <span className="text-xs text-gray-500">
                {formData.name.length}/100 characters
              </span>
              {formData.name.length > 90 && (
                <span className="text-xs text-amber-600">
                  {formData.name.length > 100 ? '⚠️ Exceeds limit' : '⚠️ Approaching limit'}
                </span>
              )}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Message</label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Write a message to your future self..."
              rows={3}
              maxLength={280}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <div className="flex justify-between items-center mt-1">
              <span className="text-xs text-gray-500">
                {formData.description.length}/280 characters
              </span>
              {formData.description.length > 250 && (
                <span className="text-xs text-amber-600">
                  {formData.description.length > 280 ? '⚠️ Exceeds limit' : '⚠️ Approaching limit'}
                </span>
              )}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Note: The IV will be added automatically, leaving ~264 characters for your message
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Unlock Date</label>
            <div className="mt-1 relative">
              <Calendar className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              <input
                type="datetime-local"
                value={formData.unlockDate}
                onChange={(e) => handleInputChange('unlockDate', e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
        </div>

        {}
        {errors.length > 0 && (
          <div className="space-y-2">
            {errors.map((error, index) => (
              <div key={index} className="flex items-center gap-2 text-red-600 text-sm">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            ))}
          </div>
        )}

        {}
        {minting.isLoading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>
                {minting.status === 'uploading' && 'Uploading to IPFS...'}
                {minting.status === 'encrypting' && 'Encrypting data...'}
                {minting.status === 'minting' && 'Creating capsule on Solana...'}
              </span>
              <span>{minting.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${minting.progress}%` }}
              />
            </div>
          </div>
        )}

        {}
        <div className="flex gap-3">
          <Button
            onClick={handleCreateCapsule}
            disabled={minting.isLoading || !formData.name || !formData.description || !formData.image || !formData.unlockDate}
            className="flex-1 bg-purple-600 hover:bg-purple-700"
          >
            {minting.isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Capsule...
              </>
            ) : (
              <>
                <Lock className="mr-2 h-4 w-4" />
                Create Capsule
              </>
            )}
          </Button>
        </div>

        {}
        {minting.status === 'success' && (
          <div className="flex items-center gap-2 text-green-600 text-sm">
            <CheckCircle className="h-4 w-4" />
            Capsule created successfully! Check your wallet for the transaction.
          </div>
        )}

        {}
        {minting.status === 'error' && minting.error && (
          <div className="flex items-center gap-2 text-red-600 text-sm">
            <AlertCircle className="h-4 w-4" />
            {minting.error}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
