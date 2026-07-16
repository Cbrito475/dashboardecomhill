function Panel({ h = 'h-32' }: { h?: string }) {
  return (
    <div className={`animate-pulse rounded-2xl border border-[var(--line)] bg-[var(--panel)] ${h}`} />
  )
}

export default function Loading() {
  return (
    <div className="flex flex-col gap-10">
      {/* barra superior: spinner + texto */}
      <div className="flex items-center justify-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--panel)] py-6">
        <span
          className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--line-2)] border-t-[var(--accent)]"
          role="status"
          aria-label="Cargando"
        />
        <span className="text-sm text-[var(--ink-2)]">Cargando datos del período…</span>
      </div>

      {/* filtro */}
      <Panel h="h-24" />

      {/* paneles de cobertura / clasificacion */}
      <Panel h="h-40" />
      <Panel h="h-56" />

      {/* 01 resumen: 5 tarjetas */}
      <div>
        <div className="mb-3 h-3 w-64 animate-pulse rounded bg-[var(--line-2)]" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Panel key={i} h="h-32" />
          ))}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Panel h="h-44" />
          <Panel h="h-44" />
        </div>
      </div>

      {/* secciones siguientes */}
      <Panel h="h-64" />
      <Panel h="h-72" />
    </div>
  )
}
