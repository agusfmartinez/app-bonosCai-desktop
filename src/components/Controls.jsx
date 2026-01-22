import React from 'react'
import { cardClass, runButtonClass, testButtonClass, stopButtonClass } from '../styles/classes'


export default function Controls({ running, onRun, onRunTest, onStop }) {
  return (
    <section className={cardClass}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Controles</h2>
          <p className="mt-1 text-sm text-white">
            Inicia la automatizacion o detenla cuando necesites intervenir.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={onRun} disabled={running} className={runButtonClass}>
            {running ? 'Ejecutando...' : 'Ejecutar automatizacion'}
          </button>
          <button onClick={onRunTest} disabled={running} className={testButtonClass}>
            {running ? 'Ejecutando...' : 'Ejecutar modo test'}
          </button>
          <button onClick={onStop} disabled={!running} className={stopButtonClass}>
            Detener
          </button>
        </div>
      </div>
    </section>
  )
}


