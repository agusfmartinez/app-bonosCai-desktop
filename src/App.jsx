import React, { useEffect, useRef, useState } from "react";
import PersonasForm from "./components/PersonasForm.jsx";
import Controls from "./components/Controls.jsx";
import LogsViewer from "./components/LogsViewer.jsx";
import LoginBox from "./components/LoginBox.jsx";
import { cardClass, inputClass, baseButtonClass, loginButtonClass } from "./styles/classes";
import { useNavigate } from "react-router-dom";

import { supabase } from "./lib/supabase";
import { clearSession } from "./lib/session";

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
  personas: [{ socio: "", dni: "" }],
};

const normalizeConfig = (cfg) => {
  if (!cfg) return null;
  const validValues = new Set(SECTORES.map((s) => s.value));
  const sector = validValues.has(cfg.sector) ? cfg.sector : "";
  const found = SECTORES.find((s) => s.value === sector);

  return {
    url: cfg.url || "",
    sector,
    sectorName: found ? found.label : "",
    cantidad: Number(cfg.cantidad) || 1,
    horaHabilitacion: cfg.horaHabilitacion || "",
    personas: Array.isArray(cfg.personas) && cfg.personas.length
      ? cfg.personas
      : [{ socio: "", dni: "" }],
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

  const navigate = useNavigate();

  const { status, error } = useRunnerStatus()
  const isRunning = status === 'running' || status === 'stopping'

  // Carga inicial
  useEffect(() => {
    let cancelled = false;

    const loadConfig = async () => {
      const local = await window.api.loadConfig()
      if (local && !cancelled) {
        setConfig(normalizeConfig(local))
      }
    };

    loadConfig();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let mounted = true
    const checkLogin = async () => {
      try {
        const res = await window.api.getLoginStatus()
        if (!mounted) return
        setIsLogged(!!res?.ok)
      } catch {
        if (!mounted) return
        setIsLogged(false)
      }
    }
    checkLogin()
    return () => { mounted = false }
  }, [])

  // SSE 
  useEffect(() => {
    const handler = (log) => {
      setLogs((prev) => [...prev, log])
    }

    window.api.onLog(handler)

    return () => {
      window.api.offLog?.(handler)
    }
  }, [])


  const guardarConfig = async () => {
    await window.api.saveConfig(config)
    localStorage.setItem("bonosConfig", JSON.stringify(config))
    setEditMode(false)
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
      // payload normal por defecto
      let payload = { ...config, email, password };

      // si es test, agregamos flags para backend (sin romper el formato original)
      if (isTest) {
        payload = {
          ...config,
          simulateLocal: true,
          simulate: {
            preFile: "prueba3.html", // pantalla “todavía no habilitado”
            liveFile: "prueba.html", // formulario habilitado
            confirmFile: "prueba2.html", // formulario confirmar 
            finalFile: "prueba4.html", // post-compra
            preMs: 10000, // 10s simulando espera/cola
          },
        };
      } 

      const res = await window.api.run(payload);
      if (!res.ok) throw new Error(res.msg || 'No se pudo iniciar')

    } catch (e) {
      setLogs(prev => [...prev, { level: 'error', message: e.message }])
    } 
  };

  const handleStop = async () => {
    await window.api.stop();
  };

  // helpers
  const setCantidad = (n) => {
    const cantidad = Number(n);
    const personas = [...config.personas];
    while (personas.length < cantidad) personas.push({ socio: "", dni: "" });
    while (personas.length > cantidad) personas.pop();
    setConfig((c) => ({ ...c, cantidad, personas }));
  };

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
            <span className="text-xs font-semibold uppercase tracking-[0.4em] text-black-400">
              Bonos CAI
            </span>
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

            {/* SELECT de Cantidad 1..6 */}
            <label className="flex flex-col gap-2 text-sm font-medium text-white">
              <span className="text-xs uppercase tracking-wide text-white">
                Cantidad
              </span>
              <select
                className={inputClass}
                value={config.cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                disabled={!editMode || isRunning}
              >
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? "persona" : "personas"}
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
          onChange={(personas) => setConfig({ ...config, personas })}
          disabled={!editMode || isRunning}
        />

        <Controls
          status={status}
          onRun={() => handleRun(false)} // real
          onRunTest={() => handleRun(true)} // test
          onStop={handleStop}
        />

        <LogsViewer logs={logs} onClear={() => setLogs([])} />
      </div>
    </div>
  );
}



