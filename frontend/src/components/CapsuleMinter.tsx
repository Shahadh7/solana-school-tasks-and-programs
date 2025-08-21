'use client';

import { useState, useCallback, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Calendar, FileImage, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import { format } from 'date-fns';
import { WebSocketStatus } from '@/components/WebSocketStatus';
import { ipfsService } from '@/services/ipfs';

export function CapsuleMinter() {
  const { connected, publicKey } = useWallet();
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
    maxSize: 10 * 1024 * 1024, // 10MB
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

    try {
      setMintingState({ isLoading: true, status: 'uploading', progress: 0 });

      // 1) Upload image to IPFS
      const imageFile = formData.image!;
      const imageUpload = await ipfsService.uploadFileWithProgress(imageFile, (p) => {
        const mapped = Math.min(70, Math.max(0, Math.round(p.percentage * 0.7)));
        setMintingState({ status: 'uploading', progress: mapped });
      });

      const imageCid = imageUpload.IpfsHash;
      const imageUrl = imageUpload.url || ipfsService.getIPFSUrl(imageCid);

      // 2) Upload metadata JSON
      const creatorAddress = publicKey.toBase58();
      const metadataObject = ipfsService.createNFTMetadata({
        name: formData.name,
        description: formData.description,
        imageCidOrHash: imageCid,
        unlockDate: new Date(formData.unlockDate),
        attributes: [
          { trait_type: 'Category', value: 'Personal Memory' },
          { trait_type: 'Created', value: format(new Date(), 'yyyy-MM-dd') },
        ],
        creatorAddress,
        mimeType: imageFile.type || 'image/png',
        externalUrl: 'https://dearfuture.app',
      });

      const safeName = formData.name.trim().replace(/[^\w\-]+/g, '_').slice(0, 50) || 'capsule';
      const metadataUpload = await ipfsService.uploadJSON(metadataObject, `${safeName}.json`);

      setMintingState({ status: 'uploading', progress: 90 });

      const metadataCid = metadataUpload.IpfsHash;
      const metadataUri = ipfsService.getIPFSUrl(metadataCid);

      // 3) Save capsule locally (no NFT minting)
      addCapsule({
        id: crypto.randomUUID(),
        mint: null, // no NFT mint
        name: formData.name,
        description: formData.description,
        imageUrl,
        unlockDate: new Date(formData.unlockDate),
        createdAt: new Date(),
        owner: creatorAddress,
        isLocked: new Date(formData.unlockDate) > new Date(),
        metadata: {
          uri: metadataUri,
          imageUrl,
          cid: metadataCid,
          raw: metadataObject,
        },
      });

      setMintingState({ status: 'success', progress: 100 });

      // Reset form
      setFormData({ name: '', description: '', unlockDate: '', image: null });
      setPreviewUrl('');
    } catch (error) {
      console.error('Capsule creation error:', error);
      setMintingState({
        status: 'error',
        progress: 0,
        error: error instanceof Error ? error.message : 'Failed to create capsule',
      });
    }
  };

  const resetMintingState = () => {
    resetMinting();
  };

  if (minting.status === 'success') {
    return (
      <Card className="max-w-2xl mx-auto mx-4 md:mx-auto">
        <CardHeader className="text-center p-4 md:p-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <CardTitle className="text-green-600">Capsule Created Successfully!</CardTitle>
          <CardDescription>
            Your memory capsule has been saved with IPFS metadata
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <Button onClick={resetMintingState} className="w-full">
            Create Another Capsule
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4 md:space-y-6 px-4 md:px-0">
      <Card>
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="text-lg md:text-xl lg:text-2xl">Create Memory Capsule</CardTitle>
          <CardDescription className="text-sm md:text-base">
            Upload an image and create a time-locked memory capsule (stored on IPFS)
          </CardDescription>
          <div className="mt-3">
            <WebSocketStatus />
          </div>
        </CardHeader>
        <CardContent className="space-y-4 md:space-y-6 p-4 md:p-6">
          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium mb-2">Memory Image</label>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20'
                  : 'border-gray-300 hover:border-amber-400'
              }`}
            >
              <input {...getInputProps()} />
              {previewUrl ? (
                <div className="space-y-4">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="max-w-full max-h-48 mx-auto rounded-lg"
                  />
                  <p className="text-sm text-gray-600">Click or drag to replace image</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <FileImage className="w-12 h-12 mx-auto text-gray-400" />
                  <div>
                    <p className="text-lg font-medium">
                      {isDragActive ? 'Drop your image here' : 'Upload your memory'}
                    </p>
                    <p className="text-sm text-gray-600">
                      Drag & drop or click to select (Max 10MB, JPG/PNG/GIF/WebP)
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Capsule Name */}
          <div>
            <label className="block text-sm font-medium mb-2">Capsule Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Give your memory a meaningful name..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              maxLength={50}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe this memory and why it's special..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              maxLength={500}
            />
          </div>

          {/* Unlock Date */}
          <div>
            <label className="block text-sm font-medium mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Unlock Date
            </label>
            <input
              type="datetime-local"
              value={formData.unlockDate}
              onChange={(e) => handleInputChange('unlockDate', e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-600 mt-1">
              This memory will be locked until the specified date and time
            </p>
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <h4 className="text-red-800 dark:text-red-200 font-medium">Please fix the following issues:</h4>
                  <ul className="text-red-700 dark:text-red-300 text-sm mt-1 space-y-1">
                    {errors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Progress */}
          {minting.isLoading && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <Loader2 className="w-5 h-5 text-amber-600 animate-spin" />
                <div className="flex-1">
                  <p className="text-amber-800 dark:text-amber-200 font-medium">
                    {minting.status === 'uploading' && 'Uploading to IPFS...'}
                  </p>
                  <div className="w-full bg-amber-200 dark:bg-amber-800 rounded-full h-2 mt-2">
                    <div
                      className="bg-amber-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${minting.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Submit */}
          <Button
            onClick={handleCreateCapsule}
            disabled={!mounted || !connected || minting.isLoading}
            className="w-full bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-yellow-700"
            size="lg"
          >
            {minting.isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating Capsule...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Create Memory Capsule
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
