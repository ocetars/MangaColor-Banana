import { Modal, Typography, Button, Space, Input, Divider } from 'antd'
import {
  CheckCircleOutlined,
  PlayCircleOutlined,
  EditOutlined,
  ReloadOutlined,
  RocketOutlined,
  LogoutOutlined
} from '@ant-design/icons'
import { useState } from 'react'
import { useAppStore } from '../store/appStore'
import { useApi } from '../hooks/useApi'

const { Text, Title } = Typography
const { TextArea } = Input

interface BatchCheckpointModalProps {
  visible: boolean
  batchNumber: number
  startPage: number
  endPage: number
  onClose: () => void
}

function BatchCheckpointModal({
  visible,
  batchNumber,
  startPage,
  endPage,
  onClose
}: BatchCheckpointModalProps) {
  const { currentPrompt, setCurrentPrompt } = useAppStore()
  const { continueProcessing, retryBatch, trustAndRun, updatePrompt } = useApi()
  
  const [editingPrompt, setEditingPrompt] = useState(false)
  const [tempPrompt, setTempPrompt] = useState(currentPrompt)
  const [loading, setLoading] = useState(false)

  const handleContinue = async () => {
    setLoading(true)
    try {
      await continueProcessing()
      onClose()
    } finally {
      setLoading(false)
    }
  }

  const handleRetry = async () => {
    setLoading(true)
    try {
      await retryBatch()
      onClose()
    } finally {
      setLoading(false)
    }
  }

  const handleTrustAndRun = async () => {
    setLoading(true)
    try {
      await trustAndRun()
      onClose()
    } finally {
      setLoading(false)
    }
  }

  const handleSavePrompt = async () => {
    setLoading(true)
    try {
      await updatePrompt(tempPrompt)
      setCurrentPrompt(tempPrompt)
      setEditingPrompt(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      title={null}
      open={visible}
      onCancel={onClose}
      footer={null}
      centered
      width={520}
      closable={false}
      maskClosable={false}
    >
      <div className="py-2">
        {/* Success Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-manga-success/20 flex items-center justify-center">
            <CheckCircleOutlined className="text-3xl text-manga-success" />
          </div>
          <Title level={4} className="!mb-2">
            批次 {batchNumber} 完成！
          </Title>
          <Text className="text-gray-400">
            第 {startPage} - {endPage} 页已处理完成
          </Text>
        </div>

        {/* Prompt Section */}
        <div className="mb-6 p-4 bg-manga-darker rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <Text className="text-gray-400 text-sm">当前提示词</Text>
            {!editingPrompt && (
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={() => {
                  setTempPrompt(currentPrompt)
                  setEditingPrompt(true)
                }}
              >
                修改
              </Button>
            )}
          </div>
          
          {editingPrompt ? (
            <div className="space-y-2">
              <TextArea
                value={tempPrompt}
                onChange={(e) => setTempPrompt(e.target.value)}
                rows={3}
                className="!bg-manga-dark !border-gray-700"
              />
              <div className="flex gap-2">
                <Button
                  size="small"
                  onClick={() => setEditingPrompt(false)}
                >
                  取消
                </Button>
                <Button
                  type="primary"
                  size="small"
                  onClick={handleSavePrompt}
                  loading={loading}
                >
                  保存并应用
                </Button>
              </div>
            </div>
          ) : (
            <Text className="text-white text-sm line-clamp-2">
              {currentPrompt}
            </Text>
          )}
        </div>

        <Divider className="!my-4 !border-gray-700" />

        {/* Action Buttons */}
        <div className="space-y-3">
          <Text className="text-gray-400 text-sm block mb-3">
            请检查上色效果后选择操作：
          </Text>

          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={handleContinue}
            loading={loading}
            className="w-full"
            size="large"
          >
            满意，继续下一批次
          </Button>

          <Button
            icon={<RocketOutlined />}
            onClick={handleTrustAndRun}
            loading={loading}
            className="w-full"
          >
            信任并全本运行
          </Button>

          <Button
            icon={<ReloadOutlined />}
            onClick={handleRetry}
            loading={loading}
            className="w-full"
            danger
          >
            不满意，重试当前批次
          </Button>

          <Button
            icon={<LogoutOutlined />}
            onClick={onClose}
            className="w-full"
          >
            以后再做，退出
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default BatchCheckpointModal

