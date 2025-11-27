# MangaColor-Banana 🍌 

由 Nano Banana Pro 驱动的交互式、可控的一键式漫画上色工具

## 效果预览

![效果](docs/processing.png)
![效果](docs/compare1.png)
![效果](docs/compare2.png)

## 功能特点

- **步进式工作流**: 分批处理，每批完成后暂停确认，让你完全掌控上色效果和成本
- **实时预览**: 瀑布流展示上色结果，实时查看处理进度
- **断点续传**: 自动保存进度，随时可以继续上次的工作
- **灵活控制**: 支持暂停、继续、重试当前批次、修改提示词等操作
- **成本可控**: 不满意可以随时停止，避免浪费 API 配额

## 技术栈

### 前端
- Electron + React + TypeScript
- Vite
- Tailwind CSS + Ant Design
- Zustand

### 后端
- Python + FastAPI
- PyMuPDF
- Google Generative AI
- WebSocket

## 快速开始

### 环境要求

- Node.js 18+
- Python 3.10+
- Google Gemini API Key

### 安装步骤

1. **克隆项目**
```bash
cd comic
```

2. **配置 API Key**
```bash
cd backend
cp .env.example .env
# 编辑 .env 文件，填入你的 GOOGLE_API_KEY
```

3. **安装后端依赖**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

4. **安装前端依赖**
```bash
cd frontend
npm install
```

### 运行开发环境

1. **启动后端服务**
```bash
cd backend
source venv/bin/activate
python main.py
```

2. **启动前端应用**
```bash
cd frontend
npm run electron:dev
```

## 使用说明

### 基本流程

1. **上传 PDF**: 点击"上传 PDF"选择漫画文件
2. **设置参数**: 
   - 步长：每批处理的页数（默认 10 页）
   - 提示词：指导 AI 如何上色
3. **开始处理**: 点击"开始处理"
4. **检查效果**: 每批完成后自动暂停，检查上色效果
5. **决策**:
   - 满意：点击"继续"处理下一批
   - 需要调整：修改提示词后继续
   - 不满意：点击"重试当前批次"
   - 完全信任：点击"信任并全本运行"

### 提示词技巧

```
# 自然色彩
Colorize this manga page with vibrant, natural colors while preserving the original line art and details.

# 高饱和度
Colorize this manga page with highly saturated, vivid colors. Make the colors pop while keeping the artwork style intact.

# 奇幻风格
Colorize this manga page with fantasy-inspired colors. Use magical, ethereal tones with glowing effects where appropriate.
```

## 项目结构

```
comic/
├── frontend/                 # Electron + React 前端
│   ├── src/
│   │   ├── main/            # Electron 主进程
│   │   ├── renderer/        # React 渲染进程
│   │   │   ├── components/  # UI 组件
│   │   │   ├── hooks/       # React Hooks
│   │   │   └── store/       # Zustand 状态管理
│   │   └── shared/          # 共享类型定义
│   └── package.json
├── backend/                  # Python FastAPI 后端
│   ├── app/
│   │   ├── api/             # API 路由
│   │   ├── models/          # 数据模型
│   │   └── services/        # 业务逻辑
│   ├── requirements.txt
│   └── main.py
└── prd.md                    # 产品需求文档
```

## API 端点

### REST API

| 方法 | 端点 | 描述 |
|------|------|------|
| POST | /api/upload | 上传 PDF 文件 |
| POST | /api/start | 开始处理 |
| POST | /api/pause | 暂停处理 |
| POST | /api/continue | 继续处理 |
| POST | /api/stop | 停止处理 |
| POST | /api/retry-batch | 重试当前批次 |
| POST | /api/trust-and-run | 信任并全本运行 |
| GET | /api/status/{file_id} | 获取处理状态 |
| PATCH | /api/prompt | 更新提示词 |

### WebSocket

- `/ws/updates` - 全局更新
- `/ws/updates/{file_id}` - 特定文件更新

## 构建发布

```bash
# 构建前端
cd frontend
npm run electron:build

# 打包后端 (可选)
cd backend
pyinstaller --onefile main.py
```

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

