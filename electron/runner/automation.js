const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");
const { logStamp } = require("./helpers");

async function loginProgrammatic({
  page,
  email,
  password,
  cookieName,
  pushLog,
}) {
  try {
    // ⚠️ Ajustá estos selectores a los reales del formulario de Boleteriavip:
    const selEmail = 'input[type="email"]';
    const selPass = 'input[type="password"]';
    const selBtn = 'button[type="submit"]';
    const eventLinkSelector = 'a.btn-cai:has-text("Entradas")';

    // Esperá y completá
    if (
      await waitForSelectorWithLog(
        page,
        selEmail,
        8000,
        "Select Email",
        pushLog
      )
    ) {
      await page.fill(selEmail, email);
    } else {
      return { ok: false, cookies: [], error: "No se encontró campo Email" };
    }

    if (
      await waitForSelectorWithLog(
        page,
        selPass,
        8000,
        "Select Password",
        pushLog
      )
    ) {
      await page.fill(selPass, password);
    } else {
      return { ok: false, cookies: [], error: "No se encontró campo Password" };
    }

    // Click submit + esperar navegación
    if (
      !(await waitForSelectorWithLog(
        page,
        selBtn,
        15000,
        "Botón Login",
        pushLog
      ))
    ) {
      return { ok: false, cookies: [], error: "No se encontró botón de Login" };
    }

    await Promise.all([
      page.waitForNavigation({ waitUntil: "load", timeout: 60000 }),
      page.click(selBtn),
    ]);

    let eventUrl = null;
    if (
      await waitForSelectorWithLog(
        page,
        eventLinkSelector,
        15000,
        "Botón Evento",
        pushLog
      )
    ) {
      eventUrl = await page.$eval(eventLinkSelector, (el) => el.href);
    } else {
      return {
        ok: false,
        cookies: [],
        error: "No se encontró botón del Evento",
      };
    }

    // Validación de login por cookie
    const ctx = page.context();
    if (!ctx) {
      pushLog("🧹 Contexto cerrado.");
      return { ok: false, cookies: [], error: "Contexto cerrado." };
    }
    const cookies = await ctx.cookies();
    const ok = cookies.some((c) => c.name === cookieName);
    if (!ok)
      return {
        ok: false,
        cookies: [],
        error: "No se detectó cookie de sesión",
      };

    pushLog("✅ Login detectado por cookie de sesión");
    return { cookies, ok: true, eventUrl };
  } catch (e) {
    // Si el cierre ocurrió entre chequeos, salimos sin explotar
    const msg = String(e?.message || e);
    if (msg.includes("closed") || msg.includes("Target page")) {
      pushLog("🧹 Se cerró el navegador durante el login.");
      return { ok: false, cookies: [], error: "Navegador cerrado" };
    }
    return { ok: false, cookies: [], error: msg };
  }
}

async function waitForSelectorWithLog(
  page,
  selector,
  timeoutMs,
  label,
  pushLog
) {
  pushLog(`🔎 Buscando selector: ${label || selector}`);
  try {
    await page.waitForSelector(selector, { timeout: timeoutMs });
    pushLog(`✅ Selector encontrado: ${label || selector}`);
    return true;
  } catch {
    pushLog(`❌ Selector NO encontrado: ${label || selector}`);
    return false;
  }
}

async function esperarFormulario(
  page,
  url,
  horaHabilitacion,
  pushLog,
  shouldStop
) {
  let intento = 1;
  const [h, m, s = 0] = (horaHabilitacion || "00:00:00").split(":").map(Number);
  const horaObj = new Date();
  horaObj.setHours(h, m, s, 0);

  while (true) {
    if (shouldStop && shouldStop()) throw new Error("Stop solicitado");
    if (!page || page.isClosed()) throw new Error("Página cerrada");
    const ahora = new Date();

    pushLog(
      `🔁 Intento #${intento}: chequeando disponibilidad de formulario...`
    );
    await page.goto(url, { waitUntil: "load" });
    const ok = await waitForSelectorWithLog(
      page,
      "form#mainForm, select#EventSectorSectionId",
      5000,
      "Formulario",
      pushLog
    );
    if (ok) {
      pushLog("🚀 Formulario habilitado");
      return;
    } else if (ahora < horaObj) {
      const diff = Math.floor((horaObj - ahora) / 1000);
      if (intento % 30 === 0) {
        pushLog(
          `⏳ Aguardando hora objetivo ${horaObj}… faltan ${diff / 60}s.`
        );
      }
      await new Promise((r) => setTimeout(r, 2000));
      intento++;
      continue;
    } else {
      pushLog("↻ Recargando...");
      await page.reload({ waitUntil: "load" });
      intento++;
      continue;
    }
  }
}

/* Helpers Modo Test */
function fileUrlFromRootTest(fileName) {
  // __dirname está en ../server/automation
  const rootTest = path.resolve(__dirname, "test");
  const abs = path.join(rootTest, fileName);

  console.log(abs)

  if (!fs.existsSync(abs)) {
    throw new Error(`Archivo de test no encontrado: ${abs}`);
  }
  return `file://${abs.replace(/\\/g, "/")}`;
}

async function gotoWithLog(page, url, pushLog) {
  pushLog(`🌐 Navegando a: ${url}`);
  await page.goto(url, { waitUntil: "load" });
}


async function expectEnabledAndClick(
  page,
  selector,
  pushLog,
  nav = true,
  timeoutMs = 60000,
  simulateNextUrl = null
) {
  pushLog(`⌛ Esperando habilitación para ${selector}`);
  if (selector === "#buyButton") {
    await page.waitForFunction(
      () => {
        const btn = document.querySelector("#buyButton");
        return btn && !btn.disabled;
      },
      undefined,
      { timeout: 30000 }
    );
  } else {
    await page.waitForSelector(selector, { state: "attached", timeout: 30000 });
    await page.waitForSelector(selector, { state: "visible", timeout: 30000 });
  }
  pushLog(`🖱️ Click en ${selector}`);

  if (simulateNextUrl) {
    // En modo test, forzamos la navegación al archivo final
    await page.click(selector);
    await gotoWithLog(page, simulateNextUrl, pushLog);
    return;
  }

  if (nav) {
    await Promise.all([
      page.waitForNavigation({ waitUntil: "load", timeout: timeoutMs }),
      page.click(selector),
    ]);
  } else {
    await page.click(selector);
  }
}

async function runAutomation({
  page,
  url,
  sector,
  sectorName,
  cantidad,
  personas,
  horaHabilitacion,
  simulateLocal = false, // 👈 nuevo
  simulate = undefined, // 👈 nuevo { preFile, liveFile, finalFile, preMs }
  pushLog,
  shouldStop,
  userEmail,
}) {
  if (!simulateLocal) {
    await gotoWithLog(page, url, pushLog);
  } else {
    // Modo test
    const preFile = simulate?.preFile || "prueba3.html";
    const liveFile = simulate?.liveFile || "prueba.html";
    const confirmFile = simulate?.confirmFile || "prueba2.html";
    const finalFile = simulate?.finalFile || "prueba4.html";
    const preMs = simulate?.preMs ?? 10000;

    const preUrl = fileUrlFromRootTest(preFile);
    const liveUrl = fileUrlFromRootTest(liveFile);
    const confirmUrl = fileUrlFromRootTest(confirmFile);
    const finalUrl = fileUrlFromRootTest(finalFile);

    await gotoWithLog(page, preUrl, pushLog);
    pushLog(
      `🧪 Modo Test: esperando ${preMs}ms en ${preFile} antes de habilitar el formulario...`
    );
    if (shouldStop && shouldStop()) return;
    try {
      await page.waitForTimeout(preMs);
    } catch (e) {
      if (shouldStop && shouldStop()) return;
      throw e;
    }
    await gotoWithLog(page, liveUrl, pushLog);

    // Sobrescribimos "url" para el resto del flujo (ej: refrescos por hora objetivo)
    url = liveUrl;

    // Guardamos confirmUrl para usarlo en el click de “Siguiente”
    page._confirmTestUrl = confirmUrl;

    // Guardamos finalUrl para usarlo en el click de Confirmar
    page._finalTestUrl = finalUrl;
  }

  // Esperar que habilite el formulario (misma lógica real o test)
  await esperarFormulario(page, url, horaHabilitacion, pushLog, shouldStop);

  // Sector
  if (
    await waitForSelectorWithLog(
      page,
      "select#EventSectorSectionId",
      10000,
      "Select Sector",
      pushLog
    )
  ) {
    // Esperar que el select esté habilitado y con opciones
    await page.waitForFunction(
      () => {
        const sel = document.querySelector("select#EventSectorSectionId");
        return sel && !sel.disabled && sel.options && sel.options.length > 1;
      },
      undefined,
      { timeout: 10000 }
    );

    const desiredValue = String(sector ?? "").trim();
    const desiredLabel = String(sectorName ?? "").trim();

    // Resolver el value definitivo en el DOM
    const resolved = await page.$eval(
      'select#EventSectorSectionId',
      (sel, params) => {
        const { desiredValue, desiredLabel } = params;

        const norm = (s) =>
          (s || '')
            .normalize('NFD')
            .replace(/\p{Diacritic}/gu, '')
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .trim();

        const opts = Array.from(sel.options).filter(o => !o.disabled);

        // 1) Intento por value exacto
        const byValue = opts.find(o => String(o.value) === String(desiredValue));
        if (byValue) {
          return { value: byValue.value, label: byValue.textContent.trim(), foundBy: 'value' };
        }

        // 2) Fallback por label
        const want = norm(desiredLabel);
        if (want) {
          const exact = opts.find(o => norm(o.textContent) === want);
          if (exact) {
            return { value: exact.value, label: exact.textContent.trim(), foundBy: 'label-exact' };
          }
          const contains = opts.find(o => norm(o.textContent).includes(want));
          if (contains) {
            return { value: contains.value, label: contains.textContent.trim(), foundBy: 'label-contains' };
          }
        }

        return null;
      },
      { desiredValue, desiredLabel }
    );

    if (!resolved) {
      pushLog(`❌ Sector no encontrado.Buscado value = "${desiredValue}" o nombre = "${desiredLabel}"`);
      throw new Error(`SECTOR_NOT_FOUND(value = "${desiredValue}", name = "${desiredLabel}")`);
    }

    const changed = await page.selectOption(
      "select#EventSectorSectionId",
      resolved.value
    );

    if (!changed || changed.length === 0) {
      pushLog(`❌ No se pudo seleccionar el sector(value = "${resolved.value}", nombre = "${resolved.label}")`);
      throw new Error(`SECTOR_SELECT_FAILED(value = "${resolved.value}", name = "${resolved.label}")`);
    }

    pushLog(`✅ Sector seleccionado (${resolved.foundBy}): ${resolved.label} [value=${resolved.value}]`);
  } else {
    pushLog("❌ No se pudo seleccionar sector (select no visible)");
    throw new Error("SECTOR_SELECT_FAILED (select not visible)");
  }

  // Cantidad
  if (
    await waitForSelectorWithLog(
      page,
      "select#Quantity",
      8000,
      "Select Cantidad",
      pushLog
    )
  ) {
    await page.selectOption("select#Quantity", String(cantidad));
  } else {
    throw new Error("No se pudo seleccionar cantidad");
  }

  // Personas
  if (!Array.isArray(personas) || personas.length < cantidad) {
    throw new Error("personas[] insuficiente para la cantidad");
  }
  for (let i = 0; i < Number(cantidad); i++) {
    const { socio, dni } = personas[i];
    pushLog(`📝 Persona #${i + 1} socio=${socio} dni=${dni}`);

    const selSocio = `#NewTicketItems_${i}__Numero`;
    if (
      !(await waitForSelectorWithLog(
        page,
        selSocio,
        10000,
        `Número socio ${i + 1}`,
        pushLog
      ))
    ) {
      throw new Error(`No se encontró ${selSocio}`);
    }
    await page.fill(selSocio, String(socio));

    const selDni = `#NewTicketItems_${i}__Documento`;
    if (
      !(await waitForSelectorWithLog(
        page,
        selDni,
        10000,
        `Documento ${i + 1}`,
        pushLog
      ))
    ) {
      throw new Error(`No se encontró ${selDni}`);
    }
    await page.fill(selDni, String(dni));
  }

  // Continuar a pagina confirmacion
  await expectEnabledAndClick(page, "#buyButton", pushLog, true, 60000);

  // Segunda página: TyC
  if (
    await waitForSelectorWithLog(
      page,
      "#TermsAndConditions",
      30000,
      "Checkbox TyC",
      pushLog
    )
  ) {
    await page.check("#TermsAndConditions");
    pushLog("☑️ Bonos confirmados con éxito");
  } else {
    throw new Error("No se encontró checkbox TyC");
  }

//   const screenshot1 = await takeScreenshot(page)
//   pushLog(`📸​ Captura tomada: ${screenshot1}`);

  // “Siguiente” → si estamos en test, forzamos navegación a formulario confirmacion
  // const simulateNextUrl = simulateLocal ? page._finalTestUrl : null;
  await expectEnabledAndClick(page, "#rcc_redirect", pushLog, true, 60000);

  await page.waitForLoadState("load");

//   const screenshot2 = await takeScreenshot(page)
//   pushLog(`Captura tomada: ${screenshot2}`);

  pushLog(`✅ Final URL: ${page.url()}`);

}

module.exports = {
  runAutomation,
  loginProgrammatic,
};
