import { Badge, Space, Typography } from 'antd'
import { CloudOutlined, DisconnectOutlined } from '@ant-design/icons'
import { useAppStore } from '../store/appStore'

const { Title } = Typography

function Header() {
  const { isConnected, processingState } = useAppStore()

  const getStatusBadge = () => {
    if (!processingState) {
      return <Badge status="default" text="就绪" />
    }

    switch (processingState.status) {
      case 'processing':
        return <Badge status="processing" text="处理中" />
      case 'paused':
        return <Badge status="warning" text="已暂停" />
      case 'completed':
        return <Badge status="success" text="已完成" />
      case 'error':
        return <Badge status="error" text="出错" />
      default:
        return <Badge status="default" text="空闲" />
    }
  }

  return (
    <header className="h-14 bg-manga-dark border-b border-manga-dark/50 flex items-center justify-between px-6 drag-region">
      <div className="flex items-center gap-4 no-drag">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-manga-accent flex items-center justify-center">
          <span className="text-white font-bold text-sm">M</span>
        </div>
        <Title level={4} className="!mb-0 !text-white font-display">
          MangaColor-G
        </Title>
      </div>

      <div className="flex items-center gap-6 no-drag">
        {/* Processing status */}
        <div className="flex items-center gap-2">
          {getStatusBadge()}
        </div>

        {/* Connection status */}
        <div className="flex items-center gap-2">
          {isConnected ? (
            <Space size={4}>
              <CloudOutlined className="text-manga-success" />
              <span className="text-sm text-manga-success">已连接</span>
            </Space>
          ) : (
            <Space size={4}>
              <DisconnectOutlined className="text-manga-accent" />
              <span className="text-sm text-manga-accent">未连接</span>
            </Space>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header

