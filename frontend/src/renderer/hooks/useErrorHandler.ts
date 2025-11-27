import { useCallback } from 'react'
import { message, notification } from 'antd'

interface ErrorHandlerOptions {
  showNotification?: boolean
  duration?: number
  retryAction?: () => Promise<void>
}

export function useErrorHandler() {
  const handleError = useCallback((
    error: unknown,
    context: string,
    options: ErrorHandlerOptions = {}
  ) => {
    const { showNotification = false, duration = 4, retryAction } = options
    
    // Extract error message
    let errorMessage = '发生未知错误'
    if (error instanceof Error) {
      errorMessage = error.message
    } else if (typeof error === 'string') {
      errorMessage = error
    } else if (error && typeof error === 'object' && 'detail' in error) {
      errorMessage = String((error as { detail: unknown }).detail)
    }
    
    // Log error for debugging
    console.error(`[${context}]`, error)
    
    // Show user feedback
    if (showNotification) {
      notification.error({
        message: context,
        description: errorMessage,
        duration,
        btn: retryAction ? (
          <button
            onClick={() => {
              notification.destroy()
              retryAction()
            }}
            className="text-primary-500 hover:text-primary-400"
          >
            重试
          </button>
        ) : undefined
      })
    } else {
      message.error(`${context}: ${errorMessage}`)
    }
    
    return errorMessage
  }, [])

  const handleApiError = useCallback((
    error: unknown,
    operation: string
  ) => {
    // Check for specific error types
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return handleError(
        '无法连接到后端服务，请确保服务已启动',
        operation,
        { showNotification: true }
      )
    }
    
    if (error instanceof Error) {
      // Handle HTTP errors
      if (error.message.includes('401')) {
        return handleError('API 认证失败，请检查 API Key', operation)
      }
      if (error.message.includes('429')) {
        return handleError('API 请求过于频繁，请稍后重试', operation, {
          showNotification: true,
          duration: 6
        })
      }
      if (error.message.includes('500')) {
        return handleError('服务器内部错误', operation, { showNotification: true })
      }
    }
    
    return handleError(error, operation)
  }, [handleError])

  const handleWebSocketError = useCallback((error: unknown) => {
    console.error('[WebSocket Error]', error)
    // Don't show user notification for WebSocket errors as they auto-reconnect
  }, [])

  const withErrorHandling = useCallback(<T,>(
    operation: string,
    fn: () => Promise<T>,
    options?: ErrorHandlerOptions
  ): Promise<T | null> => {
    return fn().catch((error) => {
      handleApiError(error, operation)
      return null
    })
  }, [handleApiError])

  return {
    handleError,
    handleApiError,
    handleWebSocketError,
    withErrorHandling
  }
}

