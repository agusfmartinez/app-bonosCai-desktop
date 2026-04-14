class RunnerState {
  constructor() {
    this.status = 'idle' // idle | running | stopping | paused | error | done
    this.error = null
    this.manualReady = false
  }

  set(status, error = null) {
    this.status = status
    this.error = error
    if (status !== 'paused') {
      this.manualReady = false
    }
  }

  setManualReady(value) {
    this.manualReady = value
  }

  get() {
    return {
      status: this.status,
      error: this.error,
      manualReady: this.manualReady,
    }
  }

  canRun() {
    return this.status === 'idle' || this.status === 'done' || this.status === 'error'
  }

  canStop() {
    return this.status === 'running' || this.status === 'paused'
  }
}

module.exports = RunnerState
