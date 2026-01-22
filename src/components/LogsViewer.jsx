import React, { useEffect, useRef } from 'react'
import { cardClass } from '../styles/classes'

const dotColorByLevel = { success: 'bg-emerald-400', info: 'bg-sky-400', warning: 'bg-amber-400', error: 'bg-rose-500' }
const badgeByLevel = {
  success: 'bg-emerald-500/15 text-emerald-200',
  info: 'bg-sky-500/15 text-sky-200',
  warning: 'bg-amber-500/20 text-amber-200',
  error: 'bg-rose-500/20 text-rose-200',
}

export default function LogsViewer({ logs, onClear  }) {
  const scrollerRef = useRef(null)
  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [logs])

  return (
    <section className={cardClass}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Seguimiento</h2>
          <p className="mt-1 text-sm text-white">Eventos en tiempo real.</p>
        </div>
        <div className="flex gap-x-2">
          <span className="rounded-full border border-red-700 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
            {logs.length} eventos
          </span>
          <button
            className="rounded-full border border-red-700 px-3 py-1 text-xs font-semibold text-white hover:border-sky-400 hover:text-sky-200 disabled:opacity-50"
            onClick={onClear}
            disabled={!logs?.length}
            title="Limpiar logs">
            Limpiar
          </button>
        </div>
      </div>
      <div className="mt-5 h-[22rem] overflow-hidden rounded-lg border border-red-800 bg-red-950/40">
        <div className="h-full overflow-y-auto p-4 pr-6" ref={scrollerRef}>
          {logs.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-white">Sin eventos todavía.</div>
          ) : (
            <ul className="space-y-3">
              {logs.map((log, index) => {
                const level = log.level || 'info'
                return (
                  <li key={`${level}-${index}`} className="flex items-start gap-3 rounded-md bg-red-950/40 px-3 py-2 text-sm text-white">
                    <span className={`mt-1 h-2.5 w-2.5 rounded-full ${dotColorByLevel[level] || 'bg-red-500'}`} />
                    <div className="flex flex-col gap-1">
                      <span className={`w-fit rounded-full px-2 text-[11px] font-semibold uppercase tracking-wide ${badgeByLevel[level] || 'bg-red-700/40 text-white'}`}>
                        {level}
                      </span>
                      <span className="font-mono text-sm text-white">{log.message}</span>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}


