import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { WalletContextProvider } from "@/contexts/WalletContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Navigation } from "@/components/Navigation";
import Image from "next/image";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DearFuture Web3 - Decentralized Memory Locker",
  description: "Store your memories as NFTs on Solana. Create time-locked digital capsules that unlock in the future.",
  keywords: ["NFT", "Solana", "Memory", "Time Capsule", "Web3", "IPFS"],
  authors: [{ name: "DearFuture Team" }],
  openGraph: {
    title: "DearFuture Web3 - Decentralized Memory Locker",
    description: "Store your memories as NFTs on Solana. Create time-locked digital capsules that unlock in the future.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}
        suppressHydrationWarning={true}
      >
        <ErrorBoundary>
          <WalletContextProvider>
            <div className="min-h-screen flex flex-col">
              <Navigation />
              
              <main className="flex-1">
                {children}
              </main>
              
              <footer className="border-t border-white/10 bg-black/20 backdrop-blur-xl py-8">
                <div className="container mx-auto px-6 text-center">
                  <div className="flex items-center justify-center space-x-2 mb-4">
                    <div className="w-6 h-6 bg-gradient-to-r from-amber-400 to-yellow-500 rounded-lg flex items-center justify-center p-0.5">
                      <Image 
                        src="/logo.svg" 
                        alt="DearFuture Web3 Logo" 
                        width={24}
                        height={24}
                        className="w-full h-full object-contain"
                        priority
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-300">DearFuture Web3</span>
                  </div>
                  <p className="text-sm text-gray-400 font-mono">© 2025 DearFuture Web3. Decentralized memory preservation on Solana.</p>
                  <div className="mt-4 flex items-center justify-center space-x-6 text-xs text-gray-500">
                    <span>Built on Solana</span>
                    <span>•</span>
                    <span>Powered by IPFS</span>
                    <span>•</span>
                    <span>Compressed NFTs</span>
                  </div>
                </div>
              </footer>
            </div>
          </WalletContextProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
