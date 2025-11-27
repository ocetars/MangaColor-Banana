import { useEffect, useState } from 'react'
import { Layout, message, Spin } from 'antd'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import MainContent from './components/MainContent'
import ResumeModal from './components/ResumeModal'
import WelcomeGuide from './components/WelcomeGuide'
import { useAppStore } from './store/appStore'
import { useWebSocket } from './hooks/useWebSocket'
import { useCheckpoint } from './hooks/useCheckpoint'

const { Content } = Layout

function App() {
  const { setBackendUrl, setWebSocketUrl, isConnected } = useAppStore()
  const [showGuide, setShowGuide] = useState(false)
  
  // Initialize WebSocket connection
  useWebSocket()

  // Checkpoint/resume functionality
  const {
    showResumeModal,
    resumableState,
    resumeFromCheckpoint,
    startFresh,
    cancelResume
  } = useCheckpoint()

  useEffect(() => {
    // Get backend URLs from Electron
    const initializeUrls = async () => {
      try {
        if (window.electronAPI) {
          const backendUrl = await window.electronAPI.getBackendUrl()
          const wsUrl = await window.electronAPI.getWebSocketUrl()
          setBackendUrl(backendUrl)
          setWebSocketUrl(wsUrl)
        } else {
          // Fallback for browser development
          setBackendUrl('http://127.0.0.1:8765')
          setWebSocketUrl('ws://127.0.0.1:8765/ws')
        }
      } catch (error) {
        message.error('无法连接到后端服务')
        console.error('Failed to get backend URLs:', error)
      }
    }

    initializeUrls()

    // Check if should show welcome guide
    const hasSeenGuide = localStorage.getItem('mangacolor_guide_seen')
    if (!hasSeenGuide) {
      setShowGuide(true)
    }
  }, [setBackendUrl, setWebSocketUrl])

  return (
    <Layout className="h-screen bg-manga-dark">
      <Header />
      <Layout className="flex-1 overflow-hidden">
        <Sidebar />
        <Content className="flex-1 overflow-hidden bg-manga-darker">
          <MainContent />
        </Content>
      </Layout>

      {/* Welcome Guide */}
      {showGuide && (
        <WelcomeGuide onClose={() => setShowGuide(false)} />
      )}

      {/* Resume Modal */}
      <ResumeModal
        visible={showResumeModal}
        state={resumableState}
        onResume={resumeFromCheckpoint}
        onStartFresh={startFresh}
        onCancel={cancelResume}
      />

      {/* Connection loading overlay */}
      {!isConnected && (
        <div className="fixed inset-0 bg-manga-dark/80 flex items-center justify-center z-50">
          <div className="text-center">
            <Spin size="large" />
            <p className="mt-4 text-gray-400">正在连接后端服务...</p>
            <p className="text-xs text-gray-600 mt-2">
              请确保后端服务已启动 (python main.py)
            </p>
          </div>
        </div>
      )}
    </Layout>
  )
}

export default App
