import { Typography, Tag, Space } from 'antd'
import {
  SyncOutlined,
  PauseOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons'
import { useAppStore } from '../store/appStore'

const { Text } = Typography

function ControlPanel() {
  const { processingState, currentFilename } = useAppStore()

  const getStatusIcon = () => {
    if (!processingState) return <ClockCircleOutlined />
    
    switch (processingState.status) {
      case 'processing':
        return <SyncOutlined spin />
      case 'paused':
        return <PauseOutlined />
      case 'completed':
        return <CheckCircleOutlined />
      case 'error':
        return <ExclamationCircleOutlined />
      default:
        return <ClockCircleOutlined />
    }
  }

  const getStatusColor = () => {
    if (!processingState) return 'default'
    
    switch (processingState.status) {
      case 'processing':
        return 'processing'
      case 'paused':
        return 'warning'
      case 'completed':
        return 'success'
      case 'error':
        return 'error'
      default:
        return 'default'
    }
  }

  const getStatusText = () => {
    if (!processingState) return '就绪'
    
    switch (processingState.status) {
      case 'processing':
        return `正在处理批次 ${processingState.currentBatch}`
      case 'paused':
        return `批次 ${processingState.currentBatch} 完成，等待确认`
      case 'completed':
        return '全部完成'
      case 'error':
        return processingState.errorMessage || '处理出错'
      default:
        return '空闲'
    }
  }

  return (
    <div className="px-6 py-4 bg-manga-dark border-b border-gray-800">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Text className="text-lg font-medium text-white">
            {currentFilename}
          </Text>
          
          {processingState && (
            <Tag
              icon={getStatusIcon()}
              color={getStatusColor()}
              className="!text-sm"
            >
              {getStatusText()}
            </Tag>
          )}
        </div>

        {processingState && (
          <Space size="large">
            <div className="text-right">
              <Text className="text-gray-500 text-xs block">当前批次</Text>
              <Text className="text-white font-medium">
                {processingState.currentBatch} / {processingState.totalBatches}
              </Text>
            </div>
            
            <div className="text-right">
              <Text className="text-gray-500 text-xs block">步长</Text>
              <Text className="text-white font-medium">
                {processingState.stepSize} 页
              </Text>
            </div>
            
            <div className="text-right">
              <Text className="text-gray-500 text-xs block">已完成</Text>
              <Text className="text-manga-success font-medium">
                {processingState.completedPages.length} 页
              </Text>
            </div>
          </Space>
        )}
      </div>

      {/* Paused notification */}
      {processingState?.status === 'paused' && (
        <div className="mt-4 p-4 bg-manga-warning/10 border border-manga-warning/30 rounded-lg">
          <div className="flex items-start gap-3">
            <PauseOutlined className="text-manga-warning text-xl mt-0.5" />
            <div>
              <Text className="text-manga-warning font-medium block">
                批次 {processingState.currentBatch} 已完成！
              </Text>
              <Text className="text-gray-400 text-sm">
                请检查上色效果。满意请点击"继续"处理下一批次，或修改提示词后继续。
                如果效果不理想，可以点击"重试当前批次"重新处理。
              </Text>
            </div>
          </div>
        </div>
      )}

      {/* Error notification */}
      {processingState?.status === 'error' && (
        <div className="mt-4 p-4 bg-manga-accent/10 border border-manga-accent/30 rounded-lg">
          <div className="flex items-start gap-3">
            <ExclamationCircleOutlined className="text-manga-accent text-xl mt-0.5" />
            <div>
              <Text className="text-manga-accent font-medium block">
                处理出错
              </Text>
              <Text className="text-gray-400 text-sm">
                {processingState.errorMessage || '发生未知错误，请重试'}
              </Text>
            </div>
          </div>
        </div>
      )}

      {/* Completed notification */}
      {processingState?.status === 'completed' && (
        <div className="mt-4 p-4 bg-manga-success/10 border border-manga-success/30 rounded-lg">
          <div className="flex items-start gap-3">
            <CheckCircleOutlined className="text-manga-success text-xl mt-0.5" />
            <div>
              <Text className="text-manga-success font-medium block">
                全部处理完成！
              </Text>
              <Text className="text-gray-400 text-sm">
                共处理 {processingState.totalPages} 页，上色结果已保存
              </Text>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ControlPanel

