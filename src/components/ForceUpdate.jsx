import { useUpdater } from "../context/UpdateContext";

export default function ForceUpdate() {
  const { forceCheck } = useUpdater();

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-800 via-red-900 to-red-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center gap-6 px-6 py-12">
        <div className="text-xs font-semibold uppercase tracking-[0.4em] text-white/70">
          Bonos CAI
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 px-10 py-8 text-center shadow-2xl">
          <div className="text-2xl font-semibold">Actualización requerida</div>
          <div className="mt-2 text-sm text-white/70">
            Tu versión quedó desactualizada. Instale la última versión para continuar.
          </div>
          <button
            type="button"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
            onClick={() => forceCheck && forceCheck()}
          >
            Actualizar ahora
          </button>
        </div>
      </div>
    </div>
  );
}
