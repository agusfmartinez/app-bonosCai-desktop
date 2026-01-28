import React from 'react'
import { cardClass, runButtonClass, testButtonClass, stopButtonClass } from '../styles/classes'


export default function Controls({ status, onRun, onRunTest, onStop }) {
  const isRunning = status === 'running' || status === 'stopping'

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
          <button
            onClick={onRun}
            disabled={isRunning}
            className={runButtonClass}
          >
            {isRunning ? 'Ejecutando…' : 'Ejecutar automatización'}
          </button>

          <button
            onClick={onRunTest}
            disabled={isRunning}
            className={testButtonClass}
          >
            {isRunning ? 'Ejecutando…' : 'Ejecutar modo test'}
          </button>

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



