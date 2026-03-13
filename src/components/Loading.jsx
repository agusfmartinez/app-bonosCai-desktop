export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-red-800 via-red-900 to-red-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center gap-6 px-6 py-12">
        <div className="text-xs font-semibold uppercase tracking-[0.4em] text-white/70">
          Bonos CAI
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 px-10 py-8 text-center shadow-2xl">
          <div className="text-2xl font-semibold">Validando acceso…</div>
          <div className="mt-2 text-sm text-white/70">
            Verificando sesión y whitelist
          </div>

          <div className="mt-6 flex items-center justify-center gap-2">
            <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-400" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-400 [animation-delay:150ms]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-400 [animation-delay:300ms]" />
          </div>

          <button
            type="button"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
            onClick={() => window.location.reload()}
          >
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
          </button>
        </div>
      </div>
    </div>
  );
}
