const fs = require('fs')
const path = require('path')
const { app } = require('electron')

let logFile

function initLogger() {
  const base = app.getPath('userData')
  const logsDir = path.join(base, 'logs')
  if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir)

  logFile = path.join(logsDir, 'app.log')
}

function logToFile(level, origin, message) {
  if (!logFile) return

  const env = app.isPackaged ? 'PROD' : 'DEV'
  const ts = new Date().toISOString().replace('T', ' ').split('.')[0]

  const line = `${ts} [${env}] [${level.toUpperCase()}] [${origin}] ${message}\n`
  fs.appendFileSync(logFile, line)
}

module.exports = { initLogger, logToFile }
