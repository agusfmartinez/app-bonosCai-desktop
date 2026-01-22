class Runner {
  async run(config) {
    return { ok: true }
  }

  async stop() {
    return true
  }
}

module.exports = new Runner()
