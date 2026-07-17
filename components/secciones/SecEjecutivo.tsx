import type { DashboardData } from '@/lib/supabase/queries'
import { fmtCLP, agrupar, fmtDec } from '@/lib/format'
import { AlertCircle, CircleDollarSign, CircleCheck, PackageX, RefreshCw, TriangleAlert } from 'lucide-react'
import { TituloSeccion, type Estado } from '@/components/Kpi'
import EstadoPedidos from '@/components/EstadoPedidos'
import MatrizCausas from '@/components/MatrizCausas'

const COL: Record<Estado, string> = {
  ok: 'var(--ok)',
  warn: 'var(--warn)',
  crit: 'var(--crit)',
  neutral: 'var(--ink-3)',
}

export default function SecEjecutivo({ data }: { data: DashboardData }) {
  const R = data.resumen
  const uni = R.totalPedidos || 1
  const pctReclamo = Math.round((R.pedidosConReclamo / uni) * 1000) / 10
  const est = (v: number, warn: number, crit: number): Estado => (v >= crit ? 'crit' : v >= warn ? 'warn' : 'ok')
  const pctVencidos = data.kpis.pctExpired
  const cumplido = data.reembolso.pctCumplido

  const metrics: {
    Ico: typeof AlertCircle
    label: string
    value: string
    unit?: string
    estado: Estado
    sub: string
    delta?: { up: boolean; txt: string }
  }[] = [
    {
      Ico: AlertCircle,
      label: 'Pedidos con reclamo',
      value: fmtDec(pctReclamo),
      unit: '%',
      estado: est(pctReclamo, 8, 15),
      delta: R.deltaPct !== 0 ? { up: R.deltaPct > 0, txt: `${fmtDec(Math.abs(R.deltaPct))} pp` } : undefined,
      sub: `${agrupar(R.pedidosConReclamo)} de ${agrupar(R.totalPedidos)} pedidos`,
    },
    {
      Ico: CircleDollarSign,
      label: 'Plata devuelta',
      value: fmtCLP(R.perdidaTotal),
      estado: R.perdidaTotal > 0 ? 'warn' : 'ok',
      sub: 'reembolsos del período',
    },
    {
      Ico: CircleCheck,
      label: 'Pedidos sanos',
      value: fmtDec(data.analitica.pctSanos),
      unit: '%',
      estado: est(100 - data.analitica.pctSanos, 12, 25),
      sub: 'sin reclamo ni consulta',
    },
    {
      Ico: PackageX,
      label: 'Envíos vencidos',
      value: pctVencidos == null ? '—' : fmtDec(pctVencidos),
      unit: pctVencidos == null ? undefined : '%',
      estado: pctVencidos == null ? 'neutral' : est(pctVencidos, 3, 8),
      sub: 'tracking murió sin entregar',
    },
    {
      Ico: RefreshCw,
      label: 'Reembolsos cumplidos',
      value: fmtDec(cumplido),
      unit: '%',
      estado: cumplido >= 80 ? 'ok' : cumplido >= 50 ? 'warn' : 'crit',
      sub: `${agrupar(data.reembolso.solicitadosCumplidos)} de ${agrupar(data.reembolso.solicitados)}`,
    },
    {
      Ico: TriangleAlert,
      label: 'Casos críticos',
      value: agrupar(R.pedidosCriticos),
      estado: R.pedidosCriticos > 0 ? 'crit' : 'ok',
      sub: 'legal / SERNAC / disputa',
    },
  ]

  return (
    <div className="flex flex-col gap-7">
      {/* Franja de indicadores — sin tarjetas, separados por hairlines (estilo Stripe) */}
      <div>
        <TituloSeccion hint="la foto del período de un vistazo">Salud del negocio</TituloSeccion>
        <div className="grid grid-cols-2 divide-x divide-[var(--line)] overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--panel)] sm:grid-cols-3 lg:grid-cols-6">
          {metrics.map((m) => {
            const numColor = m.estado === 'crit' ? 'var(--crit)' : m.estado === 'warn' ? 'var(--warn)' : 'var(--ink)'
            return (
              <div key={m.label} className="px-4 py-4">
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
                  <div
                    className="mt-1.5 text-[11px] font-semibold"
                    style={{ color: m.delta.up ? 'var(--crit)' : 'var(--ok)' }}
                  >
                    {m.delta.up ? '↑' : '↓'} {m.delta.txt}
                  </div>
                )}
                <div className="mt-1.5 text-[11px] leading-tight text-[var(--ink-3)]">{m.sub}</div>
              </div>
            )
          })}
        </div>
      </div>

      <div>
        <TituloSeccion hint="cada pedido en un solo estado">En qué terminó cada pedido</TituloSeccion>
        <EstadoPedidos filas={data.estadoPedidos} totalPedidos={R.totalPedidos} />
      </div>

      {data.matrizCausas.length > 0 && (
        <div>
          <TituloSeccion hint="por qué reclamaron y qué pidieron">Dónde se origina y dónde sangra</TituloSeccion>
          <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5">
            <MatrizCausas filas={data.matrizCausas} totalPedidos={R.pedidosConReclamo} perdidaGlobal={R.perdidaTotal} />
          </div>
        </div>
      )}
    </div>
  )
}
