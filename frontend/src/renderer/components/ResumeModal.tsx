import { Modal, Typography, Progress, Space, Button } from 'antd'
import { HistoryOutlined, PlayCircleOutlined, DeleteOutlined } from '@ant-design/icons'
import { ProcessingState } from '@shared/types'

const { Text, Title } = Typography

interface ResumeModalProps {
  visible: boolean
  state: ProcessingState | null
  onResume: () => void
  onStartFresh: () => void
  onCancel: () => void
}

function ResumeModal({ visible, state, onResume, onStartFresh, onCancel }: ResumeModalProps) {
  if (!state) return null

  const progressPercent = Math.round((state.completedPages.length / state.totalPages) * 100)

  return (
    <Modal
      title={
        <Space>
          <HistoryOutlined className="text-primary-500" />
          <span>发现未完成的任务</span>
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      centered
      width={480}
    >
      <div className="py-4 space-y-4">
        <div className="p-4 bg-manga-darker rounded-lg">
          <Text className="text-gray-400 text-sm block mb-2">文件名</Text>
          <Text className="text-white font-medium">{state.filename}</Text>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-manga-darker rounded-lg">
            <Text className="text-gray-400 text-sm block mb-1">已完成</Text>
            <Title level={3} className="!text-manga-success !mb-0">
              {state.completedPages.length}
              <span className="text-gray-500 text-base font-normal"> / {state.totalPages} 页</span>
            </Title>
          </div>
          
          <div className="p-4 bg-manga-darker rounded-lg">
            <Text className="text-gray-400 text-sm block mb-1">当前批次</Text>
            <Title level={3} className="!text-white !mb-0">
              {state.currentBatch}
              <span className="text-gray-500 text-base font-normal"> / {state.totalBatches}</span>
            </Title>
          </div>
        </div>

        <div>
          <div className="flex justify-between mb-2">
            <Text className="text-gray-400">处理进度</Text>
            <Text className="text-primary-500">{progressPercent}%</Text>
          </div>
          <Progress
            percent={progressPercent}
            showInfo={false}
            strokeColor={{
              '0%': '#ed7a1b',
              '100%': '#ff6b6b',
            }}
            trailColor="#2d2d4a"
          />
        </div>

        <div className="pt-4 space-y-3">
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={onResume}
            className="w-full"
            size="large"
          >
            从第 {state.completedPages.length + 1} 页继续
          </Button>
          
          <Button
            icon={<DeleteOutlined />}
            onClick={onStartFresh}
            className="w-full"
            danger
          >
            重新开始 (删除已有进度)
          </Button>
          
          <Button onClick={onCancel} className="w-full">
            稍后再说
          </Button>
        </div>

        <Text className="text-gray-500 text-xs text-center block">
          您之前的处理进度已自动保存，可以随时继续
        </Text>
      </div>
    </Modal>
  )
}

export default ResumeModal

