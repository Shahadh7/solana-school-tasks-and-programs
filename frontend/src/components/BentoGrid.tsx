'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Upload, Zap } from 'lucide-react';

export function BentoGrid() {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="text-center mb-16">
        <h2 className="text-4xl md:text-6xl font-black mb-6 crypto-text-gradient">Ready to Start?</h2>
        <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
          Connect your Solana wallet and create your first time-locked memory capsule in just four simple steps
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-6 md:gap-8 auto-rows-[minmax(200px,auto)]">
        
        <Card className="md:col-span-4 lg:col-span-3 md:row-span-2 group relative overflow-hidden border-white/10 bg-gradient-to-br from-black/40 via-black/20 to-amber-950/20 backdrop-blur-xl hover:border-amber-400/60 transition-all duration-700 hover:shadow-2xl hover:shadow-amber-400/30">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-400/15 via-yellow-500/10 to-orange-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
          <div className="absolute top-4 right-4 w-24 h-24 bg-gradient-to-br from-amber-400/20 to-yellow-500/20 rounded-full blur-2xl"></div>
          <CardContent className="p-8 md:p-10 relative z-10 h-full flex flex-col justify-center">
            <div className="flex items-start gap-8">
              <div className="flex-shrink-0">
                <div className="w-24 h-24 bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-500 text-black rounded-3xl flex items-center justify-center text-4xl font-black shadow-2xl shadow-amber-400/40 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                  1
                </div>
              </div>
              <div className="flex-1 pt-2">
                <h3 className="text-3xl md:text-4xl font-black text-white mb-4 leading-tight">Connect Your Wallet</h3>
                <p className="text-gray-300 text-lg md:text-xl leading-relaxed mb-6">
                  Link your Phantom, Solflare, or any Solana-compatible wallet to unlock the power of blockchain-based memory preservation
                </p>
                <div className="flex flex-wrap gap-3">
                  <div className="px-4 py-2 bg-amber-400/20 border border-amber-400/30 rounded-full text-amber-300 text-sm font-medium">
                    Phantom
                  </div>
                  <div className="px-4 py-2 bg-amber-400/20 border border-amber-400/30 rounded-full text-amber-300 text-sm font-medium">
                    Solflare
                  </div>
                  <div className="px-4 py-2 bg-amber-400/20 border border-amber-400/30 rounded-full text-amber-300 text-sm font-medium">
                    WalletConnect
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 lg:col-span-3 md:row-span-1 group relative overflow-hidden border-white/10 bg-gradient-to-br from-black/40 via-black/20 to-yellow-950/20 backdrop-blur-xl hover:border-yellow-400/60 transition-all duration-700 hover:shadow-2xl hover:shadow-yellow-400/30">
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/15 via-yellow-500/10 to-amber-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
          <div className="absolute bottom-4 left-4 w-20 h-20 bg-gradient-to-br from-yellow-400/30 to-amber-500/20 rounded-full blur-2xl"></div>
          <CardContent className="p-6 md:p-8 relative z-10 h-full">
            <div className="flex items-center gap-6 mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 via-yellow-500 to-amber-500 text-black rounded-2xl flex items-center justify-center text-2xl font-black shadow-xl shadow-yellow-400/40 group-hover:scale-110 transition-transform duration-500">
                2
              </div>
              <h3 className="text-2xl md:text-3xl font-black text-white">Upload Memory</h3>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10 group-hover:border-yellow-400/30 transition-colors duration-500">
                <div className="flex items-center justify-center gap-3">
                  <Upload className="w-6 h-6 text-yellow-400" />
                  <span className="text-gray-200 font-medium">Drag & drop photos</span>
                </div>
              </div>
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10 group-hover:border-yellow-400/30 transition-colors duration-500 text-center">
                <span className="text-gray-200 font-medium">Add description & story</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 lg:col-span-3 md:row-span-1 group relative overflow-hidden border-white/10 bg-gradient-to-br from-black/40 via-black/20 to-orange-950/20 backdrop-blur-xl hover:border-orange-400/60 transition-all duration-700 hover:shadow-2xl hover:shadow-orange-400/30">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-400/15 via-orange-500/10 to-red-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
          <div className="absolute top-4 right-4 w-20 h-20 bg-gradient-to-br from-orange-400/30 to-red-500/20 rounded-full blur-2xl"></div>
          <CardContent className="p-6 md:p-8 relative z-10 h-full">
            <div className="flex items-center gap-6 mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-400 via-orange-500 to-red-500 text-black rounded-2xl flex items-center justify-center text-2xl font-black shadow-xl shadow-orange-400/40 group-hover:scale-110 transition-transform duration-500">
                3
              </div>
              <h3 className="text-2xl md:text-3xl font-black text-white">Time Lock & Mint</h3>
            </div>
            <p className="text-gray-300 text-base md:text-lg mb-4 leading-relaxed">
              Set your unlock date and mint as a compressed NFT
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-orange-400/20 border border-orange-400/30 text-orange-300 rounded-full text-sm font-medium">Time Lock</span>
              <span className="px-3 py-1 bg-orange-400/20 border border-orange-400/30 text-orange-300 rounded-full text-sm font-medium">Compressed NFT</span>
              <span className="px-3 py-1 bg-orange-400/20 border border-orange-400/30 text-orange-300 rounded-full text-sm font-medium">Low Cost</span>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-3 group relative overflow-hidden border-white/10 bg-gradient-to-br from-black/40 via-black/20 to-emerald-950/20 backdrop-blur-xl hover:border-emerald-400/60 transition-all duration-700 hover:shadow-2xl hover:shadow-emerald-400/30">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/15 via-green-500/10 to-lime-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
          <CardContent className="p-6 md:p-8 relative z-10 h-full flex flex-col justify-center text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 via-green-500 to-lime-500 text-black rounded-2xl flex items-center justify-center text-2xl font-black shadow-xl shadow-emerald-400/40 mx-auto mb-6 group-hover:scale-110 transition-transform duration-500">
              4
            </div>
            <h3 className="text-xl md:text-2xl font-black text-white mb-4">Share & Deliver</h3>
            <p className="text-gray-300 text-sm md:text-base mb-6 leading-relaxed">
              Transfer to loved ones or keep for your future self
            </p>
            <div className="flex justify-center">
              <div className="flex -space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full border-3 border-black shadow-lg"></div>
                <div className="w-10 h-10 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full border-3 border-black shadow-lg"></div>
                <div className="w-10 h-10 bg-gradient-to-r from-orange-400 to-red-500 rounded-full border-3 border-black shadow-lg"></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 lg:col-span-3 group relative overflow-hidden border-amber-400/30 bg-gradient-to-br from-amber-950/40 via-yellow-950/30 to-orange-950/40 backdrop-blur-xl hover:border-amber-400/80 transition-all duration-700 hover:shadow-2xl hover:shadow-amber-400/40">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-400/20 via-yellow-500/15 to-orange-400/20 opacity-50 group-hover:opacity-80 transition-opacity duration-700"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(245,158,11,0.1),transparent_70%)]"></div>
          <CardContent className="p-6 md:p-8 relative z-10 h-full flex flex-col justify-center items-center text-center">
            <div className="mb-6">
              <Zap className="w-16 h-16 text-amber-400 mx-auto mb-4 group-hover:scale-110 group-hover:rotate-12 transition-all duration-500" />
              <h3 className="text-2xl md:text-3xl font-black text-white mb-3">Start Your Journey</h3>
              <p className="text-amber-100 text-sm md:text-base leading-relaxed">
                Use the wallet button above to connect and begin preserving memories
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 