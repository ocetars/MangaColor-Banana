import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { spawn, ChildProcess } from 'child_process'
import path from 'path'
import fs from 'fs'

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit()
}

let mainWindow: BrowserWindow | null = null
let pythonProcess: ChildProcess | null = null

const BACKEND_PORT = 8765
const isDev = process.env.NODE_ENV !== 'production' || !app.isPackaged

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#1a1a2e',
    show: false,
  })

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function startPythonBackend() {
  if (isDev) {
    // In development, assume Python backend is started separately
    console.log('Development mode: Please start Python backend manually')
    console.log(`Run: cd backend && python main.py`)
    return
  }

  // In production, start the bundled Python executable
  const pythonPath = path.join(process.resourcesPath, 'backend', 'main')
  
  if (!fs.existsSync(pythonPath)) {
    console.error('Python backend not found at:', pythonPath)
    return
  }

  pythonProcess = spawn(pythonPath, [], {
    cwd: path.join(process.resourcesPath, 'backend'),
    env: { ...process.env, PORT: String(BACKEND_PORT) },
  })

  pythonProcess.stdout?.on('data', (data) => {
    console.log(`Python: ${data}`)
  })

  pythonProcess.stderr?.on('data', (data) => {
    console.error(`Python Error: ${data}`)
  })

  pythonProcess.on('close', (code) => {
    console.log(`Python process exited with code ${code}`)
  })
}

function stopPythonBackend() {
  if (pythonProcess) {
    pythonProcess.kill()
    pythonProcess = null
  }
}

// IPC Handlers
ipcMain.handle('select-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openFile'],
    filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
  })
  
  if (result.canceled || result.filePaths.length === 0) {
    return null
  }
  
  return result.filePaths[0]
})

ipcMain.handle('select-output-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory', 'createDirectory'],
  })
  
  if (result.canceled || result.filePaths.length === 0) {
    return null
  }
  
  return result.filePaths[0]
})

ipcMain.handle('get-backend-url', () => {
  return `http://127.0.0.1:${BACKEND_PORT}`
})

ipcMain.handle('get-websocket-url', () => {
  return `ws://127.0.0.1:${BACKEND_PORT}/ws`
})

ipcMain.handle('read-file', async (_, filePath: string) => {
  try {
    const buffer = fs.readFileSync(filePath)
    return { success: true, data: buffer }
  } catch (error) {
    return { success: false, error: String(error) }
  }
})

ipcMain.handle('get-app-path', () => {
  return app.getPath('userData')
})

// App lifecycle
app.whenReady().then(() => {
  startPythonBackend()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  stopPythonBackend()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  stopPythonBackend()
})

