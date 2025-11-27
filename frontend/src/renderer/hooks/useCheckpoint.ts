import { useEffect, useState, useCallback } from 'react'
import { message } from 'antd'
import { useAppStore } from '../store/appStore'
import { useApi } from './useApi'
import { ProcessingState } from '@shared/types'

export function useCheckpoint() {
  const [hasResumableState, setHasResumableState] = useState(false)
  const [resumableState, setResumableState] = useState<ProcessingState | null>(null)
  const [showResumeModal, setShowResumeModal] = useState(false)

  const { 
    setCurrentFile, 
    setProcessingState,
    clearCompletedImages,
    addCompletedImage,
    backendUrl
  } = useAppStore()

  const { getStatus, listFiles, deleteFile } = useApi()

  // Check for resumable state when file changes
  const checkForResumableState = useCallback(async (fileId: string) => {
    try {
      const response = await getStatus(fileId)
      
      if (response.success && response.state) {
        const state = response.state
        
        // Check if there's progress to resume
        if (
          state.completedPages.length > 0 &&
          state.status !== 'completed'
        ) {
          setResumableState(state)
          setHasResumableState(true)
          setShowResumeModal(true)
          return true
        }
      }
      
      setHasResumableState(false)
      setResumableState(null)
      return false
    } catch (error) {
      console.error('Error checking for resumable state:', error)
      return false
    }
  }, [getStatus])

  // Resume from checkpoint
  const resumeFromCheckpoint = useCallback(async () => {
    if (!resumableState) return

    // Set the processing state
    setProcessingState(resumableState)

    // Load completed images
    for (const pageNum of resumableState.completedPages) {
      const imageUrl = `${backendUrl}/api/image/${resumableState.fileId}/${pageNum}`
      addCompletedImage(pageNum, imageUrl)
    }

    setShowResumeModal(false)
    message.success('已恢复到上次进度')
  }, [resumableState, setProcessingState, addCompletedImage, backendUrl])

  // Start fresh (delete existing progress)
  const startFresh = useCallback(async () => {
    if (!resumableState) return

    try {
      // Delete the existing state and files
      await deleteFile(resumableState.fileId)
      
      // Clear local state
      clearCompletedImages()
      setProcessingState(null)
      setCurrentFile(null, null)
      
      setShowResumeModal(false)
      setHasResumableState(false)
      setResumableState(null)
      
      message.info('已清除之前的进度，请重新上传文件')
    } catch (error) {
      message.error('清除进度失败')
    }
  }, [resumableState, deleteFile, clearCompletedImages, setProcessingState, setCurrentFile])

  // Cancel resume
  const cancelResume = useCallback(() => {
    setShowResumeModal(false)
  }, [])

  // Check for any resumable files on mount
  useEffect(() => {
    const checkAllFiles = async () => {
      try {
        const response = await listFiles()
        
        if (response.success && response.files.length > 0) {
          // Find files that have progress but aren't completed
          const resumable = response.files.find(
            (f: any) => f.completed_pages > 0 && f.status !== 'completed'
          )
          
          if (resumable) {
            setCurrentFile(resumable.file_id, resumable.filename)
            await checkForResumableState(resumable.file_id)
          }
        }
      } catch (error) {
        // Silently fail - backend might not be ready
        console.log('Could not check for resumable files')
      }
    }

    // Small delay to ensure backend is ready
    const timer = setTimeout(checkAllFiles, 1000)
    return () => clearTimeout(timer)
  }, [listFiles, setCurrentFile, checkForResumableState])

  return {
    hasResumableState,
    resumableState,
    showResumeModal,
    checkForResumableState,
    resumeFromCheckpoint,
    startFresh,
    cancelResume,
    setShowResumeModal
  }
}

