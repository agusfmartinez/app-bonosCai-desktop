try {
  require("dotenv/config");
} catch {}
const fs = require("fs");
const path = require("path");
if (process.env.APP_PACKAGED === "true" && !process.env.PLAYWRIGHT_BROWSERS_PATH) {
  process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(process.resourcesPath, "playwright-browsers")
}
const { chromium } = require("playwright");
const { runAutomation, loginProgrammatic } = require("./automation");

const COOKIES_PATH = path.join(__dirname, "cookies.json");
const COOKIES_TTL_SECONDS = 10800;
const LOGIN_URL = "https://cai.boleteriavip.com.ar/ingresar";
const COOKIE_NAME = "bolvipwebappauth";

async function detectEventUrl(page) {
  try {
    const selector = 'a.btn-cai:has-text("Entradas")';
    await page.waitForSelector(selector, { timeout: 8000 });
    return await page.$eval(selector, (el) => el.href);
  } catch {
    return null;
  }
}

function loadCookiesFromFile() {
  try {
    if (!fs.existsSync(COOKIES_PATH)) return null;
    const raw = fs.readFileSync(COOKIES_PATH, "utf-8");
    const data = JSON.parse(raw);
    const savedAt = Number(data?.savedAt || 0);
    if (!savedAt) return null;
    const ageSeconds = (Date.now() - savedAt) / 1000;
    if (ageSeconds > COOKIES_TTL_SECONDS) {
      return null;
    }
    return {
      cookies: Array.isArray(data?.cookies) ? data.cookies : [],
      eventUrl: data?.eventUrl || null,
    };
  } catch {
    return null;
  }
}

function saveCookiesToFile(cookies, eventUrl = null) {
  try {
    const payload = {
      savedAt: Date.now(),
      cookies,
      eventUrl,
    };
    fs.writeFileSync(COOKIES_PATH, JSON.stringify(payload, null, 2));
  } catch {}
}

let browser = null
let context = null
let page = null
let stopFlag = false

function sendFatalError(err) {
  const message = err?.stack || err?.message || String(err)
  try {
    process.send({ type: 'log', payload: { level: 'error', message } })
  } catch {}
  try {
    process.send({ type: 'error', error: message })
  } catch {}
}

process.on('uncaughtException', (err) => {
  sendFatalError(err)
})

process.on('unhandledRejection', (err) => {
  sendFatalError(err)
})

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
      const cached = loadCookiesFromFile()
      const cachedCookies = cached?.cookies || []
      if (cachedCookies.length) {
        try {
          await context.addCookies(cachedCookies)
          process.send({
            type: 'log',
            payload: { level: 'info', message: '🍪 Cookies cargadas desde disco.' },
          })
        } catch (e) {
          process.send({
            type: 'log',
            payload: { level: 'warning', message: 'No se pudieron inyectar cookies guardadas.' },
          })
        }
      }
      page = await context.newPage()

      await runAutomation({
        ...msg.payload,
        page,
        onPause: async () => {
          process.send({ type: 'paused' })
          while (!stopFlag) {
            await new Promise((r) => setTimeout(r, 500))
          }
        },
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
      const message = err?.stack || err?.message || String(err)
      const isClosed =
        typeof message === 'string' &&
        (message.includes('closed') || message.includes('Target page'))
      if (stopFlag || isClosed) {
        process.send({
          type: 'log',
          payload: { level: 'warning', message: 'Proceso detenido por el usuario.' },
        })
        process.send({ type: 'done' })
        return
      }
      process.send({
        type: 'log',
        payload: { level: 'error', message },
      })
      process.send({ type: 'error', error: message })
    } finally {
      try {
        if (browser) await browser.close()
      } catch {}
      browser = null
      context = null
      page = null
    }
  }

  if (msg.type === 'login') {
    stopFlag = false
    const { email, password, loginUrl, cookieName } = msg.payload || {}

    try {
      process.send({
        type: 'log',
        payload: { level: 'info', message: '🔐 Iniciando sesión CAI...' },
      })

      browser = await chromium.launch({
        headless: false,
        args: ['--start-maximized'],
      })

      context = await browser.newContext({ viewport: null })
      const cachedCookies = loadCookiesFromFile()
      if (cachedCookies && cachedCookies.length) {
        try {
          await context.addCookies(cachedCookies)
          process.send({
            type: 'log',
            payload: { level: 'info', message: '🍪 Cookies cargadas desde disco.' },
          })
        } catch {}
      }

      page = await context.newPage()
      await page.goto(loginUrl || LOGIN_URL, { waitUntil: "load" })

      let result = null
      const existingEventUrl = await detectEventUrl(page)
      if (existingEventUrl) {
        const cookies = await context.cookies()
        result = { ok: true, eventUrl: existingEventUrl, cookies }
      } else if (email && password) {
        result = await loginProgrammatic({
          page,
          email,
          password,
          cookieName: cookieName || COOKIE_NAME,
          pushLog: (m) => process.send({ type: 'log', payload: { level: 'info', message: m } }),
        })
      }

      if (!result || !result.ok) {
        if (stopFlag || !browser) {
          throw new Error("Login cancelado por usuario")
        }
        const eventUrl = await detectEventUrl(page)
        let cookies = []
        try {
          cookies = await context.cookies()
        } catch {
          cookies = []
        }
        const hasCookie = cookies.some((c) => c.name === (cookieName || COOKIE_NAME))
        if (eventUrl || hasCookie) {
          result = { ok: true, eventUrl, cookies }
        } else {
          throw new Error(result?.error || "Login no exitoso")
        }
      }

      if (result?.cookies?.length) {
        saveCookiesToFile(result.cookies, result?.eventUrl || null)
        process.send({
          type: 'log',
          payload: { level: 'info', message: '🍪 Cookies guardadas en disco.' },
        })
      }

      process.send({ type: 'login-result', payload: { ok: true, eventUrl: result?.eventUrl || null } })
      process.send({ type: 'done' })
    } catch (err) {
      const message = err?.stack || err?.message || String(err)
      const isClosed =
        typeof message === 'string' &&
        (message.includes('closed') || message.includes('Target page'))
      if (stopFlag || isClosed || message.includes("Login cancelado")) {
        process.send({
          type: 'log',
          payload: { level: 'warning', message: 'Proceso detenido por el usuario.' },
        })
        process.send({ type: 'done' })
      } else {
        process.send({
          type: 'log',
          payload: { level: 'error', message },
        })
        process.send({ type: 'error', error: message })
      }
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
