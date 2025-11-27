import { create } from 'zustand'
import { ProcessingState, ProcessingStatus, BatchInfo, FileInfo } from '@shared/types'

interface AppState {
  // Connection URLs
  backendUrl: string
  webSocketUrl: string
  
  // Connection status
  isConnected: boolean
  
  // Current file
  currentFileId: string | null
  currentFilename: string | null
  
  // Processing state
  processingState: ProcessingState | null
  
  // UI state
  stepSize: number
  currentPrompt: string
  isAutoRun: boolean
  
  // Completed images
  completedImages: Map<number, string>
  
  // File list
  fileList: FileInfo[]
  
  // Actions
  setBackendUrl: (url: string) => void
  setWebSocketUrl: (url: string) => void
  setIsConnected: (connected: boolean) => void
  setCurrentFile: (fileId: string | null, filename: string | null) => void
  setProcessingState: (state: ProcessingState | null) => void
  setStepSize: (size: number) => void
  setCurrentPrompt: (prompt: string) => void
  setIsAutoRun: (autoRun: boolean) => void
  addCompletedImage: (pageNumber: number, imagePath: string) => void
  clearCompletedImages: () => void
  setFileList: (files: FileInfo[]) => void
  
  // Derived state updaters
  updateProgress: (currentPage: number, batchNumber: number) => void
  updateBatchStatus: (batchNumber: number, status: BatchInfo['status']) => void
  updateStatus: (status: ProcessingStatus, message?: string) => void
  
  // Reset
  reset: () => void
}

const defaultPrompt = 'Colorize this manga page with vibrant, natural colors while preserving the original line art and details.'

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  backendUrl: 'http://127.0.0.1:8765',
  webSocketUrl: 'ws://127.0.0.1:8765/ws',
  isConnected: false,
  currentFileId: null,
  currentFilename: null,
  processingState: null,
  stepSize: 10,
  currentPrompt: defaultPrompt,
  isAutoRun: false,
  completedImages: new Map(),
  fileList: [],
  
  // Actions
  setBackendUrl: (url) => set({ backendUrl: url }),
  setWebSocketUrl: (url) => set({ webSocketUrl: url }),
  setIsConnected: (connected) => set({ isConnected: connected }),
  
  setCurrentFile: (fileId, filename) => set({ 
    currentFileId: fileId, 
    currentFilename: filename,
    completedImages: new Map()
  }),
  
  setProcessingState: (state) => set({ 
    processingState: state,
    currentPrompt: state?.currentPrompt || get().currentPrompt
  }),
  
  setStepSize: (size) => set({ stepSize: size }),
  setCurrentPrompt: (prompt) => set({ currentPrompt: prompt }),
  setIsAutoRun: (autoRun) => set({ isAutoRun: autoRun }),
  
  addCompletedImage: (pageNumber, imagePath) => set((state) => {
    const newImages = new Map(state.completedImages)
    newImages.set(pageNumber, imagePath)
    return { completedImages: newImages }
  }),
  
  clearCompletedImages: () => set({ completedImages: new Map() }),
  
  setFileList: (files) => set({ fileList: files }),
  
  updateProgress: (currentPage, batchNumber) => set((state) => {
    if (!state.processingState) return state
    
    const completedPages = [...state.processingState.completedPages]
    if (!completedPages.includes(currentPage)) {
      completedPages.push(currentPage)
    }
    
    return {
      processingState: {
        ...state.processingState,
        currentBatch: batchNumber,
        completedPages
      }
    }
  }),
  
  updateBatchStatus: (batchNumber, status) => set((state) => {
    if (!state.processingState) return state
    
    const batches = state.processingState.batches.map((batch) =>
      batch.batchNumber === batchNumber ? { ...batch, status } : batch
    )
    
    return {
      processingState: {
        ...state.processingState,
        batches
      }
    }
  }),
  
  updateStatus: (status, message) => set((state) => {
    if (!state.processingState) return state
    
    return {
      processingState: {
        ...state.processingState,
        status,
        errorMessage: message
      }
    }
  }),
  
  reset: () => set({
    currentFileId: null,
    currentFilename: null,
    processingState: null,
    stepSize: 10,
    currentPrompt: defaultPrompt,
    isAutoRun: false,
    completedImages: new Map()
  })
}))

