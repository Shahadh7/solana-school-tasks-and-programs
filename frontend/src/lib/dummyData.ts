import { Capsule } from '@/stores/appStore';

// Dummy images from Unsplash for demonstration
const SAMPLE_IMAGES = [
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1541675154750-0444c7d51e8e?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1494783367193-149034c05e8f?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop',
];

export const DUMMY_CAPSULES: Capsule[] = [
  {
    id: 'capsule-001',
    mint: 'mint-address-001',
    name: 'Summer Vacation 2023',
    description: 'A beautiful sunset from our family trip to the mountains. This moment captured the perfect end to an amazing day of hiking and exploring nature together.',
    imageUrl: SAMPLE_IMAGES[0],
    unlockDate: new Date('2025-08-15T18:00:00Z'), // Future date - locked
    createdAt: new Date('2024-08-15T12:00:00Z'),
    owner: 'owner-wallet-address-001',
    isLocked: true,
    metadata: {
      attributes: [
        { trait_type: 'Category', value: 'Family Memory' },
        { trait_type: 'Location', value: 'Mountains' },
        { trait_type: 'Season', value: 'Summer' },
      ],
    },
  },
  {
    id: 'capsule-002',
    mint: 'mint-address-002',
    name: 'Graduation Day',
    description: 'The moment I graduated from university. Years of hard work finally paid off, and I wanted to preserve this milestone forever.',
    imageUrl: SAMPLE_IMAGES[1],
    unlockDate: new Date('2024-06-01T10:00:00Z'), // Past date - unlocked
    createdAt: new Date('2024-05-15T14:30:00Z'),
    owner: 'owner-wallet-address-002',
    isLocked: false,
    metadata: {
      attributes: [
        { trait_type: 'Category', value: 'Achievement' },
        { trait_type: 'Milestone', value: 'Education' },
        { trait_type: 'Year', value: '2024' },
      ],
    },
  },
  {
    id: 'capsule-003',
    mint: 'mint-address-003',
    name: 'First Day at Work',
    description: 'My first day at my dream job. Nervous but excited to start this new chapter of my life. This photo was taken right outside the office building.',
    imageUrl: SAMPLE_IMAGES[2],
    unlockDate: new Date('2026-01-01T09:00:00Z'), // Future date - locked
    createdAt: new Date('2024-09-15T08:45:00Z'),
    owner: 'owner-wallet-address-003',
    isLocked: true,
    metadata: {
      attributes: [
        { trait_type: 'Category', value: 'Career' },
        { trait_type: 'Milestone', value: 'New Job' },
        { trait_type: 'Emotion', value: 'Excitement' },
      ],
    },
  },
  {
    id: 'capsule-004',
    mint: 'mint-address-004',
    name: 'Wedding Anniversary',
    description: 'Celebrating 5 years of marriage with my beloved. This photo was taken during our anniversary dinner at the same restaurant where we had our first date.',
    imageUrl: SAMPLE_IMAGES[3],
    unlockDate: new Date('2024-12-01T19:00:00Z'), // Past date - unlocked
    createdAt: new Date('2024-11-20T19:30:00Z'),
    owner: 'owner-wallet-address-004',
    isLocked: false,
    metadata: {
      attributes: [
        { trait_type: 'Category', value: 'Love' },
        { trait_type: 'Milestone', value: 'Anniversary' },
        { trait_type: 'Years', value: '5' },
      ],
    },
  },
  {
    id: 'capsule-005',
    mint: 'mint-address-005',
    name: 'Baby\'s First Steps',
    description: 'The precious moment when our little one took their first independent steps. We wanted to lock this memory away to share with them when they turn 18.',
    imageUrl: SAMPLE_IMAGES[4],
    unlockDate: new Date('2042-03-15T12:00:00Z'), // Far future - locked
    createdAt: new Date('2024-03-15T15:20:00Z'),
    owner: 'owner-wallet-address-005',
    isLocked: true,
    metadata: {
      attributes: [
        { trait_type: 'Category', value: 'Family' },
        { trait_type: 'Milestone', value: 'First Steps' },
        { trait_type: 'For', value: 'Future Child' },
      ],
    },
  },
  {
    id: 'capsule-006',
    mint: 'mint-address-006',
    name: 'Solo Travel Adventure',
    description: 'My first solo backpacking trip across Europe. This photo was taken at a scenic overlook in the Swiss Alps. A moment of pure freedom and self-discovery.',
    imageUrl: SAMPLE_IMAGES[5],
    unlockDate: new Date('2025-12-25T00:00:00Z'), // Future Christmas - locked
    createdAt: new Date('2024-07-20T16:45:00Z'),
    owner: 'owner-wallet-address-006',
    isLocked: true,
    metadata: {
      attributes: [
        { trait_type: 'Category', value: 'Adventure' },
        { trait_type: 'Location', value: 'Swiss Alps' },
        { trait_type: 'Type', value: 'Solo Travel' },
      ],
    },
  },
];

// Function to get dummy capsules for a specific wallet (for testing)
export const getDummyCapsules = (_walletAddress?: string): Capsule[] => {
  // In a real app, this would filter by actual wallet address
  // For demo purposes, return all dummy capsules
  return DUMMY_CAPSULES;
};

// Function to add a new dummy capsule (for testing the creation flow)
export const createDummyCapsule = (params: {
  name: string;
  description: string;
  unlockDate: Date;
  walletAddress: string;
}): Capsule => {
  const randomImage = SAMPLE_IMAGES[Math.floor(Math.random() * SAMPLE_IMAGES.length)];
  
  return {
    id: `capsule-${Date.now()}`,
    mint: `mint-${Date.now()}`,
    name: params.name,
    description: params.description,
    imageUrl: randomImage,
    unlockDate: params.unlockDate,
    createdAt: new Date(),
    owner: params.walletAddress,
    isLocked: params.unlockDate > new Date(),
    metadata: {
      attributes: [
        { trait_type: 'Category', value: 'User Created' },
        { trait_type: 'Created', value: new Date().toISOString().split('T')[0] },
      ],
    },
  };
}; 