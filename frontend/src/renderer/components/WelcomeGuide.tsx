import { Modal, Typography, Steps, Button } from 'antd'
import {
  UploadOutlined,
  SettingOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  BulbOutlined
} from '@ant-design/icons'
import { useState, useEffect } from 'react'

const { Text, Title, Paragraph } = Typography

interface WelcomeGuideProps {
  onClose: () => void
}

function WelcomeGuide({ onClose }: WelcomeGuideProps) {
  const [visible, setVisible] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)

  useEffect(() => {
    // Check if user has seen the guide before
    const hasSeenGuide = localStorage.getItem('mangacolor_guide_seen')
    if (!hasSeenGuide) {
      setVisible(true)
    }
  }, [])

  const handleClose = () => {
    localStorage.setItem('mangacolor_guide_seen', 'true')
    setVisible(false)
    onClose()
  }

  const steps = [
    {
      title: '上传文件',
      icon: <UploadOutlined />,
      content: (
        <div className="text-center py-4">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary-500/20 flex items-center justify-center">
            <UploadOutlined className="text-4xl text-primary-500" />
          </div>
          <Title level={4}>第一步：上传漫画 PDF</Title>
          <Paragraph className="text-gray-400">
            点击左侧"上传 PDF"按钮，选择你想要上色的漫画文件。
            支持任意页数的 PDF 文件，最大 100MB。
          </Paragraph>
        </div>
      )
    },
    {
      title: '设置参数',
      icon: <SettingOutlined />,
      content: (
        <div className="text-center py-4">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-manga-warning/20 flex items-center justify-center">
            <SettingOutlined className="text-4xl text-manga-warning" />
          </div>
          <Title level={4}>第二步：调整设置</Title>
          <Paragraph className="text-gray-400">
            <strong>步长</strong>：每批处理的页数，默认 10 页。
            较小的步长可以更频繁地检查效果。
          </Paragraph>
          <Paragraph className="text-gray-400">
            <strong>提示词</strong>：告诉 AI 你想要的上色风格。
            可以描述色调、氛围、特定颜色等。
          </Paragraph>
        </div>
      )
    },
    {
      title: '分批处理',
      icon: <PlayCircleOutlined />,
      content: (
        <div className="text-center py-4">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-manga-success/20 flex items-center justify-center">
            <PlayCircleOutlined className="text-4xl text-manga-success" />
          </div>
          <Title level={4}>第三步：开始上色</Title>
          <Paragraph className="text-gray-400">
            点击"开始处理"，AI 会按批次为漫画上色。
            每批完成后会自动暂停，让你检查效果。
          </Paragraph>
          <div className="mt-4 p-3 bg-manga-darker rounded-lg text-left">
            <Text className="text-gray-300 text-sm">
              <BulbOutlined className="text-manga-warning mr-2" />
              小贴士：如果某批效果不理想，可以修改提示词后重试该批次。
            </Text>
          </div>
        </div>
      )
    },
    {
      title: '完成',
      icon: <CheckCircleOutlined />,
      content: (
        <div className="text-center py-4">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-manga-accent/20 flex items-center justify-center">
            <CheckCircleOutlined className="text-4xl text-manga-accent" />
          </div>
          <Title level={4}>准备就绪！</Title>
          <Paragraph className="text-gray-400">
            现在你已经了解了基本流程。
            上色结果会自动保存，随时可以继续之前的进度。
          </Paragraph>
          <Paragraph className="text-gray-400">
            祝你上色愉快！🎨
          </Paragraph>
        </div>
      )
    }
  ]

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <span className="text-2xl">🎨</span>
          <span>欢迎使用 MangaColor-G</span>
        </div>
      }
      open={visible}
      onCancel={handleClose}
      footer={null}
      width={560}
      centered
    >
      <div className="py-4">
        <Steps
          current={currentStep}
          size="small"
          className="mb-6"
          items={steps.map((s, i) => ({
            title: s.title,
            icon: currentStep === i ? s.icon : undefined
          }))}
        />

        <div className="min-h-[200px]">
          {steps[currentStep].content}
        </div>

        <div className="flex justify-between mt-6">
          <Button
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
          >
            上一步
          </Button>
          
          {currentStep < steps.length - 1 ? (
            <Button
              type="primary"
              onClick={() => setCurrentStep(currentStep + 1)}
            >
              下一步
            </Button>
          ) : (
            <Button type="primary" onClick={handleClose}>
              开始使用
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}

export default WelcomeGuide

