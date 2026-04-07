import { useUpdater } from "../context/UpdateContext";

export default function UpdateUI() {
  const { status, progress, error, installUpdate, checkForUpdates, downloadUpdate } = useUpdater();

  if (status === "idle") return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[320px] rounded-2xl border border-white/10 bg-red-950/95 px-4 py-3 text-sm text-white shadow-xl">
      {status === "checking" && <p>🔍 Buscando actualizaciones…</p>}

      {status === "available" && (
        <div className="space-y-2">
          <p>⬇️ Nueva versión disponible</p>
          <button
            className="w-full rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:bg-white/20"
            onClick={() => downloadUpdate && downloadUpdate()}
          >
            Descargar actualización
          </button>
        </div>
      )}

      {status === "downloading" && (
        <div className="space-y-2">
          <p>Descargando actualización…</p>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-sky-400 transition-all"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
          <span className="text-xs text-white/70">{progress}%</span>
        </div>
      )}

      {status === "downloaded" && (
        <div className="space-y-2">
          <p>✅ Actualización lista para instalar</p>
          <button
            className="w-full rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:bg-emerald-400"
            onClick={() => installUpdate && installUpdate()}
          >
            Reiniciar para actualizar
          </button>
        </div>
      )}

      {status === "error" && (
        <div className="space-y-2">
          <p>❌ Error al actualizar</p>
          {error && <p className="text-xs text-white/70">{error}</p>}
          <button
            className="w-full rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:bg-white/20"
            onClick={() => checkForUpdates && checkForUpdates()}
          >
            Reintentar
          </button>
        </div>
      )}
    </div>
  );
}
