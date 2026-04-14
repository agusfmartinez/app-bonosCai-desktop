import React, { useEffect, useRef, useState } from "react";
import PersonasForm from "./components/PersonasForm.jsx";
import Controls from "./components/Controls.jsx";
import LogsViewer from "./components/LogsViewer.jsx";
import LoginBox from "./components/LoginBox.jsx";
import { cardClass, inputClass, baseButtonClass, loginButtonClass } from "./styles/classes";
import { useNavigate } from "react-router-dom";

import { supabase } from "./lib/supabase";
import { clearSession } from "./lib/session";
import { startRun, finishRun } from "./lib/runs";
import { getConfig, saveConfig } from "./lib/config";
import { useUpdater } from "./context/UpdateContext.jsx";

import { useRunnerStatus } from './hooks/useRunnerStatus'


const SECTORES = [
  { value: "52784", label: "PAVONI ALTA" },
  { value: "52074", label: "PAVONI BAJA" },
  { value: "52107", label: "SANTORO BAJA" },
];

const EMPTY_CONFIG = {
  url: "",
  sector: "",
  sectorName: "",
  cantidad: 1,
  horaHabilitacion: "",
  personas: [{ socio: "", dni: "", enabled: true }],
};

const RUN_ID_STORAGE_KEY = 'bp_current_run_id'
const RUN_CLIENT_ID_STORAGE_KEY = 'bp_current_client_run_id'
const RUN_STOP_STORAGE_KEY = 'bp_current_run_stopped'

const normalizeConfig = (cfg) => {
  if (!cfg) return null;
  const validValues = new Set(SECTORES.map((s) => s.value));
  const sector = validValues.has(cfg.sector) ? cfg.sector : "";
  const found = SECTORES.find((s) => s.value === sector);

  const rawPersonas = Array.isArray(cfg.personas) ? cfg.personas : []
  const normalizedPersonas = rawPersonas.length
    ? rawPersonas.map((p) => ({
        socio: p?.socio || "",
        dni: p?.dni || "",
        enabled: p?.enabled !== false,
      }))
    : [{ socio: "", dni: "", enabled: true }]

  return {
    url: cfg.url || "",
    sector,
    sectorName: found ? found.label : "",
    cantidad: Number(cfg.cantidad) || 1,
    horaHabilitacion: cfg.horaHabilitacion || "",
    personas: normalizedPersonas,
  };
};

export default function App() {
  const [isLogged, setIsLogged] = useState(false);
  const [running, setRunning] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [logs, setLogs] = useState([]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [config, setConfig] = useState(() => EMPTY_CONFIG);
  const [configLoading, setConfigLoading] = useState(true)
  const [appVersion, setAppVersion] = useState("")

  const navigate = useNavigate();

  const { status, error, manualReady } = useRunnerStatus()
  const { checkForUpdates } = useUpdater()
  const isRunning = status === 'running' || status === 'stopping' || status === 'paused'
  const isDev = import.meta.env.DEV
  const [finalizePurchase, setFinalizePurchase] = useState(true)
  const activeRunIdRef = useRef(null)
  const clientRunIdRef = useRef(null)
  const lastStatusRef = useRef(null)
  const stopRequestedRef = useRef(false)
  const lastLogRef = useRef({ key: null, ts: 0 })
  const manualPendingRef = useRef(false)

  const persistRunId = (runId, clientRunId) => {
    if (runId) localStorage.setItem(RUN_ID_STORAGE_KEY, runId)
    if (clientRunId) localStorage.setItem(RUN_CLIENT_ID_STORAGE_KEY, clientRunId)
    localStorage.setItem(RUN_STOP_STORAGE_KEY, '0')
  }

  const markRunStopped = () => {
    stopRequestedRef.current = true
    localStorage.setItem(RUN_STOP_STORAGE_KEY, '1')
  }

  const clearPersistedRun = () => {
    localStorage.removeItem(RUN_ID_STORAGE_KEY)
    localStorage.removeItem(RUN_CLIENT_ID_STORAGE_KEY)
    localStorage.removeItem(RUN_STOP_STORAGE_KEY)
  }

  // Carga inicial
  useEffect(() => {
    let cancelled = false;

    const loadConfig = async () => {
      try {
        const res = await getConfig()
        if (cancelled) return
        if (res.ok && res.lastConfig) {
          setConfig(normalizeConfig(res.lastConfig))
        } else {
          setConfig(EMPTY_CONFIG)
          if (!res.ok) {
            setLogs((prev) => [
              ...prev,
              { level: "error", message: "No se pudo cargar la configuración." },
            ])
          }
        }
      } finally {
        if (!cancelled) setConfigLoading(false)
      }
    };

    loadConfig();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let mounted = true
    const loadAppVersion = async () => {
      try {
        if (!window.api?.getAppInfo) return
        const info = await window.api.getAppInfo()
        if (mounted && info?.appVersion) {
          setAppVersion(info.appVersion)
        }
      } catch {
        // no-op
      }
    }
    loadAppVersion()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    let mounted = true
    const checkLogin = async () => {
      try {
        const res = await window.api.getLoginStatus()
        if (!mounted) return
        setIsLogged(!!res?.ok)
        if (res?.ok && res?.eventUrl && !config.url) {
          setConfig((prev) => ({ ...prev, url: res.eventUrl }))
        }
      } catch {
        if (!mounted) return
        setIsLogged(false)
      }
    }
    checkLogin()
    return () => { mounted = false }
  }, [config.url])

  useEffect(() => {
    const storedRunId = localStorage.getItem(RUN_ID_STORAGE_KEY)
    const storedClientRunId = localStorage.getItem(RUN_CLIENT_ID_STORAGE_KEY)
    if (!storedRunId || activeRunIdRef.current) return

    if (status === 'running' || status === 'paused' || status === 'stopping') {
      activeRunIdRef.current = storedRunId
      clientRunIdRef.current = storedClientRunId || null
      const stopped = localStorage.getItem(RUN_STOP_STORAGE_KEY) === '1'
      stopRequestedRef.current = stopped
      return
    }

    if (status === 'done' || status === 'error' || status === 'idle') {
      const stopped = localStorage.getItem(RUN_STOP_STORAGE_KEY) === '1'
      const finalStatus = status === 'error' || stopped ? 'error' : 'success'
      const message =
        status === 'error'
          ? error || 'Error en ejecución'
          : stopped
            ? 'Cancelado por usuario'
            : null
      finishRun(storedRunId, finalStatus, message, storedClientRunId)
      clearPersistedRun()
    }
  }, [status, error])

  useEffect(() => {
    if (!activeRunIdRef.current) {
      lastStatusRef.current = status
      return
    }
    if (lastStatusRef.current === status) return

    if (manualReady && !manualPendingRef.current && activeRunIdRef.current) {
      const runId = activeRunIdRef.current
      const clientRunId = clientRunIdRef.current
      manualPendingRef.current = true
      activeRunIdRef.current = null
      clientRunIdRef.current = null
      finishRun(runId, 'manual_pending', 'Pendiente de confirmación manual', clientRunId)
      clearPersistedRun()
      stopRequestedRef.current = false
      lastStatusRef.current = status
      return
    }

    if (status === 'done' || status === 'error') {
      const runId = activeRunIdRef.current
      const clientRunId = clientRunIdRef.current
      activeRunIdRef.current = null
      clientRunIdRef.current = null

      const wasStopped = stopRequestedRef.current
      const finalStatus = status === 'error' || wasStopped ? 'error' : 'success'
      const message =
        status === 'error'
          ? error || 'Error en ejecución'
          : wasStopped
            ? 'Cancelado por usuario'
            : null

      finishRun(runId, finalStatus, message, clientRunId)
      clearPersistedRun()
      stopRequestedRef.current = false
    }

    lastStatusRef.current = status
  }, [status, error, manualReady])

  // SSE 
  useEffect(() => {
    const handler = (log) => {
      const key = `${log?.level || 'info'}|${log?.message || ''}|${log?.meta?.runId || ''}`
      const now = Date.now()
      if (lastLogRef.current.key === key && now - lastLogRef.current.ts < 500) {
        return
      }
      lastLogRef.current = { key, ts: now }
      setLogs((prev) => [...prev, log])
    }

    window.api.onLog(handler)

    return () => {
      window.api.offLog?.(handler)
    }
  }, [])


  const guardarConfig = async () => {
    const result = await saveConfig(config)
    if (result.ok) {
      setEditMode(false)
      setLogs((prev) => [
        ...prev,
        { level: "success", message: "Configuración guardada." },
      ])
    } else {
      setLogs((prev) => [
        ...prev,
        { level: "error", message: "No se pudo guardar la configuración." },
      ])
    }
  };


  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) return
    setLogs((prev) => [
      ...prev,
      { level: "info", message: "Abriendo login..." },
    ]);
    try {
      const result = await window.api.login({ email, password })
      if (!result?.ok) throw new Error(result?.error || "Fallo login")
      if (result?.eventUrl) {
        setConfig((prev) => ({ ...prev, url: result.eventUrl }));
      }
      setIsLogged(true);
      setLogs((prev) => [
        ...prev,
        { level: "success", message: "Sesión lista." },
      ]);
    } catch (e) {
      setLogs((prev) => [
        ...prev,
        { level: "error", message: `Login falló: ${e.message}` },
      ]);
    }
  };

  const handleRun = async (isTest = false) => {
    try {
      stopRequestedRef.current = false

      const enabledPersonas = (config.personas || []).filter((p) => p?.enabled !== false)
      const finalConfig = { ...config, personas: enabledPersonas, cantidad: enabledPersonas.length }

      // payload normal por defecto
      let payload = { ...finalConfig, finalizePurchase };

      // si es test, agregamos flags para backend (sin romper el formato original)
      if (isTest) {
        payload = {
          ...finalConfig,
          finalizePurchase,
          simulateLocal: true,
          simulate: {
            preFile: "prueba3.html", // pantalla ???todav?a no habilitado???
            liveFile: "prueba.html", // formulario habilitado
            confirmFile: "prueba2.html", // formulario confirmar 
            finalFile: "prueba4.html", // post-compra
            preMs: 10000, // 10s simulando espera/cola
          },
        };
      } 

      const res = await window.api.run(payload);
      if (!res.ok) throw new Error(res.msg || 'No se pudo iniciar')

      const clientRunId = res.runId || null
      if (clientRunId) {
        clientRunIdRef.current = clientRunId
      }

      const start = await startRun(clientRunId)
      if (start.ok && start.runId) {
        activeRunIdRef.current = start.runId
        persistRunId(start.runId, clientRunId)
      } else {
        setLogs(prev => [...prev, { level: 'warning', message: 'No se pudo iniciar tracking de ejecuci?n.' }])
      }

    } catch (e) {
      if (activeRunIdRef.current) {
        const runId = activeRunIdRef.current
        const clientRunId = clientRunIdRef.current
        activeRunIdRef.current = null
        clientRunIdRef.current = null
        await finishRun(runId, 'error', e.message || String(e), clientRunId)
        clearPersistedRun()
      }
      setLogs(prev => [...prev, { level: 'error', message: e.message }])
    } 
  };

  const handleStop = async () => {
    markRunStopped()
    await window.api.stop();
  };

  // helpers
  const addPersona = () => {
    if (!editMode || isRunning) return
    if (config.personas.length >= 6) return
    const personas = [...config.personas, { socio: "", dni: "", enabled: true }]
    setConfig((c) => ({ ...c, personas, cantidad: personas.length }))
  }

  const removePersona = (idx) => {
    if (!editMode || isRunning) return
    if (config.personas.length <= 1) return
    const personas = config.personas.filter((_, i) => i !== idx)
    setConfig((c) => ({ ...c, personas, cantidad: personas.length }))
  }

  const togglePersona = (idx) => {
    if (!editMode || isRunning) return
    const personas = config.personas.map((p, i) => (
      i === idx ? { ...p, enabled: p.enabled === false ? true : false } : p
    ))
    setConfig((c) => ({ ...c, personas, cantidad: personas.length }))
  }

  const statusChipClass = `inline-flex items-center gap-2 rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-wide ${
    isLogged
      ? "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/30"
      : "bg-rose-500/15 text-rose-200 ring-1 ring-rose-500/30"
  }`;

  
  return (
    <div className="min-h-screen bg-gradient-to-b from-red-800 via-red-900 to-red-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-10 px-6 py-12 lg:px-10">
        <header className="space-y-3 flex">
          <div className="flex-wrap">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-[0.4em] text-black-400">
                Bonos CAI
              </span>
              <span className="rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white/80">
                v{appVersion || window.__APP_CONFIG__?.current_version || window.__APP_CONFIG__?.latest_version || '0.0.0'}
              </span>
            </div>
            <h1 className="text-4xl font-semibold text-white sm:text-5xl">
              Automatización de canje de bonos
            </h1>
            <p className="max-w-2xl text-sm text-white sm:text-base">
              Configurá los datos y controlá la automatización desde una sola
              pantalla.
            </p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <button
              className={loginButtonClass}
              onClick={() => checkForUpdates && checkForUpdates()}
              title="Buscar actualizaciones"
            >
              Buscar updates
            </button>
            <button
              className={loginButtonClass}
              onClick={() => window.location.reload()}
              title="Recargar"
            >
              <span className="inline-flex items-center gap-2">
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="23 4 23 10 17 10" />
                  <polyline points="1 20 1 14 7 14" />
                  <path d="M3.51 9a9 9 0 0 1 14.13-3.36L23 10" />
                  <path d="M20.49 15a9 9 0 0 1-14.13 3.36L1 14" />
                </svg>
                Recargar
              </span>
            </button>
            <button
              className={loginButtonClass}
              onClick={async () => {
                setIsLogged(false);
                setRunning(false);

                clearSession(); // limpia bp_token / bp_session_id
                await supabase.auth.signOut(); // cierra la sesión de Supabase

                navigate("/login", { replace: true });
              }}
            >
              Cerrar sesión
            </button>
          </div>
        </header>

        <section className={`${cardClass}`}>
          <h2 className="text-lg font-semibold text-white">Iniciar Sesión</h2>
          <p className="mt-1 text-sm text-white">
            Inicia sesión con tu usuario de CAI Boleteriavip.
          </p>

          <LoginBox
            isLogged={isLogged}
            running={isRunning}
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            onLogin={handleLogin}
          />
        </section>

        {configLoading ? (
          <section className={cardClass}>
            <p className="text-sm text-white">Cargando configuración...</p>
          </section>
        ) : (
          <>
        <section className={cardClass}>
          <div className="flex items-center gap-4">
            <div className="flex-wrap">
              <h2 className="text-lg font-semibold text-white">
                Configuración básica
              </h2>
              <p className="mt-1 text-sm text-white">
                URL, sector, cantidad y hora de habilitación que usará el bot.
              </p>
            </div>

            <div className="ml-auto flex items-center gap-3">
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                  editMode
                    ? "bg-sky-500/15 text-sky-200"
                    : "bg-red-700/40 text-white"
                }`}
              >
                {editMode ? "Edición habilitada" : "Edición bloqueada"}
              </span>
              {!editMode ? (
                <button
                  className={loginButtonClass}
                  onClick={() => setEditMode(true)}
                  disabled={isRunning} // no permitir entrar a edición mientras corre
                >
                  Modificar
                </button>
              ) : (
                <button
                  className={`${baseButtonClass} bg-emerald-500/90 text-white shadow-sm shadow-emerald-500/30 hover:bg-emerald-400`}
                  onClick={guardarConfig}
                >
                  Guardar
                </button>
              )}
            </div>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-medium text-white">
              <span className="text-xs uppercase tracking-wide text-white">
                URL del evento
              </span>
              <input
                className={inputClass}
                value={config.url}
                onChange={(e) => setConfig({ ...config, url: e.target.value })}
                disabled={!editMode || isRunning}
              />
            </label>

            {/* SELECT de Sector */}
            <label className="flex flex-col gap-2 text-sm font-medium text-white">
              <span className="text-xs uppercase tracking-wide text-white">
                Sector
              </span>
              <select
                className={inputClass}
                value={config.sector}
                onChange={(e) => {
                  const value = e.target.value;
                  const found = SECTORES.find(s => s.value === value);
                  setConfig({
                  ...config,
                  sector: value,
                  sectorName: found ? found.label : '',
                  });
                }}
                disabled={!editMode || isRunning}
              >
                <option value="" disabled>
                  Seleccionar sector
                </option>
                {SECTORES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-white">
              <span className="text-xs uppercase tracking-wide text-white">
                Hora habilitación (HH:MM:SS)
              </span>
              <input
                className={inputClass}
                value={config.horaHabilitacion}
                onChange={(e) =>
                  setConfig({ ...config, horaHabilitacion: e.target.value })
                }
                placeholder="18:00:00"
                disabled={!editMode || isRunning}
              />
            </label>
          </div>
        </section>

        <PersonasForm
          personas={config.personas}
          onChange={(personas) => setConfig({ ...config, personas, cantidad: personas.length })}
          onAdd={addPersona}
          onRemove={removePersona}
          onToggleEnabled={togglePersona}
          disabled={!editMode || isRunning}
          canAdd={config.personas.length < 6}
          canRemove={config.personas.length > 1}
          editMode={editMode}
        />

          </>
        )}

        <Controls
          status={status}
          onRun={() => handleRun(false)} // real
          onRunTest={isDev ? () => handleRun(true) : undefined} // test only in dev
          onStop={handleStop}
          showTestToggle={isDev}
          showFinalizeToggle
          finalizePurchase={finalizePurchase}
          onToggleFinalize={setFinalizePurchase}
        />

        <LogsViewer logs={logs} onClear={() => setLogs([])} />
      </div>
    </div>
  );
}



