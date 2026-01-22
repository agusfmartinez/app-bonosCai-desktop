const { chromium } = require("playwright");
const { runAutomation, loginProgrammatic } = require("./automation");
const { logStamp } = require("./helpers");

class Runner {
  constructor(sendLog) {
    this.browser = null;
    this.context = null;
    this.page = null;
    this.running = false;
    this.stopFlag = false;
    this.sendLog = sendLog;
  }

  log(message, level = "info") {
    const line = `${logStamp()} ${message}`;
    if (this.sendLog) {
      this.sendLog({ level, message: line });
    }
    console.log(line);
  }

  async login({ email, password, loginUrl }) {
    if (this.running) {
      throw new Error("Automatización en curso");
    }

    this.log("🔐 Iniciando sesión");

    this.browser = await chromium.launch({
      headless: false,
      args: ["--start-maximized"],
    });

    this.context = await this.browser.newContext({ viewport: null });
    this.page = await this.context.newPage();

    await this.page.goto(loginUrl, { waitUntil: "load" });

    const result = await loginProgrammatic({
      page: this.page,
      email,
      password,
      cookieName: "bolvipwebappauth",
      pushLog: (m) => this.log(m),
    });

    if (!result.ok) {
      throw new Error(result.error || "Login fallido");
    }

    this.log("✅ Login exitoso");
    return result;
  }

  async run(config) {
    if (this.running) {
      throw new Error("Ya hay una automatización en curso");
    }

    this.running = true;
    this.stopFlag = false;

    try {
      this.log("▶️ Iniciando automatización");

      if (!this.browser) {
        this.browser = await chromium.launch({
          headless: false,
          args: ["--start-maximized"],
        });
        this.context = await this.browser.newContext({ viewport: null });
      }

      this.page = await this.context.newPage();

      await runAutomation({
        ...config,
        page: this.page,
        pushLog: (m) => this.log(m),
        shouldStop: () => this.stopFlag,
      });

      this.log("🏁 Automatización finalizada");
    } catch (err) {
      this.log(`❌ Error: ${err.message}`, "error");
    } finally {
      this.running = false;
      try {
        if (this.browser) await this.browser.close();
      } catch {}
      this.browser = null;
    }

    return { ok: true };
  }

  async stop() {
    this.log("⏹️ Stop solicitado");
    this.stopFlag = true;
    try {
      if (this.browser) await this.browser.close();
    } catch {}
    this.running = false;
    return true;
  }
}

module.exports = Runner;
