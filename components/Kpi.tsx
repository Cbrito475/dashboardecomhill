export type Estado = 'ok' | 'warn' | 'crit' | 'neutral'

const COL: Record<Estado, { color: string; border: string; bg: string }> = {
  ok: { color: 'var(--ok)', border: 'var(--ok)', bg: 'var(--ok-bg)' },
  warn: { color: 'var(--warn)', border: 'var(--warn)', bg: 'var(--warn-bg)' },
  crit: { color: 'var(--crit)', border: 'var(--crit)', bg: 'var(--crit-bg)' },
  neutral: { color: 'var(--ink)', border: 'var(--line)', bg: 'var(--panel)' },
}

// KPI con semáforo de color y barra tipo gauge. Reutilizable en todas las secciones.
export default function Kpi({
  label,
  value,
  unit,
  estado,
  sub,
  gauge,
  delta,
}: {
  label: string
  value: string
  unit?: string
  estado: Estado
  sub?: string
  gauge?: number
  delta?: { up: boolean; txt: string }
}) {
  const c = COL[estado]
  const isColored = estado !== 'neutral'
  return (
    <div
      className="rounded-2xl border p-4"
      style={{ borderColor: isColored ? c.border : 'var(--line)', background: isColored ? c.bg : 'var(--panel)' }}
    >
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-medium" style={{ color: isColored ? c.color : 'var(--ink-2)' }}>
          {label}
        </p>
        {isColored && <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />}
      </div>
      <div
        className="mt-1.5 font-serif text-[32px] font-semibold leading-none tabular-nums"
        style={{ color: isColored ? c.color : 'var(--ink)' }}
      >
        {value}
        {unit && <span className="text-lg">{unit}</span>}
      </div>
      {gauge != null && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--line)]">
          <div
            className="h-full rounded-full"
            style={{ width: `${Math.min(Math.max(gauge, 0), 100)}%`, background: c.color }}
          />
        </div>
      )}
      {sub && <p className="mt-1.5 text-[11px] leading-tight text-[var(--ink-3)]">{sub}</p>}
      {delta && (
        <p className="mt-1 text-[11px] font-semibold" style={{ color: delta.up ? 'var(--crit)' : 'var(--ok)' }}>
          {delta.up ? '▲' : '▼'} {delta.txt} vs período previo
        </p>
      )}
    </div>
  )
}

export function TituloSeccion({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-3 mt-1 flex items-baseline gap-2">
      <h2 className="text-[13px] font-semibold uppercase tracking-wider text-[var(--ink-2)]">{children}</h2>
      {hint && <span className="text-[11px] text-[var(--ink-3)]">· {hint}</span>}
      <span className="h-px flex-1 self-center bg-[var(--line)]" />
    </div>
  )
}
