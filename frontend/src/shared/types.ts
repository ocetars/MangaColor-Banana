/**
 * Shared type definitions between main and renderer processes
 */

// Processing status
export type ProcessingStatus = 'idle' | 'processing' | 'paused' | 'completed' | 'error'

// Batch status
export type BatchStatus = 'pending' | 'processing' | 'completed' | 'failed'

// Control commands
export type ControlCommand = 'start' | 'pause' | 'continue' | 'stop' | 'retry_batch' | 'trust_and_run'

// Batch information
export interface BatchInfo {
  batchNumber: number
  startPage: number
  endPage: number
  status: BatchStatus
  promptUsed?: string
  completedPages: number[]
}

// Processing state
export interface ProcessingState {
  fileId: string
  filename: string
  totalPages: number
  stepSize: number
  currentBatch: number
  totalBatches: number
  status: ProcessingStatus
  currentPrompt: string
  completedPages: number[]
  batches: BatchInfo[]
  errorMessage?: string
}

// Page result
export interface PageResult {
  pageNumber: number
  success: boolean
  outputPath?: string
  error?: string
}

// WebSocket message types
export interface WSProgressMessage {
  type: 'progress'
  data: {
    fileId: string
    currentPage: number
    totalPages: number
    batchNumber: number
    percentage: number
  }
}

export interface WSPageCompleteMessage {
  type: 'page_complete'
  data: {
    fileId: string
    pageNumber: number
    outputPath: string
  }
}

export interface WSBatchCompleteMessage {
  type: 'batch_complete'
  data: {
    fileId: string
    batchNumber: number
    startPage: number
    endPage: number
  }
}

export interface WSStatusMessage {
  type: 'status'
  data: {
    fileId: string
    status: ProcessingStatus
    message: string
  }
}

export interface WSErrorMessage {
  type: 'error'
  data: {
    fileId: string
    error: string
    pageNumber?: number
  }
}

export type WebSocketMessage = 
  | WSProgressMessage 
  | WSPageCompleteMessage 
  | WSBatchCompleteMessage 
  | WSStatusMessage 
  | WSErrorMessage

// API response types
export interface UploadResponse {
  success: boolean
  fileId: string
  filename: string
  totalPages: number
  message: string
}

export interface StatusResponse {
  success: boolean
  state?: ProcessingState
  message: string
}

export interface ControlResponse {
  success: boolean
  message: string
  state?: ProcessingState
}

// File info for listing
export interface FileInfo {
  fileId: string
  filename: string
  totalPages: number
  status: ProcessingStatus
  completedPages: number
  createdAt: string
  updatedAt: string
}

