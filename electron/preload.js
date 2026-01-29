const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  login: (payload) => ipcRenderer.invoke('runner:login', payload),
  run: (config) => ipcRenderer.invoke('runner:run', config),
  stop: () => ipcRenderer.invoke('runner:stop'),
  getRunnerStatus: () => ipcRenderer.invoke('runner:status'),
  getLoginStatus: () => ipcRenderer.invoke('runner:loginStatus'),

  onLog: (cb) => ipcRenderer.on('runner:log', (_, data) => cb(data)),
  offLog: (cb) => ipcRenderer.removeListener('runner:log', cb),
  
  loadConfig: () => ipcRenderer.invoke('config:load'),
  saveConfig: (config) => ipcRenderer.invoke('config:save', config)
})
