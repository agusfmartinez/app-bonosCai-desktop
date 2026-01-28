const { fork } = require('child_process')
const path = require('path')
const RunnerState = require('./RunnerState')

class RunnerManager {
  constructor(onLog) {
    this.onLog = onLog
    this.child = null
    this.state = new RunnerState()
  }

  run(config) {
    if (!this.state.canRun()) {
      return { ok: false, reason: 'already-running' }
    }

    const runnerPath = path.join(__dirname, 'runnerProcess.js')
    this.child = fork(runnerPath)

    this.state.set('running')
    this.onLog({ level: 'info', message: 'Runner iniciado' })

    this.child.on('message', (msg) => {
      if (msg.type === 'log') {
        this.onLog(msg.payload)
      }

      if (msg.type === 'done') {
        this.state.set('done')
        this.onLog({ level: 'info', message: 'Runner finalizado' })
        this.child.kill()
        this.child = null
      }

      if (msg.type === 'error') {
        const message = msg.error || 'Error desconocido en runner'
        this.state.set('error', message)
        this.onLog({ level: 'error', message })
        this.child.kill()
        this.child = null
      }
    })

    this.child.on('exit', () => {
      if (this.state.status === 'running') {
        this.state.set('error', 'Runner finalizó inesperadamente')
      }
      if (this.state.status === 'stopping') {
        this.state.set('done')
        this.onLog({ level: 'info', message: 'Runner finalizado' })
      }
      this.child = null
    })

    this.child.send({ type: 'run', payload: config })
    return { ok: true }
  }

  stop() {
    if (!this.state.canStop()) {
      return { ok: false, reason: 'not-running' }
    }

    this.state.set('stopping')
    this.onLog({ level: 'warning', message: 'Deteniendo runner...' })

    this.child.send({ type: 'stop' })
    return { ok: true }
  }

  getStatus() {
    return this.state.get()
  }
}

module.exports = RunnerManager
