import { useEffect, useRef, useCallback } from 'react'
import { message } from 'antd'
import { useAppStore } from '../store/appStore'
import { WebSocketMessage } from '@shared/types'

type IncomingWsMessage = WebSocketMessage | { type: 'pong' }

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  // 使用 ref 来跟踪是否应该重连，避免组件卸载后还重连
  const shouldReconnectRef = useRef(true)
  // 使用 ref 存储 currentFileId 来避免 connect 函数因 fileId 变化而重建
  const currentFileIdRef = useRef<string | null>(null)
  
  const {
    webSocketUrl,
    currentFileId,
    setIsConnected,
    addCompletedImage,
    updateProgress,
    updateBatchStatus,
    updateStatus,
    backendUrl
  } = useAppStore()

  // 更新 ref 值
  currentFileIdRef.current = currentFileId

  const handleMessage = useCallback((msg: IncomingWsMessage) => {
    switch (msg.type) {
      case 'pong':
        // Keepalive响应，不需要业务处理
        return
        
      case 'progress':
        updateProgress(msg.data.currentPage, msg.data.batchNumber)
        break
        
      case 'page_complete':
        // Construct image URL
        const imageUrl = `${backendUrl}/api/image/${msg.data.fileId}/${msg.data.pageNumber}`
        addCompletedImage(msg.data.pageNumber, imageUrl)
        break
        
      case 'batch_complete':
        updateBatchStatus(msg.data.batchNumber, 'completed')
        message.success(`批次 ${msg.data.batchNumber} 完成！第 ${msg.data.startPage}-${msg.data.endPage} 页已处理`)
        break
        
      case 'status':
        updateStatus(msg.data.status, msg.data.message)
        
        if (msg.data.status === 'paused') {
          message.info('处理已暂停，请检查效果后继续')
        } else if (msg.data.status === 'completed') {
          message.success('全部处理完成！')
        }
        break
        
      case 'error':
        updateStatus('error', msg.data.error)
        message.error(`处理出错: ${msg.data.error}`)
        break
        
      default:
        console.log('Unknown message type:', msg)
    }
  }, [updateProgress, addCompletedImage, updateBatchStatus, updateStatus, backendUrl])

  const connect = useCallback(() => {
    if (!webSocketUrl) return
    
    // 清除之前的重连定时器
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    
    // 清除 ping 定时器
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current)
      pingIntervalRef.current = null
    }
    
    // Close existing connection without triggering onclose reconnect
    if (wsRef.current) {
      // 临时禁用重连，避免 close 事件触发重连
      const oldWs = wsRef.current
      wsRef.current = null
      oldWs.close()
    }
    
    // 使用 ref 中的值来构建 URL
    const fileId = currentFileIdRef.current
    const url = fileId 
      ? `${webSocketUrl}/updates/${fileId}`
      : `${webSocketUrl}/updates`
    
    try {
      const ws = new WebSocket(url)
      wsRef.current = ws
      
      ws.onopen = () => {
        console.log('WebSocket connected')
        setIsConnected(true)
        
        // Start ping interval
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }))
          }
        }, 30000)
      }
      
      ws.onmessage = (event) => {
        try {
          const msg: IncomingWsMessage = JSON.parse(event.data)
          handleMessage(msg)
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
        }
      }
      
      ws.onclose = () => {
        console.log('WebSocket disconnected')
        setIsConnected(false)
        
        // Clear ping interval
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current)
          pingIntervalRef.current = null
        }
        
        // 只有当 wsRef 仍然指向这个 ws 时才重连
        // 如果 wsRef 已经是 null 或指向新的连接，则不重连
        if (wsRef.current === ws && shouldReconnectRef.current) {
          wsRef.current = null
          reconnectTimeoutRef.current = setTimeout(() => {
            if (shouldReconnectRef.current) {
              connect()
            }
          }, 3000)
        }
      }
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
      }
    } catch (error) {
      console.error('Failed to create WebSocket:', error)
      
      // Retry connection
      if (shouldReconnectRef.current) {
        reconnectTimeoutRef.current = setTimeout(() => {
          if (shouldReconnectRef.current) {
            connect()
          }
        }, 3000)
      }
    }
  }, [webSocketUrl, setIsConnected, handleMessage])  // 不再依赖 currentFileId

  // Connect on mount and when webSocketUrl changes
  useEffect(() => {
    shouldReconnectRef.current = true
    connect()
    
    return () => {
      // 标记不应重连
      shouldReconnectRef.current = false
      
      // Cleanup
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current)
        pingIntervalRef.current = null
      }
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [connect])

  // Reconnect when file changes - 使用单独的 effect 只关注 currentFileId 变化
  useEffect(() => {
    // 只有在文件 ID 变化且有新的文件 ID 时才重连
    // 首次挂载时不需要触发（因为上面的 effect 已经连接了）
    if (currentFileId && wsRef.current) {
      connect()
    }
  }, [currentFileId]) // 故意不依赖 connect，避免循环

  return {
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
    reconnect: connect
  }
}
