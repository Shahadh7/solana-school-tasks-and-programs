'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Clock, Shield, Zap } from 'lucide-react';

export function FeaturesGrid() {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
      <Card className="group relative overflow-hidden border-white/10 bg-black/20 backdrop-blur-xl hover:border-amber-400/50 transition-all duration-500 hover:shadow-lg hover:shadow-amber-400/25">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <CardHeader className="text-center relative z-10">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-400/20 to-amber-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
            <Upload className="w-8 h-8 text-amber-400" />
          </div>
          <CardTitle className="text-xl text-white">Upload Memories</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription className="text-gray-300 leading-relaxed">
            Upload your precious photos and create personalized memory capsules
          </CardDescription>
        </CardContent>
      </Card>

      <Card className="group relative overflow-hidden border-white/10 bg-black/20 backdrop-blur-xl hover:border-yellow-400/50 transition-all duration-500 hover:shadow-lg hover:shadow-yellow-400/25">
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <CardHeader className="text-center relative z-10">
          <div className="w-16 h-16 bg-gradient-to-br from-yellow-400/20 to-yellow-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
            <Clock className="w-8 h-8 text-yellow-400" />
          </div>
          <CardTitle className="text-xl text-white">Time Lock</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription className="text-gray-300 leading-relaxed">
            Set future unlock dates for your memories to be revealed at the perfect moment in time
          </CardDescription>
        </CardContent>
      </Card>

      <Card className="group relative overflow-hidden border-white/10 bg-black/20 backdrop-blur-xl hover:border-orange-400/50 transition-all duration-500 hover:shadow-lg hover:shadow-orange-400/25">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <CardHeader className="text-center relative z-10">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-400/20 to-orange-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
            <Shield className="w-8 h-8 text-orange-400" />
          </div>
          <CardTitle className="text-xl text-white">Secure Storage</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription className="text-gray-300 leading-relaxed">
            Your memories are stored securely on IPFS and preserved immutably on the Solana blockchain
          </CardDescription>
        </CardContent>
      </Card>

      <Card className="group relative overflow-hidden border-white/10 bg-black/20 backdrop-blur-xl hover:border-lime-400/50 transition-all duration-500 hover:shadow-lg hover:shadow-lime-400/25">
        <div className="absolute inset-0 bg-gradient-to-br from-lime-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <CardHeader className="text-center relative z-10">
          <div className="w-16 h-16 bg-gradient-to-br from-lime-400/20 to-lime-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
            <Zap className="w-8 h-8 text-lime-400" />
          </div>
          <CardTitle className="text-xl text-white">Compressed NFTs</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription className="text-gray-300 leading-relaxed">
            Mint your memories as compressed NFTs using Metaplex Bubblegum for ultra-low costs
          </CardDescription>
        </CardContent>
      </Card>
    </div>
  );
} 