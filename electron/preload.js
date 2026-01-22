const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  run: (config) => ipcRenderer.invoke('runner:run', config),
  stop: () => ipcRenderer.invoke('runner:stop'),
  onLog: (cb) => ipcRenderer.on('runner:log', (_, data) => cb(data))
})
