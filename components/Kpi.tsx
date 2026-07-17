export type Estado = 'ok' | 'warn' | 'crit' | 'neutral'

const COL: Record<Estado, string> = {
  ok: 'var(--ok)',
  warn: 'var(--warn)',
  crit: 'var(--crit)',
  neutral: 'var(--ink-3)',
}

// KPI sobrio: tarjeta neutra (sin fondo de color), el número lleva el color solo
// cuando está en alerta, un punto de estado y una barra fina dan la señal. Restraint
// deliberado — es lo que hace que se sienta "sistema serio" y no un panel de colores.
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
  // Solo crit/warn tiñen el número; ok y neutral quedan en tinta. Menos color = más señal.
  const numColor = estado === 'crit' ? 'var(--crit)' : estado === 'warn' ? 'var(--warn)' : 'var(--ink)'

  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 transition hover:border-[var(--line-2)]">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-3)]">{label}</p>
        {isColored && <span className="h-1.5 w-1.5 flex-none rounded-full" style={{ background: c }} />}
      </div>
      <div
        className="mt-2 font-serif text-[30px] font-semibold leading-none tabular-nums"
        style={{ color: numColor }}
      >
        {value}
        {unit && <span className="ml-0.5 text-lg text-[var(--ink-3)]">{unit}</span>}
      </div>
      {gauge != null && (
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-[var(--line)]">
          <div
            className="h-full rounded-full"
            style={{ width: `${Math.min(Math.max(gauge, 0), 100)}%`, background: isColored ? c : 'var(--accent)' }}
          />
        </div>
      )}
      {sub && <p className="mt-2 text-[11px] leading-tight text-[var(--ink-3)]">{sub}</p>}
      {delta && (
        <p className="mt-1.5 text-[11px] font-semibold" style={{ color: delta.up ? 'var(--crit)' : 'var(--ok)' }}>
          {delta.up ? '↑' : '↓'} {delta.txt} <span className="font-normal text-[var(--ink-3)]">vs período previo</span>
        </p>
      )}
    </div>
  )
}

export function TituloSeccion({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-3 mt-1 flex items-baseline gap-2">
      <h2 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-2)]">{children}</h2>
      {hint && <span className="text-[11px] text-[var(--ink-3)]">· {hint}</span>}
      <span className="h-px flex-1 self-center bg-[var(--line)]" />
    </div>
  )
}
