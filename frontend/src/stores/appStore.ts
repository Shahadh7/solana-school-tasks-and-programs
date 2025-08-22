import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

export interface Capsule {
  id: string
  mint: string
  name: string
  description: string
  imageUrl: string
  unlockDate: Date
  createdAt: Date
  owner: string
  recipient?: string
  isLocked: boolean
  metadata: {
    attributes: Array<{
      trait_type: string
      value: string
    }>
    nftMinted?: boolean
    mintSignature?: string
    assetId?: string
    creator?: string
    transferredAt?: number
    mintCreator?: string
  }
}

export interface MintingState {
  isLoading: boolean
  status: 'idle' | 'uploading' | 'encrypting' | 'minting' | 'success' | 'error'
  progress: number
  error?: string
  transaction?: string
}

interface AppState {
  // User state
  userCapsules: Capsule[]
  
  // Minting state
  minting: MintingState
  
  // IPFS uploads
  uploadedFiles: Array<{
    url: string
    filename: string
    size: number
  }>
  
  // Actions
  setUserCapsules: (capsules: Capsule[]) => void
  addCapsule: (capsule: Capsule) => void
  updateCapsule: (id: string, updates: Partial<Capsule>) => void
  removeCapsule: (id: string) => void
  
  // Minting actions
  setMintingState: (state: Partial<MintingState>) => void
  resetMinting: () => void
  
  // File upload actions
  addUploadedFile: (file: { url: string; filename: string; size: number }) => void
  clearUploadedFiles: () => void
}

export const useAppStore = create<AppState>()(
  devtools(
    (set, _get) => ({
      // Initial state
      userCapsules: [],
      minting: {
        isLoading: false,
        status: 'idle',
        progress: 0,
      },
      uploadedFiles: [],
      
      // User capsule actions
      setUserCapsules: (capsules) =>
        set({ userCapsules: capsules }, false, 'setUserCapsules'),
      
      addCapsule: (capsule) =>
        set(
          (state) => ({
            userCapsules: [...state.userCapsules, capsule],
          }),
          false,
          'addCapsule'
        ),
      
      updateCapsule: (id, updates) =>
        set(
          (state) => ({
            userCapsules: state.userCapsules.map((capsule) =>
              capsule.id === id ? { ...capsule, ...updates } : capsule
            ),
          }),
          false,
          'updateCapsule'
        ),
      
      removeCapsule: (id) =>
        set(
          (state) => ({
            userCapsules: state.userCapsules.filter((capsule) => capsule.id !== id),
          }),
          false,
          'removeCapsule'
        ),
      
      // Minting actions
      setMintingState: (newState) =>
        set(
          (state) => ({
            minting: { ...state.minting, ...newState },
          }),
          false,
          'setMintingState'
        ),
      
      resetMinting: () =>
        set(
          {
            minting: {
              isLoading: false,
              status: 'idle',
              progress: 0,
            },
          },
          false,
          'resetMinting'
        ),
      
      // File upload actions
      addUploadedFile: (file) =>
        set(
          (state) => ({
            uploadedFiles: [...state.uploadedFiles, file],
          }),
          false,
          'addUploadedFile'
        ),
      
      clearUploadedFiles: () =>
        set({ uploadedFiles: [] }, false, 'clearUploadedFiles'),
    }),
    {
      name: 'dear-future-store',
    }
  )
) 