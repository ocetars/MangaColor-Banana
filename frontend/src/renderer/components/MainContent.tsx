import { useMemo } from 'react'
import { Empty, Progress, Typography } from 'antd'
import { FileImageOutlined } from '@ant-design/icons'
import { useAppStore } from '../store/appStore'
import ImageStream from './ImageStream'
import ControlPanel from './ControlPanel'

const { Title, Text } = Typography

function MainContent() {
  const { currentFileId, processingState, completedImages } = useAppStore()

  const progressPercent = useMemo(() => {
    if (!processingState) return 0
    return Math.round((processingState.completedPages.length / processingState.totalPages) * 100)
  }, [processingState])

  const hasImages = completedImages.size > 0

  if (!currentFileId) {
    return (
      <div className="h-full flex items-center justify-center">
        <Empty
          image={<FileImageOutlined className="text-6xl text-gray-600" />}
          description={
            <div className="space-y-2">
              <Title level={4} className="!text-gray-400 !mb-0">
                开始上色之旅
              </Title>
              <Text className="text-gray-500">
                上传一个 PDF 漫画文件开始处理
              </Text>
            </div>
          }
        />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Top Control Panel */}
      <ControlPanel />

      {/* Progress Bar */}
      {processingState && (
        <div className="px-6 py-3 bg-manga-dark/50 border-b border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <Text className="text-gray-400">
              处理进度: {processingState.completedPages.length} / {processingState.totalPages} 页
            </Text>
            <Text className="text-primary-500 font-medium">
              {progressPercent}%
            </Text>
          </div>
          <Progress
            percent={progressPercent}
            showInfo={false}
            strokeColor={{
              '0%': '#ed7a1b',
              '100%': '#ff6b6b',
            }}
            trailColor="#2d2d4a"
            className="!mb-0"
          />
          
          {/* Batch indicators */}
          {processingState.batches.length > 0 && (
            <div className="flex gap-1 mt-2">
              {processingState.batches.map((batch) => (
                <div
                  key={batch.batchNumber}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${
                    batch.status === 'completed'
                      ? 'bg-manga-success'
                      : batch.status === 'processing'
                      ? 'bg-primary-500 animate-pulse'
                      : batch.status === 'failed'
                      ? 'bg-manga-accent'
                      : 'bg-gray-700'
                  }`}
                  title={`批次 ${batch.batchNumber}: 第 ${batch.startPage}-${batch.endPage} 页`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Image Stream */}
      <div className="flex-1 overflow-y-auto">
        {hasImages ? (
          <ImageStream />
        ) : (
          <div className="h-full flex items-center justify-center">
            <Empty
              description={
                <div className="space-y-2">
                  <Text className="text-gray-400">
                    {processingState?.status === 'processing'
                      ? '正在处理中，图片将实时显示...'
                      : '点击"开始处理"开始上色'}
                  </Text>
                </div>
              }
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default MainContent

