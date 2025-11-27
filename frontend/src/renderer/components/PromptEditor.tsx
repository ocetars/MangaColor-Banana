import { useState } from 'react'
import { Modal, Input, Button, Typography, Space, Tag, message } from 'antd'
import { EditOutlined, SaveOutlined, UndoOutlined } from '@ant-design/icons'
import { useAppStore } from '../store/appStore'
import { useApi } from '../hooks/useApi'

const { TextArea } = Input
const { Text, Title } = Typography

interface PromptEditorProps {
  visible: boolean
  onClose: () => void
}

// Preset prompts for common scenarios
const presetPrompts = [
  {
    name: '自然色彩',
    prompt: 'Colorize this manga page with vibrant, natural colors while preserving the original line art and details.'
  },
  {
    name: '高饱和度',
    prompt: 'Colorize this manga page with highly saturated, vivid colors. Make the colors pop while keeping the artwork style intact.'
  },
  {
    name: '柔和色调',
    prompt: 'Colorize this manga page with soft, pastel colors. Use gentle tones that create a calm, soothing atmosphere.'
  },
  {
    name: '复古风格',
    prompt: 'Colorize this manga page with a vintage, retro color palette. Use warm, slightly faded tones reminiscent of old comic books.'
  },
  {
    name: '奇幻世界',
    prompt: 'Colorize this manga page with fantasy-inspired colors. Use magical, ethereal tones with glowing effects where appropriate.'
  },
  {
    name: '现实风格',
    prompt: 'Colorize this manga page with realistic, true-to-life colors. Focus on natural skin tones and accurate environmental colors.'
  }
]

function PromptEditor({ visible, onClose }: PromptEditorProps) {
  const { currentPrompt, setCurrentPrompt, processingState } = useAppStore()
  const { updatePrompt } = useApi()
  
  const [editedPrompt, setEditedPrompt] = useState(currentPrompt)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      setCurrentPrompt(editedPrompt)
      
      // If processing is paused, also update on server
      if (processingState?.status === 'paused') {
        await updatePrompt(editedPrompt)
        message.success('提示词已更新，将应用于下一批次')
      } else {
        message.success('提示词已保存')
      }
      
      onClose()
    } catch (error) {
      message.error(`保存失败: ${error}`)
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setEditedPrompt(currentPrompt)
  }

  const handlePresetSelect = (prompt: string) => {
    setEditedPrompt(prompt)
  }

  return (
    <Modal
      title={
        <Space>
          <EditOutlined />
          <span>编辑提示词</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={600}
      centered
    >
      <div className="py-4 space-y-4">
        {/* Preset Tags */}
        <div>
          <Text className="text-gray-400 text-sm mb-2 block">快速选择预设：</Text>
          <div className="flex flex-wrap gap-2">
            {presetPrompts.map((preset) => (
              <Tag
                key={preset.name}
                className="cursor-pointer hover:border-primary-500 transition-colors"
                onClick={() => handlePresetSelect(preset.prompt)}
              >
                {preset.name}
              </Tag>
            ))}
          </div>
        </div>

        {/* Prompt Input */}
        <div>
          <Text className="text-gray-400 text-sm mb-2 block">自定义提示词：</Text>
          <TextArea
            value={editedPrompt}
            onChange={(e) => setEditedPrompt(e.target.value)}
            rows={6}
            placeholder="输入上色提示词..."
            className="!bg-manga-darker !border-gray-700"
          />
          <Text className="text-gray-500 text-xs mt-1 block">
            提示词将指导 AI 如何为漫画页面上色。建议使用英文以获得更好的效果。
          </Text>
        </div>

        {/* Tips */}
        <div className="p-3 bg-manga-darker rounded-lg border border-gray-700">
          <Title level={5} className="!text-gray-300 !mb-2 !text-sm">
            提示词技巧
          </Title>
          <ul className="text-gray-500 text-xs space-y-1 list-disc list-inside">
            <li>描述想要的整体色调和氛围</li>
            <li>可以指定特定元素的颜色（如"blue sky", "green grass"）</li>
            <li>提及保留原始线条和细节</li>
            <li>根据场景类型调整（室内/室外、白天/夜晚等）</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-2">
          <Button
            icon={<UndoOutlined />}
            onClick={handleReset}
            disabled={editedPrompt === currentPrompt}
          >
            重置
          </Button>
          <Button onClick={onClose}>
            取消
          </Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
            loading={saving}
          >
            保存
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default PromptEditor

