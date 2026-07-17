import type { LucideIcon } from 'lucide-react'

export type Estado = 'ok' | 'warn' | 'crit' | 'neutral'

const COL: Record<Estado, string> = {
  ok: 'var(--ok)',
  warn: 'var(--warn)',
  crit: 'var(--crit)',
  neutral: 'var(--ink-3)',
}

export type Metric = {
  Ico: LucideIcon
  label: string
  value: string
  unit?: string
  estado: Estado
  sub?: string
  delta?: { up: boolean; txt: string }
}

// Franja de métricas sin tarjetas (estilo Stripe "resumen"): íconos, número en peso
// ligero, separadas por hairlines. El color solo aparece en el número cuando está en
// alerta. Reutilizable en todas las vistas para un lenguaje visual único.
export default function MetricStrip({ metrics }: { metrics: Metric[] }) {
  return (
    <div
      className="grid gap-px overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--line)]"
      style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))' }}
    >
      {metrics.map((m) => {
        const numColor = m.estado === 'crit' ? 'var(--crit)' : m.estado === 'warn' ? 'var(--warn)' : 'var(--ink)'
        return (
          <div key={m.label} className="px-4 py-4" style={{ background: 'var(--panel)' }}>
            <div className="flex items-center gap-1.5 text-[var(--ink-3)]">
              <m.Ico size={13} strokeWidth={1.9} style={{ color: m.estado === 'neutral' ? 'var(--ink-3)' : COL[m.estado] }} />
              <span className="text-[10.5px] font-semibold uppercase tracking-[0.06em]">{m.label}</span>
            </div>
            <div className="mt-2.5 flex items-baseline gap-1">
              <span className="font-serif text-[27px] font-light leading-none tabular-nums" style={{ color: numColor }}>
                {m.value}
              </span>
              {m.unit && <span className="text-[15px] font-light text-[var(--ink-3)]">{m.unit}</span>}
            </div>
            {m.delta && (
              <div className="mt-1.5 text-[11px] font-semibold" style={{ color: m.delta.up ? 'var(--crit)' : 'var(--ok)' }}>
                {m.delta.up ? '↑' : '↓'} {m.delta.txt}
              </div>
            )}
            {m.sub && <div className="mt-1.5 text-[11px] leading-tight text-[var(--ink-3)]">{m.sub}</div>}
          </div>
        )
      })}
    </div>
  )
}
