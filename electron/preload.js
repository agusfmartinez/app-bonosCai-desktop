const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  run: (config) => ipcRenderer.invoke('runner:run', config),
  stop: () => ipcRenderer.invoke('runner:stop'),
  getRunnerStatus: () => ipcRenderer.invoke('runner:status'),

  onLog: (cb) => ipcRenderer.on('runner:log', (_, data) => cb(data)),
  offLog: (cb) => ipcRenderer.removeListener('runner:log', cb),
  
  loadConfig: () => ipcRenderer.invoke('config:load'),
  saveConfig: (config) => ipcRenderer.invoke('config:save', config)
})
