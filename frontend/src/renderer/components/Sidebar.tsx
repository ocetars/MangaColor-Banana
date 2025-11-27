import { useState } from 'react'
import { Layout, Button, InputNumber, Input, Divider, Tooltip, Space, message } from 'antd'
import {
  UploadOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  StopOutlined,
  ReloadOutlined,
  RocketOutlined,
  FileTextOutlined
} from '@ant-design/icons'
import { useAppStore } from '../store/appStore'
import { useApi } from '../hooks/useApi'
import FileUploader from './FileUploader'

const { Sider } = Layout
const { TextArea } = Input

function Sidebar() {
  const [uploaderVisible, setUploaderVisible] = useState(false)
  const [loading, setLoading] = useState(false)

  const {
    currentFileId,
    currentFilename,
    processingState,
    stepSize,
    currentPrompt,
    setStepSize,
    setCurrentPrompt
  } = useAppStore()

  const {
    startProcessing,
    pauseProcessing,
    continueProcessing,
    stopProcessing,
    retryBatch,
    trustAndRun,
    updatePrompt
  } = useApi()

  const status = processingState?.status || 'idle'
  const isProcessing = status === 'processing'
  const isPaused = status === 'paused'
  const canStart = currentFileId && (status === 'idle' || status === 'completed' || status === 'error')
  const canPause = isProcessing
  const canContinue = isPaused
  const canStop = isProcessing || isPaused
  const canRetry = isPaused

  const handleStart = async () => {
    setLoading(true)
    try {
      await startProcessing()
      message.success('开始处理')
    } catch (error) {
      message.error(`启动失败: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const handlePause = async () => {
    setLoading(true)
    try {
      await pauseProcessing()
    } catch (error) {
      message.error(`暂停失败: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const handleContinue = async () => {
    setLoading(true)
    try {
      await continueProcessing()
      message.success('继续处理')
    } catch (error) {
      message.error(`继续失败: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const handleStop = async () => {
    setLoading(true)
    try {
      await stopProcessing()
      message.info('处理已停止')
    } catch (error) {
      message.error(`停止失败: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const handleRetry = async () => {
    setLoading(true)
    try {
      await retryBatch()
      message.info('正在重试当前批次')
    } catch (error) {
      message.error(`重试失败: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const handleTrustAndRun = async () => {
    setLoading(true)
    try {
      await trustAndRun()
      message.success('将持续运行直到完成')
    } catch (error) {
      message.error(`操作失败: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const handlePromptUpdate = async () => {
    if (!currentFileId) return
    
    try {
      await updatePrompt(currentPrompt)
      message.success('提示词已更新，将应用于下一批次')
    } catch (error) {
      message.error(`更新失败: ${error}`)
    }
  }

  return (
    <>
      <Sider
        width={320}
        className="bg-manga-dark border-r border-manga-dark/50 overflow-y-auto"
        style={{ background: '#1a1a2e' }}
      >
        <div className="p-4 space-y-4">
          {/* File Upload Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide">
              文件
            </h3>
            <Button
              type="dashed"
              icon={<UploadOutlined />}
              onClick={() => setUploaderVisible(true)}
              className="w-full h-12"
              disabled={isProcessing}
            >
              {currentFilename ? '更换文件' : '上传 PDF'}
            </Button>
            
            {currentFilename && (
              <div className="flex items-center gap-2 p-3 bg-manga-darker rounded-lg">
                <FileTextOutlined className="text-primary-500" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{currentFilename}</p>
                  {processingState && (
                    <p className="text-xs text-gray-500">
                      共 {processingState.totalPages} 页
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <Divider className="!my-4 !border-gray-700" />

          {/* Settings Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide">
              设置
            </h3>
            
            <div className="space-y-2">
              <label className="text-sm text-gray-300">步长 (每批页数)</label>
              <InputNumber
                min={1}
                max={50}
                value={stepSize}
                onChange={(value) => setStepSize(value || 10)}
                className="w-full"
                disabled={isProcessing}
                addonAfter="页"
              />
              <p className="text-xs text-gray-500">
                每处理 {stepSize} 页后暂停，等待确认
              </p>
            </div>
          </div>

          <Divider className="!my-4 !border-gray-700" />

          {/* Prompt Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide">
              提示词
            </h3>
            <TextArea
              value={currentPrompt}
              onChange={(e) => setCurrentPrompt(e.target.value)}
              rows={4}
              placeholder="输入上色提示词..."
              className="!bg-manga-darker !border-gray-700"
            />
            {isPaused && (
              <Button
                size="small"
                onClick={handlePromptUpdate}
                className="w-full"
              >
                更新提示词 (应用于下一批次)
              </Button>
            )}
          </div>

          <Divider className="!my-4 !border-gray-700" />

          {/* Control Buttons */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide">
              控制
            </h3>
            
            <div className="grid grid-cols-2 gap-2">
              {/* Start / Continue */}
              {canStart && (
                <Button
                  type="primary"
                  icon={<PlayCircleOutlined />}
                  onClick={handleStart}
                  loading={loading}
                  className="col-span-2"
                  size="large"
                >
                  开始处理
                </Button>
              )}
              
              {canContinue && (
                <Button
                  type="primary"
                  icon={<PlayCircleOutlined />}
                  onClick={handleContinue}
                  loading={loading}
                  size="large"
                >
                  继续
                </Button>
              )}
              
              {/* Pause */}
              {canPause && (
                <Button
                  icon={<PauseCircleOutlined />}
                  onClick={handlePause}
                  loading={loading}
                  size="large"
                >
                  暂停
                </Button>
              )}
              
              {/* Stop */}
              {canStop && (
                <Button
                  danger
                  icon={<StopOutlined />}
                  onClick={handleStop}
                  loading={loading}
                  size="large"
                >
                  停止
                </Button>
              )}
              
              {/* Retry */}
              {canRetry && (
                <Tooltip title="删除当前批次并重新处理">
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={handleRetry}
                    loading={loading}
                    className="col-span-2"
                  >
                    重试当前批次
                  </Button>
                </Tooltip>
              )}
            </div>

            {/* Trust and Run */}
            {isPaused && (
              <Tooltip title="取消后续暂停，直接处理完所有页面">
                <Button
                  type="default"
                  icon={<RocketOutlined />}
                  onClick={handleTrustAndRun}
                  loading={loading}
                  className="w-full"
                >
                  信任并全本运行
                </Button>
              </Tooltip>
            )}
          </div>

          {/* Help Text */}
          {!currentFileId && (
            <div className="p-4 bg-manga-darker rounded-lg border border-dashed border-gray-700">
              <p className="text-sm text-gray-400 text-center">
                我们将按每 {stepSize} 页一组进行上色。每组完成后，程序会暂停等待您的确认。
                这样您可以随时检查质量并节省 API 费用。
              </p>
            </div>
          )}
        </div>
      </Sider>

      <FileUploader
        visible={uploaderVisible}
        onClose={() => setUploaderVisible(false)}
      />
    </>
  )
}

export default Sidebar

