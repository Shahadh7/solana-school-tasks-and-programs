'use client';

import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface FullscreenImageOverlayProps {
  imageUrl: string;
  onClose: () => void;
}

export function FullscreenImageOverlay({ imageUrl, onClose }: FullscreenImageOverlayProps) {
  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="relative max-w-5xl max-h-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt="Fullscreen view"
          className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 border-white/30 text-white hover:border-white/60 transition-all duration-300"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default FullscreenImageOverlay;

