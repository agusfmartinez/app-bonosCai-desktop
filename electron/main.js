const { app, BrowserWindow, ipcMain, Menu } = require("electron");
const path = require("path");
const os = require("os");
const { initLogger, createLogger } = require("./logger");
const { initCrashLogger, writeCrash } = require('./crashLogger')
const RunnerManager = require("./runner/RunnerManager");
const fs = require("fs");

let win;
let runner;
let devLoadRetries = 0;
const MAX_DEV_RETRIES = 20;
const DEV_RETRY_DELAY_MS = 500;
let splash;
let appLogger;
let ipcLogger;
let securityLogger;
let rendererLogger;
let runnerLogger;

function logWith(logger, fallbackScope, level, message, meta) {
  if (logger && typeof logger[level] === 'function') {
    return logger[level](message, meta)
  }
  const line = `[${fallbackScope}] ${message}`
  if (level === 'error') return console.error(line)
  if (level === 'warning' || level === 'warn') return console.warn(line)
  return console.log(line)
}

function logMain(level, message, meta) {
  return logWith(appLogger, "MAIN", level, message, meta)
}

function logIpc(level, message, meta) {
  return logWith(ipcLogger, "IPC", level, message, meta)
}

function logSecurity(level, message, meta) {
  return logWith(securityLogger, "SECURITY", level, message, meta)
}

function logRenderer(level, message, meta) {
  return logWith(rendererLogger, "RENDERER", level, message, meta)
}

function logRunner(level, message, meta) {
  return logWith(runnerLogger, "RUNNER", level, message, meta)
}

process.on("uncaughtException", (err) => {
  const crash = {
    timestamp: new Date().toISOString(),
    type: "uncaughtException",
    message: err.message,
    stack: err.stack,
    appVersion: app.getVersion(),
    os: process.platform,
  }

  writeCrash(crash)
  logMain("error", err.stack || err.message);
});

process.on("unhandledRejection", (reason) => {
  const crash = {
    timestamp: new Date().toISOString(),
    type: "unhandledRejection",
    message: String(reason),
    stack: reason?.stack || null,
    appVersion: app.getVersion(),
    os: process.platform,
  }

  writeCrash(crash)
  logMain("error", String(reason));
});

function createSplash() {
  splash = new BrowserWindow({
    width: 420,
    height: 280,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    show: true,
  });

  splash.loadFile(path.join(__dirname, 'splash.html'));
}


function webContentLogs(win){

  win.webContents.on('did-finish-load', () => {
    logMain('info', `Renderer cargado: ${win.webContents.getURL()}`)
  });

  win.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    logMain('error', `Fallo carga renderer ${errorCode} ${errorDescription} url=${validatedURL}`)
    const isDevUrl = validatedURL && validatedURL.startsWith('http://localhost:5173');
    if (!app.isPackaged && isDevUrl && errorCode === -102 && devLoadRetries < MAX_DEV_RETRIES) {
      devLoadRetries += 1;
      setTimeout(() => {
        logMain('info', `Reintentando carga dev (${devLoadRetries}/${MAX_DEV_RETRIES})`);
        win.loadURL('http://localhost:5173');
      }, DEV_RETRY_DELAY_MS);
    }
  });

  win.webContents.on('render-process-gone', (_event, details) => {
    logMain('error', `Renderer crash: reason=${details.reason} exitCode=${details.exitCode}`)
  });

  // Captura errores de consola del renderer (incluye React)
  win.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    if (level < 2) return
    logRenderer('info', `console level=${level} ${sourceId}:${line} ${message}`)
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
      sandbox: true,              // ✅ recomendado
      webSecurity: true,          // ✅ default, pero explícito
      allowRunningInsecureContent: false, // ✅
    },
  });

  webContentLogs(win)

  win.webContents.setWindowOpenHandler(({ url }) => {
    logSecurity('warning', `Bloqueado window.open a: ${url}`)
    return { action: 'deny' }
  })

  win.webContents.on('will-navigate', (event, url) => {
    const allowed =
      url.startsWith('file://') ||
      (!app.isPackaged && url.startsWith('http://localhost:5173'))

    if (!allowed) {
      event.preventDefault()
      logSecurity('warning', `Bloqueado navigate a: ${url}`)
    }
  })

  runner = new RunnerManager((log) => {
    win.webContents.send("runner:log", log);
    logRunner(
      log.level || "info",
      log.message || JSON.stringify(log),
      log.meta || {}
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

function validateRunConfig(cfg) {
  if (!cfg || typeof cfg !== 'object') return { ok: false, msg: 'Config inválida' }
  if (!cfg.url || typeof cfg.url !== 'string') return { ok: false, msg: 'Falta url' }
  if (!cfg.sector || typeof cfg.sector !== 'string') return { ok: false, msg: 'Falta sector' }

  const cantidad = Number(cfg.cantidad)
  if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 6) {
    return { ok: false, msg: 'Cantidad inválida' }
  }

  if (!Array.isArray(cfg.personas) || cfg.personas.length < cantidad) {
    return { ok: false, msg: 'personas[] insuficiente' }
  }

  return { ok: true }
}

ipcMain.handle("runner:run", async (_, config) => {
  const v = validateRunConfig(config)
  if (!v.ok) {
    logIpc('warning', `runner:run rechazado: ${v.msg}`)
    return { ok: false, msg: v.msg }
  }
  logIpc("info", "Runner iniciado")
  return await runner.run(config)
})


ipcMain.handle("runner:login", async (_, payload) => {
  const result = await runner.login(payload);
  if (result?.ok) {
    logIpc("info", "Login CAI iniciado");
  } else {
    logIpc("warning", `Login CAI falló: ${result?.error || result?.reason || 'unknown'}`);
  }
  return result;
});


ipcMain.handle("runner:stop", async () => {
  logIpc("warning", "Runner detenido por usuario");
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
    return { ok: hasSession, eventUrl: data?.eventUrl || null }
  } catch {
    return { ok: false, reason: 'error' }
  }
})

ipcMain.handle('app:info', () => {
  const platform = process.platform
  let normalized = platform
  if (platform === 'win32') normalized = 'windows'
  else if (platform === 'darwin') normalized = 'macos'
  else if (platform === 'linux') normalized = 'linux'

  return {
    appVersion: app.getVersion(),
    deviceName: os.hostname(),
    os: normalized,
  }
})


app.whenReady().then(() => {
  initLogger();
  initCrashLogger();
  appLogger = createLogger({ userId: '', file: 'app.log', scope: 'MAIN' })
  ipcLogger = createLogger({ userId: '', file: 'app.log', scope: 'IPC' })
  securityLogger = createLogger({ userId: '', file: 'app.log', scope: 'SECURITY' })
  rendererLogger = createLogger({ userId: '', file: 'app.log', scope: 'RENDERER' })
  runnerLogger = createLogger({ userId: '', file: 'runner.log', scope: 'RUNNER' })
  appLogger.info("App iniciada");
  if (!process.env.BVIP_COOKIES_PATH) {
    process.env.BVIP_COOKIES_PATH = path.join(app.getPath("userData"), "cookies.json");
  }
  if (!process.env.BVIP_COOKIES_TTL) {
    process.env.BVIP_COOKIES_TTL = "10800";
  }
  createSplash();
  createWindow();

  win.once('ready-to-show', () => {
    if (splash) splash.close();
    win.show();
  });
  
});
