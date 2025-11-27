import { useCallback } from 'react'
import { message } from 'antd'
import { useAppStore } from '../store/appStore'
import { 
  UploadResponse, 
  StatusResponse, 
  ControlResponse,
  ProcessingState 
} from '@shared/types'

export function useApi() {
  const { 
    backendUrl, 
    currentFileId,
    stepSize,
    currentPrompt,
    setCurrentFile,
    setProcessingState,
    setFileList,
    clearCompletedImages
  } = useAppStore()

  const apiCall = useCallback(async <T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> => {
    const response = await fetch(`${backendUrl}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers
      },
      ...options
    })
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }))
      throw new Error(error.detail || `HTTP ${response.status}`)
    }
    
    return response.json()
  }, [backendUrl])

  // Upload PDF file
  const uploadFile = useCallback(async (file: File): Promise<UploadResponse> => {
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await fetch(`${backendUrl}/api/upload`, {
      method: 'POST',
      body: formData
    })
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Upload failed' }))
      throw new Error(error.detail || 'Upload failed')
    }
    
    const result: UploadResponse = await response.json()
    
    if (result.success) {
      setCurrentFile(result.fileId, result.filename)
      clearCompletedImages()
      message.success(`文件上传成功，共 ${result.totalPages} 页`)
    }
    
    return result
  }, [backendUrl, setCurrentFile, clearCompletedImages])

  // Start processing
  const startProcessing = useCallback(async (): Promise<ControlResponse> => {
    if (!currentFileId) {
      throw new Error('No file selected')
    }
    
    const result = await apiCall<ControlResponse>('/api/start', {
      method: 'POST',
      body: JSON.stringify({
        file_id: currentFileId,
        step_size: stepSize,
        prompt: currentPrompt
      })
    })
    
    if (result.success && result.state) {
      setProcessingState(result.state)
    }
    
    return result
  }, [apiCall, currentFileId, stepSize, currentPrompt, setProcessingState])

  // Pause processing
  const pauseProcessing = useCallback(async (): Promise<ControlResponse> => {
    if (!currentFileId) {
      throw new Error('No file selected')
    }
    
    const result = await apiCall<ControlResponse>('/api/pause', {
      method: 'POST',
      body: JSON.stringify({
        file_id: currentFileId,
        command: 'pause'
      })
    })
    
    if (result.success && result.state) {
      setProcessingState(result.state)
    }
    
    return result
  }, [apiCall, currentFileId, setProcessingState])

  // Continue processing
  const continueProcessing = useCallback(async (): Promise<ControlResponse> => {
    if (!currentFileId) {
      throw new Error('No file selected')
    }
    
    const result = await apiCall<ControlResponse>('/api/continue', {
      method: 'POST',
      body: JSON.stringify({
        file_id: currentFileId,
        command: 'continue'
      })
    })
    
    if (result.success && result.state) {
      setProcessingState(result.state)
    }
    
    return result
  }, [apiCall, currentFileId, setProcessingState])

  // Stop processing
  const stopProcessing = useCallback(async (): Promise<ControlResponse> => {
    if (!currentFileId) {
      throw new Error('No file selected')
    }
    
    const result = await apiCall<ControlResponse>('/api/stop', {
      method: 'POST',
      body: JSON.stringify({
        file_id: currentFileId,
        command: 'stop'
      })
    })
    
    if (result.success && result.state) {
      setProcessingState(result.state)
    }
    
    return result
  }, [apiCall, currentFileId, setProcessingState])

  // Retry current batch
  const retryBatch = useCallback(async (): Promise<ControlResponse> => {
    if (!currentFileId) {
      throw new Error('No file selected')
    }
    
    const result = await apiCall<ControlResponse>('/api/retry-batch', {
      method: 'POST',
      body: JSON.stringify({
        file_id: currentFileId,
        command: 'retry_batch'
      })
    })
    
    if (result.success && result.state) {
      setProcessingState(result.state)
    }
    
    return result
  }, [apiCall, currentFileId, setProcessingState])

  // Trust and run all
  const trustAndRun = useCallback(async (): Promise<ControlResponse> => {
    if (!currentFileId) {
      throw new Error('No file selected')
    }
    
    const result = await apiCall<ControlResponse>('/api/trust-and-run', {
      method: 'POST',
      body: JSON.stringify({
        file_id: currentFileId,
        command: 'trust_and_run'
      })
    })
    
    if (result.success && result.state) {
      setProcessingState(result.state)
    }
    
    return result
  }, [apiCall, currentFileId, setProcessingState])

  // Update prompt
  const updatePrompt = useCallback(async (prompt: string): Promise<ControlResponse> => {
    if (!currentFileId) {
      throw new Error('No file selected')
    }
    
    const result = await apiCall<ControlResponse>('/api/prompt', {
      method: 'PATCH',
      body: JSON.stringify({
        file_id: currentFileId,
        prompt
      })
    })
    
    if (result.success && result.state) {
      setProcessingState(result.state)
    }
    
    return result
  }, [apiCall, currentFileId, setProcessingState])

  // Get status
  const getStatus = useCallback(async (fileId?: string): Promise<StatusResponse> => {
    const id = fileId || currentFileId
    if (!id) {
      throw new Error('No file selected')
    }
    
    const result = await apiCall<StatusResponse>(`/api/status/${id}`)
    
    if (result.success && result.state) {
      setProcessingState(result.state)
    }
    
    return result
  }, [apiCall, currentFileId, setProcessingState])

  // List all files
  const listFiles = useCallback(async () => {
    const result = await apiCall<{ success: boolean; files: any[] }>('/api/files')
    
    if (result.success) {
      setFileList(result.files)
    }
    
    return result
  }, [apiCall, setFileList])

  // Delete file
  const deleteFile = useCallback(async (fileId: string) => {
    const result = await apiCall<{ success: boolean; message: string }>(`/api/file/${fileId}`, {
      method: 'DELETE'
    })
    
    if (result.success) {
      // Refresh file list
      await listFiles()
    }
    
    return result
  }, [apiCall, listFiles])

  // Health check
  const healthCheck = useCallback(async () => {
    try {
      const result = await apiCall<{ status: string }>('/health')
      return result.status === 'healthy'
    } catch {
      return false
    }
  }, [apiCall])

  return {
    uploadFile,
    startProcessing,
    pauseProcessing,
    continueProcessing,
    stopProcessing,
    retryBatch,
    trustAndRun,
    updatePrompt,
    getStatus,
    listFiles,
    deleteFile,
    healthCheck
  }
}

