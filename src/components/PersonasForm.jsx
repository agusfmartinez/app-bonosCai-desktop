import React from 'react'
import { cardClass, inputClass, loginButtonClass } from '../styles/classes'

export default function PersonasForm({
  personas,
  onChange,
  onAdd,
  onRemove,
  onToggleEnabled,
  disabled,
  canAdd,
  canRemove,
}) {
  const update = (idx, field, value) => {
    if (disabled) return
    const next = personas.map((p, i) => (i === idx ? { ...p, [field]: value } : p))
    onChange(next)
  }

  const enabledCount = personas.filter((p) => p?.enabled !== false).length
  const disabledCount = personas.filter((p) => p?.enabled === false).length

  return (
    <section className={cardClass}>
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-lg font-semibold text-white">Personas</h2>
        <div className="flex items-center gap-3">
          <span className="text-xs uppercase tracking-wide text-white">{enabledCount} cupos</span>
          <span className="text-xs uppercase tracking-wide text-white/70">{disabledCount} deshabilitados</span>
        </div>
      </div>
      <p className="mt-1 text-sm text-white">
        Datos de socio y DNI de cada persona habilitada para comprar.
      </p>
      <div className="mt-6 space-y-5">
        {personas.map((p, i) => (
          <div
            key={i}
            className={`rounded-lg border border-red-800 bg-red-950/40 p-4 shadow-sm shadow-red-950/20 ${
              p?.enabled === false ? 'opacity-60' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-white">
                Persona #{i + 1}
              </p>
              <div className="flex items-center gap-3">
                <span
                  className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-white/15 text-[10px] font-bold text-white/80"
                  title="Al deshabilitar no se canjeará bono para este socio."
                >
                  ?
                </span>
                <button
                  type="button"
                  onClick={() => onToggleEnabled?.(i)}
                  disabled={disabled}
                  role="switch"
                  aria-checked={p?.enabled !== false}
                  aria-label={`Habilitar persona ${i + 1}`}
                  className={`relative inline-flex h-5 w-10 items-center rounded-full border transition ${
                    p?.enabled === false
                      ? 'border-red-700 bg-red-950/40'
                      : 'border-emerald-500/70 bg-emerald-500/30'
                  } ${disabled ? 'opacity-60' : 'hover:brightness-110'}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                      p?.enabled === false ? 'translate-x-1' : 'translate-x-5'
                    }`}
                  />
                </button>
                
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
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm font-medium text-white">
                <span className="text-xs uppercase tracking-wide text-white">Socio</span>
                <input
                  className={inputClass}
                  placeholder="000000"
                  value={p.socio}
                  onChange={(e) => update(i, 'socio', e.target.value)}
                  disabled={disabled || p?.enabled === false}
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
                  disabled={disabled || p?.enabled === false}
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
