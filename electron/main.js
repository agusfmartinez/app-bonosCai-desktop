const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const Runner = require("./runner/Runner");

let win;
let runner;

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  runner = new Runner((log) => {
    win.webContents.send("runner:log", log);
  });

  win.loadURL("http://localhost:5173");
}

ipcMain.handle("runner:run", async (_, config) => {
  return await runner.run(config);
});

ipcMain.handle("runner:stop", async () => {
  return await runner.stop();
});

app.whenReady().then(createWindow);
