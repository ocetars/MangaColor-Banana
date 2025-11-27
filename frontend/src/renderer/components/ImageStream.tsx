import { useMemo } from 'react'
import { Image, Typography, Tooltip } from 'antd'
import { CheckCircleOutlined, LoadingOutlined, ExclamationCircleOutlined } from '@ant-design/icons'
import { useAppStore } from '../store/appStore'

const { Text } = Typography

interface ImageGroup {
  batchNumber: number
  startPage: number
  endPage: number
  images: Array<{
    pageNumber: number
    url: string | null
    status: 'completed' | 'processing' | 'pending' | 'failed'
  }>
}

function ImageStream() {
  const { processingState, completedImages, backendUrl } = useAppStore()

  const imageGroups = useMemo<ImageGroup[]>(() => {
    if (!processingState) return []

    const groups: ImageGroup[] = []
    const { batches, totalPages, stepSize } = processingState

    // If no batches defined yet, create virtual ones
    if (batches.length === 0) {
      const totalBatches = Math.ceil(totalPages / stepSize)
      for (let i = 0; i < totalBatches; i++) {
        const startPage = i * stepSize + 1
        const endPage = Math.min((i + 1) * stepSize, totalPages)
        
        const images = []
        for (let page = startPage; page <= endPage; page++) {
          const url = completedImages.get(page) || null
          images.push({
            pageNumber: page,
            url,
            status: url ? 'completed' : 'pending' as const
          })
        }

        groups.push({
          batchNumber: i + 1,
          startPage,
          endPage,
          images
        })
      }
    } else {
      // Use actual batch info
      for (const batch of batches) {
        const images = []
        for (let page = batch.startPage; page <= batch.endPage; page++) {
          const url = completedImages.get(page) || null
          let status: 'completed' | 'processing' | 'pending' | 'failed' = 'pending'
          
          if (url) {
            status = 'completed'
          } else if (batch.status === 'processing' && processingState.completedPages.includes(page)) {
            status = 'completed'
          } else if (batch.status === 'processing') {
            status = 'processing'
          } else if (batch.status === 'failed') {
            status = 'failed'
          }

          images.push({
            pageNumber: page,
            url,
            status
          })
        }

        groups.push({
          batchNumber: batch.batchNumber,
          startPage: batch.startPage,
          endPage: batch.endPage,
          images
        })
      }
    }

    return groups
  }, [processingState, completedImages])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleOutlined className="text-manga-success" />
      case 'processing':
        return <LoadingOutlined className="text-primary-500" spin />
      case 'failed':
        return <ExclamationCircleOutlined className="text-manga-accent" />
      default:
        return null
    }
  }

  return (
    <div className="p-6 space-y-8">
      {imageGroups.map((group) => (
        <div key={group.batchNumber} className="animate-in">
          {/* Batch Divider */}
          <div className="batch-divider mb-4">
            <span className="px-4 py-1.5 bg-manga-dark rounded-full text-sm font-medium text-gray-300">
              批次 {group.batchNumber}
              <span className="text-gray-500 ml-2">
                第 {group.startPage}-{group.endPage} 页
              </span>
            </span>
          </div>

          {/* Image Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {group.images.map((image) => (
              <div
                key={image.pageNumber}
                className="image-card relative rounded-lg overflow-hidden bg-manga-dark border border-gray-800"
              >
                {/* Image or Placeholder */}
                {image.url ? (
                  <Image
                    src={image.url}
                    alt={`Page ${image.pageNumber}`}
                    className="w-full aspect-[3/4] object-cover"
                    preview={{
                      mask: '点击预览',
                    }}
                    fallback="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 400'%3E%3Crect fill='%231a1a2e' width='300' height='400'/%3E%3Ctext fill='%23666' x='50%25' y='50%25' text-anchor='middle'%3E加载失败%3C/text%3E%3C/svg%3E"
                  />
                ) : (
                  <div className="w-full aspect-[3/4] flex items-center justify-center bg-manga-darker">
                    {image.status === 'processing' ? (
                      <div className="text-center">
                        <LoadingOutlined className="text-3xl text-primary-500 mb-2" spin />
                        <Text className="text-gray-500 text-xs block">处理中...</Text>
                      </div>
                    ) : image.status === 'failed' ? (
                      <div className="text-center">
                        <ExclamationCircleOutlined className="text-3xl text-manga-accent mb-2" />
                        <Text className="text-gray-500 text-xs block">处理失败</Text>
                      </div>
                    ) : (
                      <div className="text-center">
                        <div className="w-12 h-12 rounded-lg bg-gray-800 flex items-center justify-center mb-2">
                          <Text className="text-gray-600 text-lg">{image.pageNumber}</Text>
                        </div>
                        <Text className="text-gray-600 text-xs">等待处理</Text>
                      </div>
                    )}
                  </div>
                )}

                {/* Page Number Badge */}
                <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 rounded text-xs text-white">
                  P{image.pageNumber}
                </div>

                {/* Status Badge */}
                <Tooltip title={
                  image.status === 'completed' ? '已完成' :
                  image.status === 'processing' ? '处理中' :
                  image.status === 'failed' ? '失败' : '等待中'
                }>
                  <div className="absolute top-2 right-2">
                    {getStatusIcon(image.status)}
                  </div>
                </Tooltip>

                {/* Compare Button (for completed images) */}
                {image.url && (
                  <Tooltip title="查看原图对比">
                    <button
                      className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 rounded text-xs text-white hover:bg-black/80 transition-colors"
                      onClick={() => {
                        // Open comparison modal
                        window.open(
                          `${backendUrl}/api/original/${processingState?.fileId}/${image.pageNumber}`,
                          '_blank'
                        )
                      }}
                    >
                      原图
                    </button>
                  </Tooltip>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default ImageStream

