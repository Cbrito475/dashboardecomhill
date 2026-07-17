import type { DashboardData } from '@/lib/supabase/queries'
import { fmtCLP, agrupar, fmtDec } from '@/lib/format'
import Kpi, { TituloSeccion, type Estado } from '@/components/Kpi'
import EstadoPedidos from '@/components/EstadoPedidos'
import MatrizCausas from '@/components/MatrizCausas'

export default function SecEjecutivo({ data }: { data: DashboardData }) {
  const R = data.resumen
  const uni = R.totalPedidos || 1
  const pctReclamo = Math.round((R.pedidosConReclamo / uni) * 1000) / 10
  const est = (v: number, warn: number, crit: number): Estado => (v >= crit ? 'crit' : v >= warn ? 'warn' : 'ok')

  const pctVencidos = data.kpis.pctExpired
  const dias = data.kpis.mediana

  return (
    <div className="flex flex-col gap-6">
      {/* Semáforo de KPIs */}
      <div>
        <TituloSeccion hint="la foto del período de un vistazo">Salud del negocio</TituloSeccion>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <Kpi
            label="Pedidos con reclamo"
            value={fmtDec(pctReclamo)}
            unit="%"
            estado={est(pctReclamo, 8, 15)}
            gauge={pctReclamo * 4}
            sub={`${agrupar(R.pedidosConReclamo)} de ${agrupar(R.totalPedidos)} pedidos`}
            delta={R.deltaPct !== 0 ? { up: R.deltaPct > 0, txt: `${fmtDec(Math.abs(R.deltaPct))} pp` } : undefined}
          />
          <Kpi
            label="Plata devuelta"
            value={fmtCLP(R.perdidaTotal)}
            estado={R.perdidaTotal > 0 ? 'warn' : 'ok'}
            sub="reembolsos de pedidos del período"
          />
          <Kpi
            label="Pedidos sanos"
            value={fmtDec(data.analitica.pctSanos)}
            unit="%"
            estado={est(100 - data.analitica.pctSanos, 12, 25)}
            gauge={data.analitica.pctSanos}
            sub="sin reclamo ni consulta"
          />
          <Kpi
            label="Envíos vencidos"
            value={pctVencidos == null ? '—' : fmtDec(pctVencidos)}
            unit={pctVencidos == null ? undefined : '%'}
            estado={pctVencidos == null ? 'neutral' : est(pctVencidos, 3, 8)}
            gauge={pctVencidos == null ? undefined : pctVencidos * 6}
            sub="tracking que murió sin entregar"
          />
          <Kpi
            label="Reembolsos cumplidos"
            value={fmtDec(data.reembolso.pctCumplido)}
            unit="%"
            estado={data.reembolso.pctCumplido >= 80 ? 'ok' : data.reembolso.pctCumplido >= 50 ? 'warn' : 'crit'}
            gauge={data.reembolso.pctCumplido}
            sub={`${agrupar(data.reembolso.solicitadosCumplidos)} de ${agrupar(data.reembolso.solicitados)} solicitados`}
          />
          <Kpi
            label="Casos críticos"
            value={agrupar(R.pedidosCriticos)}
            estado={R.pedidosCriticos > 0 ? 'crit' : 'ok'}
            sub={`legal / SERNAC / disputa · mediana ${dias == null ? '—' : dias + ' días'} en tránsito`}
          />
        </div>
      </div>

      {/* En qué terminó cada pedido */}
      <div>
        <TituloSeccion hint="cada pedido en un solo estado">En qué terminó cada pedido</TituloSeccion>
        <EstadoPedidos filas={data.estadoPedidos} totalPedidos={R.totalPedidos} />
      </div>

      {/* Causa × desenlace */}
      {data.matrizCausas.length > 0 && (
        <div>
          <TituloSeccion hint="por qué reclamaron y qué pidieron">Dónde se origina y dónde sangra</TituloSeccion>
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
            <MatrizCausas
              filas={data.matrizCausas}
              totalPedidos={R.pedidosConReclamo}
              perdidaGlobal={R.perdidaTotal}
            />
          </div>
        </div>
      )}
    </div>
  )
}
