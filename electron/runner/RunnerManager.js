const { fork } = require('child_process')
const path = require('path')

class RunnerManager {
  constructor(onLog) {
    this.onLog = onLog
    this.child = null
  }

  run(config) {
    if (this.child) {
      return { ok: false, msg: 'Runner ya en ejecución' }
    }

    const runnerPath = path.join(__dirname, 'runnerProcess.js')
    this.child = fork(runnerPath)

    this.child.on('message', (msg) => {
      if (msg.type === 'log') {
        this.onLog(msg.payload)
      }
      if (msg.type === 'done' || msg.type === 'error') {
        this.child.kill()
        this.child = null
      }
    })

    this.child.on('exit', () => {
      this.child = null
    })

    this.child.send({ type: 'run', payload: config })
    return { ok: true }
  }

  stop() {
    if (!this.child) return { ok: false }
    this.child.send({ type: 'stop' })
    return { ok: true }
  }
}

module.exports = RunnerManager
