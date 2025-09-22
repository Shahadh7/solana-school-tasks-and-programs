'use client';

export function HeroSection() {
  return (
    <div className="mb-16 relative">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-96 h-96 bg-gradient-to-r from-amber-400/20 via-yellow-500/20 to-orange-400/20 rounded-full blur-3xl"></div>
      </div>
      <div className="relative z-10">
        <h1 className="text-5xl md:text-7xl font-black mb-8 crypto-text-gradient leading-tight">
          Time-Locked Capsules
          <br />
          <span className="text-white">for Your Memories</span>
        </h1>
        <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
          Securely upload images, seal them in <span className="text-amber-400 font-semibold"> blockchain-powered capsules</span>. 
          unlock at the right moment, and mint them as<span className="text-yellow-400 font-semibold"><br /> compressed NFTs </span> 
          on Solana.
        </p>
      </div>
    </div>
  );
} 