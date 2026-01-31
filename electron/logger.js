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

function redactSecrets(msg) {
  return String(msg)
    .replace(/Bearer\s+[A-Za-z0-9\-._]+/g, 'Bearer [REDACTED]')
    .replace(/bp_token\s*=\s*[^\s]+/gi, 'bp_token=[REDACTED]')
    .replace(/bp_session_id\s*=\s*[^\s]+/gi, 'bp_session_id=[REDACTED]')
}


function logToFile(level, origin, message) {
  if (!logFile) return

  const env = app.isPackaged ? 'PROD' : 'DEV'
  const ts = new Date().toISOString().replace('T', ' ').split('.')[0]

  const safeMessage = redactSecrets(message)

  const line = `${ts} [${env}] [${level.toUpperCase()}] [${origin}] ${safeMessage}\n`
  fs.appendFileSync(logFile, line)
}

module.exports = { initLogger, logToFile }
