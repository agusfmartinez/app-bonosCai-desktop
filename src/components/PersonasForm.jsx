import React from 'react'
import { cardClass, inputClass, loginButtonClass } from '../styles/classes'

export default function PersonasForm({ personas, onChange, onAdd, onRemove, disabled, canAdd, canRemove }) {
  const update = (idx, field, value) => {
    if (disabled) return
    const next = personas.map((p, i) => (i === idx ? { ...p, [field]: value } : p))
    onChange(next)
  }

  return (
    <section className={cardClass}>
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-lg font-semibold text-white">Personas</h2>
        <span className="text-xs uppercase tracking-wide text-white">{personas.length} cupos</span>
      </div>
      <p className="mt-1 text-sm text-white">
        Datos de socio y DNI de cada persona habilitada para comprar.
      </p>
      <div className="mt-6 space-y-5">
        {personas.map((p, i) => (
          <div
            key={i}
            className="rounded-lg border border-red-800 bg-red-950/40 p-4 shadow-sm shadow-red-950/20"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-white">
                Persona #{i + 1}
              </p>
              <button
                type="button"
                className="text-xs text-red-200 hover:text-white"
                onClick={() => onRemove?.(i)}
                disabled={disabled || !canRemove}
                aria-label={`Quitar persona ${i + 1}`}
                title="Quitar"
              >
                <svg className="h-4 w-4" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm font-medium text-white">
                <span className="text-xs uppercase tracking-wide text-white">Socio</span>
                <input
                  className={inputClass}
                  placeholder="000000"
                  value={p.socio}
                  onChange={(e) => update(i, 'socio', e.target.value)}
                  disabled={disabled}
                  required
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-white">
                <span className="text-xs uppercase tracking-wide text-white">DNI</span>
                <input
                  className={inputClass}
                  placeholder="12345678"
                  value={p.dni}
                  onChange={(e) => update(i, 'dni', e.target.value)}
                  disabled={disabled}
                  required
                />
              </label>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5 flex justify-center">
        <button
          type="button"
          className={loginButtonClass}
          onClick={onAdd}
          disabled={disabled || !canAdd}
          title="Agregar persona"
          aria-label="Agregar persona"
        >
          <svg className="h-4 w-4" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            aria-hidden="true"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
        </button>
      </div>
    </section>
  )
}

