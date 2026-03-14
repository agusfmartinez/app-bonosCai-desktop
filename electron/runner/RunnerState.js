class RunnerState {
  constructor() {
    this.status = 'idle' // idle | running | stopping | paused | error | done
    this.error = null
  }

  set(status, error = null) {
    this.status = status
    this.error = error
  }

  get() {
    return {
      status: this.status,
      error: this.error,
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
