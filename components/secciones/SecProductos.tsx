import type { DashboardData } from '@/lib/supabase/queries'
import { MOTIVO_LABEL } from '@/lib/supabase/queries'
import { fmtCLP, agrupar, fmtDec } from '@/lib/format'
import { Ban, Eye, Target } from 'lucide-react'
import { TituloSeccion } from '@/components/Kpi'
import ProductScatter from '@/components/ProductScatter'
import ProductTable from '@/components/ProductTable'
import CostoTabs from '@/components/CostoTabs'

export default function SecProductos({ data }: { data: DashboardData }) {
  const prods = data.productos
  const conVolumen = prods.filter((p) => p.pedidos >= 5)
  const apagar = conVolumen
    .filter((p) => p.estado_playbook === 'apagar')
    .sort((a, b) => b.monto_reembolsado - a.monto_reembolsado || b.pct_reclamo - a.pct_reclamo)
  const vigilar = conVolumen.filter((p) => p.estado_playbook === 'vigilar')
  const plataApagar = apagar.reduce((a, p) => a + p.monto_reembolsado, 0)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <TituloSeccion hint="qué producto arreglar o dejar de vender">Decisión por producto</TituloSeccion>
        {/* Intención: TRIAGE. Dos tarjetas de acción (apagar / vigilar) con acento de
            alerta, más el dato de concentración. Empuja la decisión, no describe. */}
        <div className="grid gap-3 lg:grid-cols-[1.1fr_1fr_1.2fr]">
          {/* Apagar */}
          <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5" style={{ borderLeft: '3px solid var(--crit)' }}>
            <div className="flex items-center gap-2 text-[var(--crit)]">
              <Ban size={16} strokeWidth={2} />
              <span className="text-[11px] font-semibold uppercase tracking-[0.06em]">Apagar ya</span>
            </div>
            <div className="mt-2 font-serif text-[40px] font-light leading-none tabular-nums text-[var(--crit)]">
              {agrupar(apagar.length)}
            </div>
            <p className="mt-2 text-[12px] leading-snug text-[var(--ink-2)]">
              productos con alto reclamo y volumen real.{' '}
              {plataApagar > 0 && (
                <>
                  Ya cuestan <b className="text-[var(--ink)]">{fmtCLP(plataApagar)}</b> en reembolsos.
                </>
              )}
            </p>
          </div>

          {/* Vigilar */}
          <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5" style={{ borderLeft: '3px solid var(--warn)' }}>
            <div className="flex items-center gap-2 text-[var(--warn)]">
              <Eye size={16} strokeWidth={2} />
              <span className="text-[11px] font-semibold uppercase tracking-[0.06em]">Vigilar</span>
            </div>
            <div className="mt-2 font-serif text-[40px] font-light leading-none tabular-nums text-[var(--ink)]">
              {agrupar(vigilar.length)}
            </div>
            <p className="mt-2 text-[12px] leading-snug text-[var(--ink-2)]">cerca del umbral — todavía no para apagar.</p>
          </div>

          {/* Concentración */}
          <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5">
            <div className="flex items-center gap-2 text-[var(--ink-3)]">
              <Target size={16} strokeWidth={2} />
              <span className="text-[11px] font-semibold uppercase tracking-[0.06em]">Concentración</span>
            </div>
            <p className="mt-2 text-[13px] leading-snug text-[var(--ink-2)]">
              Apenas{' '}
              <b className="font-serif text-[22px] font-light text-[var(--accent)]">
                {agrupar(data.analitica.paretoProductos)}
              </b>{' '}
              productos concentran el <b className="text-[var(--ink)]">80%</b> de las devoluciones (de{' '}
              {agrupar(data.analitica.paretoTotalProductos)}). Atacar esos pocos mueve casi todo.
            </p>
          </div>
        </div>
      </div>

      {/* Productos a apagar — la acción concreta */}
      {apagar.length > 0 && (
        <div>
          <TituloSeccion hint="mayor pérdida primero">Candidatos a dejar de vender</TituloSeccion>
          <div className="overflow-x-auto rounded-2xl border border-[var(--crit)]/30 bg-[var(--panel)]">
            <table className="w-full min-w-[640px] border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-[var(--line)] text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-3)]">
                  <th className="p-3 text-left">Producto</th>
                  <th className="p-3 text-right">Pedidos</th>
                  <th className="p-3 text-right">% reclamo</th>
                  <th className="p-3 text-right">$ perdido</th>
                  <th className="p-3 text-left">Problema de producto</th>
                </tr>
              </thead>
              <tbody>
                {apagar.slice(0, 8).map((p) => (
                  <tr key={p.product_id} className="border-b border-[var(--line)] transition hover:bg-[var(--panel-2)] last:border-0">
                    <td className="max-w-[240px] truncate p-3 text-[var(--ink)]" title={p.producto_titulo}>
                      {p.producto_titulo}
                    </td>
                    <td className="p-3 text-right font-mono tabular-nums text-[var(--ink-2)]">{agrupar(p.pedidos)}</td>
                    <td className="p-3 text-right font-mono tabular-nums font-semibold text-[var(--crit)]">
                      {fmtDec(p.pct_reclamo)}%
                    </td>
                    <td className="p-3 text-right font-mono tabular-nums text-[var(--ink)]">
                      {p.monto_reembolsado > 0 ? fmtCLP(p.monto_reembolsado) : '—'}
                    </td>
                    <td className="p-3 text-[var(--ink-2)]">
                      {p.problemas[0]
                        ? `${MOTIVO_LABEL[p.problemas[0].motivo] || p.problemas[0].motivo} (${p.problemas[0].pct}%)`
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Mapa: ventas × %reclamo × plata */}
      <div>
        <TituloSeccion hint="tamaño = plata perdida · color = estado">Mapa de productos</TituloSeccion>
        <ProductScatter productos={conVolumen} />
      </div>

      {/* Costo por producto */}
      <div>
        <TituloSeccion hint="dónde se va la plata">Pérdida por producto</TituloSeccion>
        <CostoTabs productos={prods} />
      </div>

      {/* Tabla completa ordenable */}
      <div>
        <TituloSeccion hint="ordenable por cualquier columna">Todos los productos con volumen</TituloSeccion>
        <ProductTable productos={conVolumen} />
      </div>
    </div>
  )
}
