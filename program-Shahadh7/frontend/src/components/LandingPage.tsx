'use client';

import { HeroSection } from '@/components/HeroSection';
import { FeaturesGrid } from '@/components/FeaturesGrid';
import { BentoGrid } from '@/components/BentoGrid';

export function LandingPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-6xl mx-auto text-center">
        <HeroSection />
        <FeaturesGrid />
        <BentoGrid />
      </div>
    </div>
  );
} 