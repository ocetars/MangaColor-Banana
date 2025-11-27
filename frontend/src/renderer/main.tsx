import React from 'react'
import ReactDOM from 'react-dom/client'
import { ConfigProvider, theme } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import App from './App'
import './styles/index.css'

const darkTheme = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: '#ed7a1b',
    colorBgContainer: '#1a1a2e',
    colorBgElevated: '#242442',
    colorBorder: '#3d3d5c',
    colorText: '#e5e5e5',
    colorTextSecondary: '#a0a0a0',
    borderRadius: 8,
    fontFamily: 'Inter, system-ui, sans-serif',
  },
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider theme={darkTheme} locale={zhCN}>
      <App />
    </ConfigProvider>
  </React.StrictMode>
)

