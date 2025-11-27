import { useState, useCallback } from 'react'
import { Modal, Upload, Button, Typography, Progress, message } from 'antd'
import { InboxOutlined, FileTextOutlined, CheckCircleOutlined } from '@ant-design/icons'
import type { UploadFile, UploadProps } from 'antd'
import { useApi } from '../hooks/useApi'

const { Dragger } = Upload
const { Text, Title } = Typography

interface FileUploaderProps {
  visible: boolean
  onClose: () => void
}

function FileUploader({ visible, onClose }: FileUploaderProps) {
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadSuccess, setUploadSuccess] = useState(false)

  const { uploadFile } = useApi()

  const handleUpload = useCallback(async () => {
    if (fileList.length === 0) {
      message.warning('请先选择文件')
      return
    }

    const file = fileList[0].originFileObj
    if (!file) {
      message.error('文件无效')
      return
    }

    setUploading(true)
    setUploadProgress(0)

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return prev
          }
          return prev + 10
        })
      }, 200)

      await uploadFile(file)

      clearInterval(progressInterval)
      setUploadProgress(100)
      setUploadSuccess(true)

      // Auto close after success
      setTimeout(() => {
        handleClose()
      }, 1500)
    } catch (error) {
      message.error(`上传失败: ${error}`)
      setUploadProgress(0)
    } finally {
      setUploading(false)
    }
  }, [fileList, uploadFile])

  const handleClose = () => {
    setFileList([])
    setUploadProgress(0)
    setUploadSuccess(false)
    onClose()
  }

  const uploadProps: UploadProps = {
    name: 'file',
    multiple: false,
    accept: '.pdf',
    fileList,
    beforeUpload: (file) => {
      // Validate file type
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        message.error('只支持 PDF 文件')
        return false
      }

      // Validate file size (max 100MB)
      if (file.size > 100 * 1024 * 1024) {
        message.error('文件大小不能超过 100MB')
        return false
      }

      setFileList([{
        uid: '-1',
        name: file.name,
        status: 'done',
        size: file.size,
        originFileObj: file
      }])

      return false // Prevent auto upload
    },
    onRemove: () => {
      setFileList([])
      setUploadSuccess(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <Modal
      title="上传漫画文件"
      open={visible}
      onCancel={handleClose}
      footer={null}
      width={500}
      centered
      destroyOnClose
    >
      <div className="py-4">
        {!uploadSuccess ? (
          <>
            <Dragger {...uploadProps} disabled={uploading}>
              <p className="ant-upload-drag-icon">
                <InboxOutlined className="!text-primary-500" />
              </p>
              <p className="ant-upload-text">点击或拖拽文件到此区域</p>
              <p className="ant-upload-hint">
                支持 PDF 格式的漫画文件，最大 100MB
              </p>
            </Dragger>

            {fileList.length > 0 && (
              <div className="mt-4 p-4 bg-manga-darker rounded-lg">
                <div className="flex items-center gap-3">
                  <FileTextOutlined className="text-2xl text-primary-500" />
                  <div className="flex-1 min-w-0">
                    <Text className="text-white block truncate">
                      {fileList[0].name}
                    </Text>
                    <Text className="text-gray-500 text-sm">
                      {formatFileSize(fileList[0].size || 0)}
                    </Text>
                  </div>
                </div>

                {uploading && (
                  <div className="mt-3">
                    <Progress
                      percent={uploadProgress}
                      strokeColor={{
                        '0%': '#ed7a1b',
                        '100%': '#ff6b6b',
                      }}
                      size="small"
                    />
                    <Text className="text-gray-500 text-xs mt-1 block">
                      正在上传并解析文件...
                    </Text>
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <Button onClick={handleClose} disabled={uploading}>
                取消
              </Button>
              <Button
                type="primary"
                onClick={handleUpload}
                loading={uploading}
                disabled={fileList.length === 0}
              >
                上传并解析
              </Button>
            </div>
          </>
        ) : (
          <div className="py-8 text-center">
            <CheckCircleOutlined className="text-6xl text-manga-success mb-4" />
            <Title level={4} className="!text-manga-success !mb-2">
              上传成功！
            </Title>
            <Text className="text-gray-400">
              文件已准备就绪，可以开始处理
            </Text>
          </div>
        )}
      </div>
    </Modal>
  )
}

export default FileUploader

