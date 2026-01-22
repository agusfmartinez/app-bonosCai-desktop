const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })

  win.loadURL('http://localhost:5173')
}

app.whenReady().then(createWindow)

const runner = require('./runner/Runner')

ipcMain.handle('runner:run', async (_, config) => {
  return await runner.run(config)
})

ipcMain.handle('runner:stop', async () => {
  return await runner.stop()
})
