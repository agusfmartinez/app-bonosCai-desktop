// Reusable Tailwind class name constants

export const cardClass =
  'rounded-xl border border-red-800 bg-red-900/60 p-6 shadow-xl shadow-red-950/30 backdrop-blur'

export const inputClass =
  'w-full rounded-lg border border-red-700 bg-red-950/60 px-3 py-2 text-sm text-white placeholder-red-500 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40'

export const focusClass =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400'

export const baseButtonClass =
  `inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition ${focusClass}`

// Common button variants
export const loginButtonClass =
  `${baseButtonClass} border border-red-700 text-white hover:border-sky-400 hover:text-sky-200 disabled:cursor-not-allowed disabled:opacity-50`

export const runButtonClass =
  `inline-flex items-center justify-center rounded-lg bg-sky-500/90 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-sky-500/40 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60 ${focusClass}`

export const testButtonClass =
  `inline-flex items-center justify-center rounded-lg bg-amber-500/90 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-amber-500/40 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60 ${focusClass}`

export const stopButtonClass =
  `inline-flex items-center justify-center rounded-lg border border-rose-400/60 px-4 py-2 text-sm font-semibold text-rose-200 transition hover:border-rose-300 hover:text-rose-100 disabled:cursor-not-allowed disabled:opacity-50 ${focusClass}`

// Page-level helpers
export const pageContainerClass = 'min-h-screen flex items-center justify-center bg-red-900'
export const pageCardNarrowClass = `${cardClass} w-[360px]`