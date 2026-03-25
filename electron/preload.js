const { contextBridge, ipcRenderer } = require('electron')

const listeners = new Map()

contextBridge.exposeInMainWorld('api', {
  login: (payload) => ipcRenderer.invoke('runner:login', payload),
  run: (config) => ipcRenderer.invoke('runner:run', config),
  stop: () => ipcRenderer.invoke('runner:stop'),
  getRunnerStatus: () => ipcRenderer.invoke('runner:status'),
  getLoginStatus: () => ipcRenderer.invoke('runner:loginStatus'),
  getAppInfo: () => ipcRenderer.invoke('app:info'),

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
  
})
