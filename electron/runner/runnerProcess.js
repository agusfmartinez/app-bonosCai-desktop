const { chromium } = require("playwright");
const { runAutomation } = require("./automation");

let browser = null
let context = null
let page = null
let stopFlag = false

process.on('message', async (msg) => {
  if (msg.type === 'run') {
    stopFlag = false

    try {
      process.send({
        type: 'log',
        payload: { level: 'info', message: 'Iniciando automatización...' },
      })

      // 🔑 CREAR BROWSER (VISIBLE)
      browser = await chromium.launch({
        headless: false,
        args: ['--start-maximized'],
      })

      context = await browser.newContext({ viewport: null })
      page = await context.newPage()

      await runAutomation({
        ...msg.payload,
        page,
        pushLog: (m) => {
          process.send({ type: 'log', payload: { level: 'info', message: m } })
        },
        shouldStop: () => stopFlag,
      })

      process.send({
        type: 'log',
        payload: { level: 'success', message: '🏁 Automatización finalizada' },
      })

      process.send({ type: 'done' })

    } catch (err) {
      process.send({
        type: 'log',
        payload: { level: 'error', message: err.message },
      })
      process.send({ type: 'error', error: err.message })
    } finally {
      try {
        if (browser) await browser.close()
      } catch {}
      browser = null
      context = null
      page = null
    }
  }

  if (msg.type === 'stop') {
    stopFlag = true

    process.send({
      type: 'log',
      payload: { level: 'warning', message: 'Proceso detenido por el usuario.' },
    })

    try {
      if (browser) await browser.close()
    } catch {}

    process.exit(0)
  }
})
