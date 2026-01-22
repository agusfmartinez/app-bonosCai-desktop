import React from 'react'
import { cardClass, inputClass } from '../styles/classes'


export default function PersonasForm({ personas, onChange, disabled }) {
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
            <p className="text-xs font-semibold uppercase tracking-wide text-white">
              Persona #{i + 1}
            </p>
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
    </section>
  )
}

