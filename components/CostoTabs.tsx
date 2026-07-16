import type { ProductoFila } from '@/lib/supabase/queries'
import { fmtCLP } from '@/lib/format'

export default function CostoTabs({ productos }: { productos: ProductoFila[] }) {
  const porProducto = productos
    .filter((p) => p.monto_reembolsado > 0)
    .sort((a, b) => b.monto_reembolsado - a.monto_reembolsado)
    .slice(0, 8)
  const maxMonto = Math.max(...porProducto.map((p) => p.monto_reembolsado), 1)

  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
      <h3 className="text-sm font-semibold text-[var(--ink)]">Pérdida por producto</h3>
      <p className="mb-4 mt-0.5 max-w-[66ch] text-[13px] leading-relaxed text-[var(--ink-3)]">
        Pérdida real por producto (CLP, monto reembolsado por línea de producto).
      </p>
      {porProducto.length === 0 ? (
        <p className="text-xs text-[var(--ink-3)]">Sin reembolsos registrados en este rango.</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {porProducto.map((p) => (
            <div key={p.product_id} className="flex items-center gap-3 text-sm">
              <span className="w-44 flex-none truncate text-[var(--ink-2)]">
                {p.producto_titulo || p.product_id}
              </span>
              <span className="h-3.5 flex-1 overflow-hidden rounded-full bg-[var(--line)]">
                <span
                  className="block h-full rounded-full"
                  style={{ width: `${(p.monto_reembolsado / maxMonto) * 100}%`, background: 'var(--crit)' }}
                />
              </span>
              <span className="w-24 flex-none text-right font-mono text-xs tabular-nums text-[var(--ink)]">
                {fmtCLP(p.monto_reembolsado)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
