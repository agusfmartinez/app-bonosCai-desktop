const { fork } = require('child_process')
const path = require('path')
const RunnerState = require('./RunnerState')

class RunnerManager {
  constructor(onLog) {
    this.onLog = onLog
    this.child = null
    this.state = new RunnerState()
    this.pending = null
    this.mode = null
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
        this.onLog(msg.payload)
      }

      if (msg.type === 'paused') {
        this.state.set('paused')
        this.onLog({ level: 'warning', message: 'Automatización pausada. Esperando acción del usuario.' })
      }

      if (msg.type === 'login-result') {
        finish(msg.payload)
      }

      if (msg.type === 'done') {
        this.state.set('done')
        this.onLog({ level: 'info', message: 'Runner finalizado' })
        this.child.kill()
        this.child = null
        if (this.mode === 'login') {
          finish({ ok: true })
        }
      }

      if (msg.type === 'error') {
        const message = msg.error || 'Error desconocido en runner'
        this.state.set('error', message)
        this.onLog({ level: 'error', message })
        this.child.kill()
        this.child = null
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
        this.onLog({ level: 'info', message: 'Runner finalizado' })
        if (this.mode === 'login') {
          finish({ ok: false, error: 'Login cancelado por usuario' })
        }
      }
      this.child = null
    })
  }

  run(config) {
    if (!this.state.canRun()) {
      return { ok: false, reason: 'already-running' }
    }

    this.mode = 'run'
    const runnerPath = path.join(__dirname, 'runnerProcess.js')
    this.child = fork(runnerPath)

    this.state.set('running')
    this.onLog({ level: 'info', message: 'Runner iniciado' })

    this.attachChildHandlers()

    this.child.send({ type: 'run', payload: config })
    return { ok: true }
  }

  login(config) {
    if (!this.state.canRun()) {
      return { ok: false, reason: 'already-running' }
    }

    this.mode = 'login'
    const runnerPath = path.join(__dirname, 'runnerProcess.js')
    this.child = fork(runnerPath)

    this.state.set('running')
    this.onLog({ level: 'info', message: 'Iniciando login...' })

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
    this.onLog({ level: 'warning', message: 'Deteniendo runner...' })

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
