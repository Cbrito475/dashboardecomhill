import type { DashboardData } from '@/lib/supabase/queries'
import { DESENLACE_LABEL } from '@/lib/supabase/queries'
import { fmtCLP, agrupar, fmtDec } from '@/lib/format'
import Kpi, { TituloSeccion, type Estado } from '@/components/Kpi'
import Disputas from '@/components/Disputas'

function fmtMes(ym: string) {
  const [y, m] = ym.split('-')
  return `${m}/${y.slice(2)}`
}

export default function SecDevoluciones({ data }: { data: DashboardData }) {
  const r = data.reembolso
  const estCumplido: Estado = r.pctCumplido >= 80 ? 'ok' : r.pctCumplido >= 50 ? 'warn' : 'crit'
  const barras = [
    { label: 'Solicitado', n: r.montoSolicitado, color: 'var(--warn)' },
    { label: 'Pagado', n: r.montoPagado, color: 'var(--ok)' },
    { label: 'Falta por pagar', n: r.montoFalta, color: 'var(--crit)' },
  ]
  const maxBarra = Math.max(...barras.map((b) => b.n), 1)
  const desenlaces = data.desenlaces
  const maxDes = Math.max(...desenlaces.map((d) => d.n), 1)
  const meses = data.reembolsosPorMes
  const maxMes = Math.max(...meses.map((m) => m.total), 1)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <TituloSeccion hint="medido por lo que se pide, no solo lo pagado">Cuánto se devuelve</TituloSeccion>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi
            label="Devoluciones solicitadas"
            value={agrupar(r.solicitados)}
            estado={r.solicitados > 0 ? 'warn' : 'ok'}
            sub={`${fmtDec(data.analitica.pctPidenDevolucion)}% de los pedidos las pide`}
          />
          <Kpi
            label="Solicitudes cumplidas"
            value={fmtDec(r.pctCumplido)}
            unit="%"
            estado={estCumplido}
            gauge={r.pctCumplido}
            sub={`${agrupar(r.solicitadosCumplidos)} de ${agrupar(r.solicitados)} ya reembolsadas`}
          />
          <Kpi
            label="Monto solicitado"
            value={fmtCLP(r.montoSolicitado)}
            estado="neutral"
            sub={`${fmtDec(data.analitica.tasaDevolucionSolicitada)}% de las ventas`}
          />
          <Kpi
            label="Falta por pagar"
            value={fmtCLP(r.montoFalta)}
            estado={r.montoFalta > 0 ? 'crit' : 'ok'}
            sub={`ya se pagó ${fmtDec(r.pctMontoPagado)}% de lo solicitado`}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Solicitado vs pagado vs falta */}
        <div>
          <TituloSeccion hint="en plata">Solicitado · pagado · pendiente</TituloSeccion>
          <div className="flex flex-col gap-3 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
            {barras.map((b) => (
              <div key={b.label} className="flex items-center gap-3 text-[13px]">
                <span className="w-28 flex-none text-[var(--ink-2)]">{b.label}</span>
                <span className="h-4 flex-1 overflow-hidden rounded-full bg-[var(--line)]">
                  <span className="block h-full rounded-full" style={{ width: `${(b.n / maxBarra) * 100}%`, background: b.color }} />
                </span>
                <span className="w-28 flex-none text-right font-mono text-xs tabular-nums text-[var(--ink)]">
                  {fmtCLP(b.n)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Qué piden (desenlace) */}
        <div>
          <TituloSeccion hint="de los pedidos con reclamo">Piden plata, cambio o nada</TituloSeccion>
          <div className="flex flex-col gap-3 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
            {desenlaces.map((d) => {
              const color = d.tipo === 'reembolso' ? 'var(--crit)' : d.tipo === 'cambio' ? 'var(--warn)' : 'var(--ink-3)'
              return (
                <div key={d.tipo} className="flex items-center gap-3 text-[13px]">
                  <span className="w-40 flex-none truncate text-[var(--ink-2)]">{DESENLACE_LABEL[d.tipo] || d.tipo}</span>
                  <span className="h-4 flex-1 overflow-hidden rounded-full bg-[var(--line)]">
                    <span className="block h-full rounded-full" style={{ width: `${(d.n / maxDes) * 100}%`, background: color }} />
                  </span>
                  <span className="w-20 flex-none text-right font-mono text-xs tabular-nums text-[var(--ink)]">
                    {agrupar(d.n)} <span className="text-[10px] text-[var(--ink-3)]">{fmtDec(d.pct)}%</span>
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Tendencia mensual */}
      {meses.length > 1 && (
        <div>
          <TituloSeccion hint="reembolsos pagados por mes del pedido">Tendencia de devoluciones</TituloSeccion>
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
            <div className="flex items-end gap-1.5" style={{ height: 160 }}>
              {meses.map((m) => (
                <div key={m.mes} className="flex flex-1 flex-col items-center justify-end gap-1">
                  <span className="font-mono text-[9px] tabular-nums text-[var(--ink-3)]">
                    {m.total > 0 ? `${Math.round(m.total / 1000)}k` : ''}
                  </span>
                  <div
                    className="w-full rounded-t bg-[var(--crit)]"
                    style={{ height: `${(m.total / maxMes) * 130}px`, minHeight: m.total > 0 ? 2 : 0 }}
                    title={fmtCLP(m.total)}
                  />
                  <span className="font-mono text-[9px] tabular-nums text-[var(--ink-3)]">{fmtMes(m.mes)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Disputas — el peor desenlace */}
      <div>
        <TituloSeccion hint="cuando escalan al banco">Disputas</TituloSeccion>
        <Disputas d={data.disputas} totalPedidos={data.resumen.totalPedidos} />
      </div>
    </div>
  )
}
