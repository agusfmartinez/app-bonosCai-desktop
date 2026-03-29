const { contextBridge, ipcRenderer } = require('electron')

const listeners = new Map()
const updaterListeners = new Map()

contextBridge.exposeInMainWorld('api', {
  login: (payload) => ipcRenderer.invoke('runner:login', payload),
  run: (config) => ipcRenderer.invoke('runner:run', config),
  stop: () => ipcRenderer.invoke('runner:stop'),
  getRunnerStatus: () => ipcRenderer.invoke('runner:status'),
  getLoginStatus: () => ipcRenderer.invoke('runner:loginStatus'),
  getAppInfo: () => ipcRenderer.invoke('app:info'),
  forceUpdate: () => ipcRenderer.invoke('app:forceUpdate'),
  subscribeUpdaterLogs: () => ipcRenderer.invoke('updater:subscribe'),

  onLog: (cb) => {
    const wrapped = (_event, data) => cb(data)
    const existing = listeners.get(cb)
    if (existing) {
      ipcRenderer.removeListener('runner:log', existing)
    }
    listeners.set(cb, wrapped)
    ipcRenderer.on('runner:log', wrapped)
  },
  offLog: (cb) => {
    const wrapped = listeners.get(cb)
    if (wrapped) {
      ipcRenderer.removeListener('runner:log', wrapped)
      listeners.delete(cb)
    }
  },

  onUpdaterLog: (cb) => {
    const wrapped = (_event, data) => cb(data)
    const existing = updaterListeners.get(cb)
    if (existing) {
      ipcRenderer.removeListener('updater:log', existing)
    }
    updaterListeners.set(cb, wrapped)
    ipcRenderer.on('updater:log', wrapped)
  },
  offUpdaterLog: (cb) => {
    const wrapped = updaterListeners.get(cb)
    if (wrapped) {
      ipcRenderer.removeListener('updater:log', wrapped)
      updaterListeners.delete(cb)
    }
  },
  
})

contextBridge.exposeInMainWorld('updater', {
  onUpdateEvent: (cb) => {
    ipcRenderer.on('update:event', (_event, data) => cb(data))
  },
  checkForUpdates: () => ipcRenderer.invoke('update:check'),
  installUpdate: () => ipcRenderer.invoke('update:install'),
})
