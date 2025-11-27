import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // File operations
  selectFile: () => ipcRenderer.invoke('select-file'),
  selectOutputFolder: () => ipcRenderer.invoke('select-output-folder'),
  readFile: (filePath: string) => ipcRenderer.invoke('read-file', filePath),
  
  // Backend communication
  getBackendUrl: () => ipcRenderer.invoke('get-backend-url'),
  getWebSocketUrl: () => ipcRenderer.invoke('get-websocket-url'),
  
  // App info
  getAppPath: () => ipcRenderer.invoke('get-app-path'),
  
  // Platform info
  platform: process.platform,
})

// Type definitions for the exposed API
export interface ElectronAPI {
  selectFile: () => Promise<string | null>
  selectOutputFolder: () => Promise<string | null>
  readFile: (filePath: string) => Promise<{ success: boolean; data?: Buffer; error?: string }>
  getBackendUrl: () => Promise<string>
  getWebSocketUrl: () => Promise<string>
  getAppPath: () => Promise<string>
  platform: NodeJS.Platform
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

