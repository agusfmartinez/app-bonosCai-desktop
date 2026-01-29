const { app, BrowserWindow, ipcMain, Menu } = require("electron");
const path = require("path");
const { initLogger, logToFile } = require("./logger");
const RunnerManager = require("./runner/RunnerManager");
const { registerConfigIpc } = require("./ipc/config.ipc");
const fs = require("fs");

let win;
let runner;
let devLoadRetries = 0;
const MAX_DEV_RETRIES = 20;
const DEV_RETRY_DELAY_MS = 500;

process.on("uncaughtException", (err) => {
  logToFile("error", "MAIN", err.stack || err.message);
});

process.on("unhandledRejection", (reason) => {
  logToFile("error", "MAIN", String(reason));
});

function webContentLogs(win){

  win.webContents.on('did-finish-load', () => {
    logToFile('info', 'MAIN', `Renderer cargado: ${win.webContents.getURL()}`)
  });

  win.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    logToFile('error', 'MAIN', `Fallo carga renderer ${errorCode} ${errorDescription} url=${validatedURL}`)
    const isDevUrl = validatedURL && validatedURL.startsWith('http://localhost:5173');
    if (!app.isPackaged && isDevUrl && errorCode === -102 && devLoadRetries < MAX_DEV_RETRIES) {
      devLoadRetries += 1;
      setTimeout(() => {
        logToFile('info', 'MAIN', `Reintentando carga dev (${devLoadRetries}/${MAX_DEV_RETRIES})`);
        win.loadURL('http://localhost:5173');
      }, DEV_RETRY_DELAY_MS);
    }
  });

  win.webContents.on('render-process-gone', (_event, details) => {
    logToFile('error', 'MAIN', `Renderer crash: reason=${details.reason} exitCode=${details.exitCode}`)
  });

  // Captura errores de consola del renderer (incluye React)
  win.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    if (level < 2) return
    logToFile('info', 'RENDERER', `console level=${level} ${sourceId}:${line} ${message}`)
  });
}

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, "../assets/icon.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  webContentLogs(win)

  runner = new RunnerManager((log) => {
    win.webContents.send("runner:log", log);

    logToFile(
      log.level || "info",
      "RUNNER",
      log.message || JSON.stringify(log),
    );
  });

  if (!app.isPackaged || process.env.ELECTRON_DEV === "true") {
    win.loadURL("http://localhost:5173");
    // win.webContents.openDevTools();
  } else {
    Menu.setApplicationMenu(null);
    win.webContents.on("before-input-event", (event, input) => {
      if (input.control && input.shift && input.key.toLowerCase() === "i") {
        event.preventDefault();
      }
    });

    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

ipcMain.handle("runner:run", async (_, config) => {
  const result = await runner.run(config);
  if (result.ok) {
    logToFile("info", "IPC", "Runner iniciado");
  } else {
    logToFile("warning", "IPC", `Runner no inició: ${result.reason || 'unknown'}`);
  }
  return result;
});

ipcMain.handle("runner:login", async (_, payload) => {
  const result = await runner.login(payload);
  if (result?.ok) {
    logToFile("info", "IPC", "Login CAI iniciado");
  } else {
    logToFile("warning", "IPC", `Login CAI falló: ${result?.error || result?.reason || 'unknown'}`);
  }
  return result;
});


ipcMain.handle("runner:stop", async () => {
  logToFile("warning", "IPC", "Runner detenido por usuario");
  return await runner.stop();
});

ipcMain.handle('runner:status', () => {
  return runner.getStatus()
})

ipcMain.handle('runner:loginStatus', () => {
  try {
    const cookiesPath = process.env.BVIP_COOKIES_PATH || path.join(app.getPath("userData"), "cookies.json")
    if (!fs.existsSync(cookiesPath)) return { ok: false, reason: 'not-found' }
    const raw = fs.readFileSync(cookiesPath, "utf-8")
    const data = JSON.parse(raw)
    const savedAt = Number(data?.savedAt || 0)
    const ttl = Number(process.env.BVIP_COOKIES_TTL || 10800)
    const ageSeconds = savedAt ? (Date.now() - savedAt) / 1000 : Infinity
    if (!savedAt || ageSeconds > ttl) return { ok: false, reason: 'expired' }
    const cookies = Array.isArray(data?.cookies) ? data.cookies : []
    const hasSession = cookies.some((c) => c.name === "bolvipwebappauth")
    return { ok: hasSession }
  } catch {
    return { ok: false, reason: 'error' }
  }
})


app.whenReady().then(() => {
  initLogger();
  logToFile("info", "MAIN", "App iniciada");
  if (!process.env.BVIP_COOKIES_PATH) {
    process.env.BVIP_COOKIES_PATH = path.join(app.getPath("userData"), "cookies.json");
  }
  if (!process.env.BVIP_COOKIES_TTL) {
    process.env.BVIP_COOKIES_TTL = "10800";
  }
  createWindow();
  registerConfigIpc();
});
