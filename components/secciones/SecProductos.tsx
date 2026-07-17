import type { DashboardData } from '@/lib/supabase/queries'
import { fmtCLP, agrupar, fmtDec } from '@/lib/format'
import Kpi, { TituloSeccion, type Estado } from '@/components/Kpi'
import ProductScatter from '@/components/ProductScatter'
import ProductTable from '@/components/ProductTable'
import CostoTabs from '@/components/CostoTabs'

export default function SecProductos({ data }: { data: DashboardData }) {
  const prods = data.productos
  const conVolumen = prods.filter((p) => p.pedidos >= 5)
  const conReclamo = prods.filter((p) => p.reclamos > 0)
  const apagar = conVolumen
    .filter((p) => p.estado_playbook === 'apagar')
    .sort((a, b) => b.monto_reembolsado - a.monto_reembolsado || b.pct_reclamo - a.pct_reclamo)
  const vigilar = conVolumen.filter((p) => p.estado_playbook === 'vigilar')
  const plataProductos = prods.reduce((a, p) => a + p.monto_reembolsado, 0)
  const est = (n: number): Estado => (n >= 3 ? 'crit' : n >= 1 ? 'warn' : 'ok')

  return (
    <div className="flex flex-col gap-6">
      <div>
        <TituloSeccion hint="qué producto arreglar o dejar de vender">Decisión por producto</TituloSeccion>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi
            label="Productos para apagar"
            value={agrupar(apagar.length)}
            estado={est(apagar.length)}
            sub="alto % de reclamo con volumen real"
          />
          <Kpi
            label="Productos a vigilar"
            value={agrupar(vigilar.length)}
            estado={vigilar.length > 0 ? 'warn' : 'ok'}
            sub="cerca del umbral de reclamo"
          />
          <Kpi
            label="Plata perdida en productos"
            value={fmtCLP(plataProductos)}
            estado={plataProductos > 0 ? 'warn' : 'ok'}
            sub={`repartida en ${agrupar(conReclamo.length)} productos con reclamo`}
          />
          <Kpi
            label="Concentración (Pareto)"
            value={agrupar(data.analitica.paretoProductos)}
            estado="neutral"
            sub={`productos concentran el 80% de las devoluciones (de ${agrupar(data.analitica.paretoTotalProductos)})`}
          />
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
                  <th className="p-3 text-left">Problema dominante</th>
                </tr>
              </thead>
              <tbody>
                {apagar.slice(0, 8).map((p) => (
                  <tr key={p.product_id} className="border-b border-[var(--line)] last:border-0">
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
                      {p.pct_aduana >= p.pct_calidad
                        ? `Aduana / envío (${p.pct_aduana}%)`
                        : `Calidad / producto (${p.pct_calidad}%)`}
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
