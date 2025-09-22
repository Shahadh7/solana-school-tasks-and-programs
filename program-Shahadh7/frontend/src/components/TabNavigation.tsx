'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CapsuleMinter } from '@/components/CapsuleMinter';
import { MyCapsules } from '@/components/MyCapsules';

export function TabNavigation() {
  const [activeTab, setActiveTab] = useState<'create' | 'my-capsules'>('create');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleTabChange = (tab: 'create' | 'my-capsules') => {
    setActiveTab(tab);
    if (tab === 'my-capsules') {
      setRefreshTrigger(prev => prev + 1);
    }
  };

  const handleCapsuleCreated = () => {
    setRefreshTrigger(prev => prev + 1);
    setTimeout(() => {
      setActiveTab('my-capsules');
    }, 2000);
  };

  return (
    <div className="container mx-auto px-3 md:px-4 md:py-6 lg:py-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex space-x-1 md:space-x-2 bg-black/20 backdrop-blur-xl border border-white/10 p-1 md:p-2 rounded-xl md:rounded-2xl mb-8 lg:mb-12">
          <Button
            variant={activeTab === 'create' ? 'default' : 'ghost'}
            onClick={() => handleTabChange('create')}
            className={`flex-1 h-10 md:h-12 lg:h-14 text-sm md:text-base lg:text-lg font-semibold rounded-lg md:rounded-xl transition-all duration-300 ${
              activeTab === 'create' 
                ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-black shadow-lg shadow-amber-400/25' 
                : 'text-gray-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="hidden sm:inline">Create Capsule</span>
            <span className="sm:hidden">Create</span>
          </Button>
          <Button
            variant={activeTab === 'my-capsules' ? 'default' : 'ghost'}
            onClick={() => handleTabChange('my-capsules')}
            className={`flex-1 h-10 md:h-12 lg:h-14 text-sm md:text-base lg:text-lg font-semibold rounded-lg md:rounded-xl transition-all duration-300 ${
              activeTab === 'my-capsules' 
                ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-black shadow-lg shadow-amber-400/25' 
                : 'text-gray-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="hidden sm:inline">My Capsules</span>
            <span className="sm:hidden">My</span>
          </Button>
        </div>

        {activeTab === 'create' && <CapsuleMinter onCapsuleCreated={handleCapsuleCreated} />}
        {activeTab === 'my-capsules' && <MyCapsules key={refreshTrigger} />}
      </div>
    </div>
  );
} 