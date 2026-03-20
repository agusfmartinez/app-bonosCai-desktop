const { fork } = require('child_process')
const path = require('path')
const crypto = require('crypto')
const RunnerState = require('./RunnerState')

class RunnerManager {
  constructor(onLog) {
    this.onLog = onLog
    this.child = null
    this.state = new RunnerState()
    this.pending = null
    this.mode = null
    this.currentRunId = null
  }

  emitLog(payload) {
    if (!payload || typeof payload !== 'object') {
      return this.onLog(payload)
    }
    const meta = payload.meta && typeof payload.meta === 'object' ? payload.meta : {}
    const withRun = this.currentRunId
      ? { ...payload, meta: { ...meta, runId: this.currentRunId } }
      : payload
    return this.onLog(withRun)
  }

  attachChildHandlers() {
    const finish = (result) => {
      if (!this.pending) return
      const done = this.pending
      this.pending = null
      done(result)
    }

    this.child.on('message', (msg) => {
      if (msg.type === 'log') {
        this.emitLog(msg.payload)
      }

      if (msg.type === 'paused') {
        this.state.set('paused')
        this.emitLog({ level: 'warning', message: 'Automatizaci?n pausada. Esperando acci?n del usuario.' })
      }

      if (msg.type === 'login-result') {
        finish(msg.payload)
      }

      if (msg.type === 'done') {
        this.state.set('done')
        this.emitLog({ level: 'info', message: 'Runner finalizado' })
        this.child.kill()
        this.child = null
        this.currentRunId = null
        if (this.mode === 'login') {
          finish({ ok: true })
        }
      }

      if (msg.type === 'error') {
        const message = msg.error || 'Error desconocido en runner'
        this.state.set('error', message)
        this.emitLog({ level: 'error', message })
        this.child.kill()
        this.child = null
        this.currentRunId = null
        finish({ ok: false, error: message })
      }
    })

    this.child.on('exit', () => {
      if (this.state.status === 'running') {
        this.state.set('error', 'Runner finaliz? inesperadamente')
        if (this.mode === 'login') {
          finish({ ok: false, error: 'Runner finaliz? inesperadamente' })
        }
      }
      if (this.state.status === 'stopping') {
        this.state.set('done')
        this.emitLog({ level: 'info', message: 'Runner finalizado' })
        if (this.mode === 'login') {
          finish({ ok: false, error: 'Login cancelado por usuario' })
        }
      }
      this.child = null
      this.currentRunId = null
    })
  }

  run(config) {
    if (!this.state.canRun()) {
      return { ok: false, reason: 'already-running' }
    }

    this.mode = 'run'
    const runId = crypto.randomUUID()
    this.currentRunId = runId
    const runnerPath = path.join(__dirname, 'runnerProcess.js')
    this.child = fork(runnerPath)

    this.state.set('running')
    this.emitLog({ level: 'info', message: 'Runner iniciado', meta: { runId } })

    this.attachChildHandlers()

    this.child.send({ type: 'run', payload: config })
    return { ok: true }
  }

  login(config) {
    if (!this.state.canRun()) {
      return { ok: false, reason: 'already-running' }
    }

    this.mode = 'login'
    this.currentRunId = null
    const runnerPath = path.join(__dirname, 'runnerProcess.js')
    this.child = fork(runnerPath)

    this.state.set('running')
    this.emitLog({ level: 'info', message: 'Iniciando login...' })

    const promise = new Promise((resolve) => {
      this.pending = resolve
    })

    this.attachChildHandlers()
    this.child.send({ type: 'login', payload: config })
    return promise
  }

  stop() {
    if (!this.state.canStop()) {
      return { ok: false, reason: 'not-running' }
    }

    this.state.set('stopping')
    this.emitLog({ level: 'warning', message: 'Deteniendo runner...' })

    if (this.child) {
      this.child.send({ type: 'stop' })
    } else {
      this.state.set('done')
      if (this.mode === 'login' && this.pending) {
        const done = this.pending
        this.pending = null
        done({ ok: false, error: 'Login cancelado por usuario' })
      }
    }
    return { ok: true }
  }

  getStatus() {
    return this.state.get()
  }
}

module.exports = RunnerManager
