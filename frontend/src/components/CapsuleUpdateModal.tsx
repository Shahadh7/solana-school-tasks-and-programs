'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, Edit3, Loader2, X, AlertCircle, CheckCircle, Upload, Image as ImageIcon } from 'lucide-react';
import { Capsule } from '@/stores/appStore';
import { solanaService } from '@/services/solana';
import { useWallet } from '@solana/wallet-adapter-react';
import toast from 'react-hot-toast';
import { useDropzone } from 'react-dropzone';
import { ipfsService } from '@/services/ipfs';
import { encryptionService } from '@/services/encryption';

interface CapsuleUpdateModalProps {
  capsule: Capsule | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export function CapsuleUpdateModal({ capsule, isOpen, onClose, onUpdate }: CapsuleUpdateModalProps) {
  const { publicKey, signTransaction, signMessage } = useWallet();
  const [isUpdating, setIsUpdating] = useState(false);
  const [formData, setFormData] = useState({
    newContent: '',
    newUnlockDate: ''
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [newImage, setNewImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  // Hooks must run unconditionally before any early returns
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setNewImage(file);
      setImagePreview(URL.createObjectURL(file));

      setErrors([]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
  });

  if (!isOpen || !capsule || !capsule.isLocked) return null;

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors([]);
  };

  const validateForm = (): boolean => {
    const newErrors: string[] = [];

    if (!formData.newContent && !formData.newUnlockDate && !newImage) {
      newErrors.push('Please select at least one field to update');
    }

    if (formData.newUnlockDate) {
      const newDate = new Date(formData.newUnlockDate);
      const currentUnlockDate = new Date(capsule.unlockDate);
      
      if (newDate <= currentUnlockDate) {
        newErrors.push('New unlock date must be later than the current unlock date');
      }
    }

    if (formData.newContent && formData.newContent.length > 1000) {
      newErrors.push('Content must be 1000 characters or less');
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleUpdate = async () => {
    if (!publicKey || !signTransaction || !signMessage || !validateForm()) return;

    setIsUpdating(true);
    try {
      let encryptedImageUrl: string | undefined;

      if (newImage) {
        setIsUploading(true);
        setUploadProgress(0);
        
        try {
          const imageUpload = await ipfsService.uploadFileWithProgress(newImage, (p) => {
            const mapped = Math.min(70, Math.max(0, Math.round(p.percentage * 0.7)));
            setUploadProgress(mapped);
          });

          const pinataUrl = ipfsService.getIPFSUrl(imageUpload.IpfsHash);
          setUploadProgress(75);

          const unlockTimestamp = Math.floor(new Date(capsule.unlockDate).getTime() / 1000);
          const encryptedData = await encryptionService.encryptPinataUrl(
            pinataUrl,
            publicKey,
            capsule.name,
            unlockTimestamp,
            publicKey.toString()
          );

          encryptedImageUrl = encryptedData.encryptedUrl;
          setUploadProgress(100);
          
          toast.success('🖼️ Image uploaded and encrypted successfully!', {
            duration: 3000,
          });
        } catch (error) {
          console.error('Error uploading/encrypting image:', error);
          toast.error('❌ Failed to upload/encrypt image. Please try again.');
          setIsUpdating(false);
          setIsUploading(false);
          return;
        } finally {
          setIsUploading(false);
        }
      }

      const newUnlockDate = formData.newUnlockDate 
        ? Math.floor(new Date(formData.newUnlockDate).getTime() / 1000)
        : undefined;

      await solanaService.updateCapsule(
        {
          publicKey,
          signTransaction: signTransaction!,
          signMessage: signMessage!
        },
        capsule.id,
        formData.newContent || undefined,
        newUnlockDate,
        encryptedImageUrl || undefined,
        false
      );

      toast.success('🎉 Capsule updated successfully!', {
        duration: 4000,
      });

      setFormData({
        newContent: '',
        newUnlockDate: ''
      });
      setNewImage(null);
      setImagePreview('');
      setUploadProgress(0);

      onUpdate();
      onClose();

    } catch (error) {
      console.error('Error updating capsule:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`❌ Failed to update capsule: ${errorMessage}`, {
        duration: 5000,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleClose = () => {
    if (!isUpdating) {
      setFormData({
        newContent: '',
        newUnlockDate: ''
      });
      setErrors([]);
      setNewImage(null);
      setImagePreview('');
      setUploadProgress(0);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="bg-gradient-to-br from-black/40 via-black/20 to-amber-950/20 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] border border-amber-400/30 backdrop-blur-xl overflow-hidden">
        <div className="relative">
          <div className="p-6 pb-4 border-b border-gray-700/30">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <Edit3 className="h-6 w-6 text-amber-400" />
                  Update Locked Capsule
                </h2>
                <p className="text-sm text-gray-400">
                  Update &quot;{capsule.name}&quot; - Only locked capsules can be updated
                </p>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleClose}
                disabled={isUpdating}
                className="text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded-full w-8 h-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

                      <div className="p-8 space-y-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            <div className="bg-white/5 rounded-2xl p-6 border border-amber-400/20">
              <h4 className="font-bold text-white mb-4 flex items-center gap-3">
                <div className="w-3 h-3 bg-amber-400 rounded-full"></div>
                Current Capsule Details
              </h4>
              <div className="mb-4 p-3 bg-amber-500/10 rounded-xl border border-amber-400/20">
                <p className="text-sm text-amber-200">
                  <strong>Note:</strong> Capsules can only be updated while they are locked. Once unlocked, the content becomes permanent and cannot be modified.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Name:</span>
                  <span className="text-white ml-2 font-medium">{capsule.name}</span>
                </div>
                <div>
                  <span className="text-gray-400">Current Unlock Date:</span>
                  <span className="text-white ml-2 font-medium">
                    {new Date(capsule.unlockDate).toLocaleDateString()}
                  </span>
                </div>
                <div className="md:col-span-2">
                  <span className="text-gray-400">Description:</span>
                  <span className="text-white ml-2 font-medium">{capsule.description}</span>
                </div>
              </div>
            </div>

            {}
            <div className="space-y-3">
              <label className="text-base font-semibold text-white flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-amber-400" />
                Update Capsule Image
              </label>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                  isDragActive ? 'border-amber-400 bg-amber-400/10' : 'border-amber-400/30 hover:border-amber-400/60'
                }`}
              >
                <input {...getInputProps()} />
                {imagePreview ? (
                  <div className="space-y-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imagePreview} alt="Preview" className="mx-auto max-h-32 rounded-lg" />
                    <p className="text-sm text-amber-300">Click to change image</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setNewImage(null);
                        setImagePreview('');
                      }}
                      className="bg-red-500/10 hover:bg-red-500/20 border-red-400/30 hover:border-red-400/60 text-red-300 hover:text-red-200"
                    >
                      Remove Image
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Upload className="mx-auto h-8 w-8 text-amber-400" />
                    <p className="text-sm text-amber-300">
                      {isDragActive ? 'Drop the image here' : 'Drag & drop an image, or click to select'}
                    </p>
                    <p className="text-xs text-gray-400">PNG, JPG, GIF up to 10MB</p>
                  </div>
                )}
              </div>
              
              {isUploading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-amber-300">Uploading and encrypting image...</span>
                    <span className="text-white">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-amber-400 to-orange-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-base font-semibold text-white flex items-center gap-2">
                  <Edit3 className="h-4 w-4 text-amber-400" />
                  Update Description
                </label>
                <textarea
                  value={formData.newContent}
                  onChange={(e) => handleInputChange('newContent', e.target.value)}
                  placeholder="Enter new description (optional)"
                  rows={3}
                  className="w-full px-4 py-3 border border-amber-400/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400/60 bg-white/5 text-white placeholder-gray-400 transition-all duration-300"
                />
                <p className="text-xs text-gray-400">
                  Leave empty to keep current description. Max 1000 characters.
                </p>
              </div>

              <div className="space-y-3">
                <label className="text-base font-semibold text-white flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-amber-400" />
                  Extend Unlock Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="datetime-local"
                    value={formData.newUnlockDate}
                    onChange={(e) => handleInputChange('newUnlockDate', e.target.value)}
                    className="w-full pl-10 pr-3 py-3 border border-amber-400/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400/60 bg-white/5 text-white transition-all duration-300"
                  />
                </div>
                <p className="text-xs text-gray-400">
                  New date must be later than current unlock date. Leave empty to keep current date.
                </p>
              </div>


            </div>

            {errors.length > 0 && (
              <div className="space-y-2">
                {errors.map((error, index) => (
                  <div key={index} className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 p-3 rounded-xl border border-red-500/20">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-4 pt-6">
              <Button
                onClick={handleUpdate}
                disabled={isUpdating || isUploading}
                className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 py-3 rounded-xl font-semibold"
              >
                {isUpdating || isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isUploading ? 'Uploading & Encrypting...' : 'Updating...'}
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Update Capsule
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isUpdating}
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
}
