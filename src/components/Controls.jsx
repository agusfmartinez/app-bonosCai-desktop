import React from 'react'
import { cardClass, runButtonClass, testButtonClass, stopButtonClass } from '../styles/classes'


export default function Controls({
  status,
  onRun,
  onRunTest,
  onStop,
  showTestToggle = false,
  showFinalizeToggle = true,
  finalizePurchase = true,
  onToggleFinalize,
}) {
  const isRunning = status === 'running' || status === 'stopping' || status === 'paused'

  return (
    <section className={cardClass}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Controles</h2>
          <p className="mt-1 text-sm text-white">
            Estado actual: <b>{status}</b>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {showFinalizeToggle && (
            <label className="flex items-center gap-2 text-sm text-white">
              <span className="inline-flex items-center gap-2">
                Finalizar compra
                <span
                  className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-white/15 text-[10px] font-bold text-white/80"
                  title="Si desactivás Finalizar compra, el bot completa el formulario y deja la confirmación final para que la hagas manualmente."
                >
                  ?
                </span>
              </span>
              <button
                type="button"
                onClick={() => onToggleFinalize && onToggleFinalize(!finalizePurchase)}
                className={`relative inline-flex h-6 w-12 items-center rounded-full transition ${
                  finalizePurchase ? 'bg-emerald-500' : 'bg-slate-500/60'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                    finalizePurchase ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className="text-xs text-white/70">
                {finalizePurchase ? 'Sí' : 'No'}
              </span>
            </label>
          )}

          <button
            onClick={onRun}
            disabled={isRunning}
            className={runButtonClass}
          >
            {isRunning ? 'Ejecutando…' : 'Ejecutar automatización'}
          </button>

          {onRunTest && (
            <button
              onClick={onRunTest}
              disabled={isRunning}
              className={testButtonClass}
            >
              {isRunning ? 'Ejecutando…' : 'Ejecutar modo test'}
            </button>
          )}

          <button
            onClick={onStop}
            disabled={!isRunning}
            className={stopButtonClass}
          >
            Detener
          </button>
        </div>
      </div>
    </section>
  )
}



