import type { DashboardData } from '@/lib/supabase/queries'
import { fmtCLP, agrupar, fmtDec } from '@/lib/format'
import { AlertCircle, CircleDollarSign, CircleCheck, PackageX, RefreshCw, TriangleAlert } from 'lucide-react'
import { TituloSeccion } from '@/components/Kpi'
import MetricStrip, { type Metric, type Estado } from '@/components/MetricStrip'
import EstadoPedidos from '@/components/EstadoPedidos'
import MatrizCausas from '@/components/MatrizCausas'

export default function SecEjecutivo({ data }: { data: DashboardData }) {
  const R = data.resumen
  const uni = R.totalPedidos || 1
  const pctReclamo = Math.round((R.pedidosConReclamo / uni) * 1000) / 10
  const est = (v: number, warn: number, crit: number): Estado => (v >= crit ? 'crit' : v >= warn ? 'warn' : 'ok')
  const pctVencidos = data.kpis.pctExpired
  const cumplido = data.reembolso.pctCumplido

  const metrics: Metric[] = [
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
        <MetricStrip metrics={metrics} />
      </div>

      <div>
        <TituloSeccion hint="cada pedido en un solo estado">En qué terminó cada pedido</TituloSeccion>
        <EstadoPedidos filas={data.estadoPedidos} totalPedidos={R.totalPedidos} />
      </div>

      {data.matrizCausas.length > 0 && (
        <div>
          <TituloSeccion hint="por qué reclamaron y qué pidieron">Dónde se origina y dónde sangra</TituloSeccion>
          <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5">
            <MatrizCausas filas={data.matrizCausas} totalPedidos={R.pedidosConReclamo} />
          </div>
        </div>
      )}
    </div>
  )
}
