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
    this.runStartTime = null
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
        this.emitLog({ level: 'warning', message: 'Automatización pausada. Esperando acción del usuario.' })
      }

      if (msg.type === 'login-result') {
        finish(msg.payload)
      }

      if (msg.type === 'done') {
        this.state.set('done')
        const durationMs = this.runStartTime
          ? Date.now() - this.runStartTime
          : null

        this.emitLog({
          level: 'info',
          message: 'Run finalizada',
          meta: {
            status: 'success',
            durationMs
          }
        })
        this.child.kill()
        this.child = null
        this.currentRunId = null
        this.runStartTime = null
        if (this.mode === 'login') {
          finish({ ok: true })
        }
      }

      if (msg.type === 'error') {
        const message = msg.error || 'Error desconocido en runner'
        this.state.set('error', message)
        const durationMs = this.runStartTime
          ? Date.now() - this.runStartTime
          : null

        this.emitLog({
          level: 'error',
          message: 'Run fallida',
          meta: {
            status: 'error',
            error: message,
            durationMs
          }
        })
        this.child.kill()
        this.child = null
        this.currentRunId = null
        this.runStartTime = null
        finish({ ok: false, error: message })
      }
    })

    this.child.on('exit', () => {
      if (this.state.status === 'running') {
        this.state.set('error', 'Runner finalizó inesperadamente')
        if (this.mode === 'login') {
          finish({ ok: false, error: 'Runner finalizó inesperadamente' })
        }
      }
      if (this.state.status === 'stopping') {
        this.state.set('done')
        const durationMs = this.runStartTime
          ? Date.now() - this.runStartTime
          : null

        this.emitLog({
          level: 'warning',
          message: 'Run finalizada (stop)',
          meta: {
            status: 'stopped',
            durationMs
          }
        })
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
    this.runStartTime = Date.now()
    const runnerPath = path.join(__dirname, 'runnerProcess.js')
    this.child = fork(runnerPath)

    this.state.set('running')
    this.emitLog({ 
      level: 'info', 
      message: 'Run iniciada', 
      meta: {
        sector: config.sector,
        cantidad: config.cantidad,
        personas: config.personas?.length
      } 
    })

    this.attachChildHandlers()

    this.child.send({ type: 'run', payload: config })
    return { ok: true, runId }
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
    this.emitLog({
      level: 'warning',
      message: 'Run detenida por usuario',
      meta: {
        status: 'stopped'
      }
    })

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
