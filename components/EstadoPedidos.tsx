import { ORDEN_ESTADOS, ESTADO_LABEL, ESTADO_SUB, ESTADO_COLOR, type EstadoPedido } from '@/lib/supabase/queries'
import { fmtCLP, agrupar } from '@/lib/format'

export type FilaEstado = {
  estado: EstadoPedido
  n: number
  pct: number
  ventas: number
  reembolsado: number
}

export default function EstadoPedidos({ filas, totalPedidos }: { filas: FilaEstado[]; totalPedidos: number }) {
  const byEstado = new Map(filas.map((f) => [f.estado, f]))
  const orden = ORDEN_ESTADOS.map((e) => byEstado.get(e)).filter((f): f is FilaEstado => !!f)

  // Los reclamos son el 4-5% del total: contra 21.732 sus barras serian invisibles.
  // La barra se escala contra el estado mas grande de los que SI tuvieron contacto.
  const conContacto = orden.filter((f) => f.estado !== 'sin_contacto')
  const maxContacto = Math.max(...conContacto.map((f) => f.n), 1)

  const reclamos = conContacto.filter((f) => f.estado !== 'consulta')
  const totalReclamos = reclamos.reduce((a, f) => a + f.n, 0)
  const plataReclamos = reclamos.reduce((a, f) => a + f.reembolsado, 0)

  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
      <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--ink-3)]">
        En qué terminó cada pedido
      </p>
      <p className="mb-4 mt-1 text-[11px] text-[var(--ink-3)]">
        Los {agrupar(totalPedidos)} pedidos del período, cada uno en <b>un solo estado</b>. Se cuentan pedidos,
        no correos: un pedido con cinco correos sigue siendo uno.
      </p>

      {/* Barra apilada: el universo completo de un vistazo */}
      <div className="mb-5 flex h-3 w-full overflow-hidden rounded-full bg-[var(--line)]">
        {orden.map((f) =>
          f.n === 0 ? null : (
            <span
              key={f.estado}
              title={`${ESTADO_LABEL[f.estado]}: ${agrupar(f.n)} (${f.pct}%)`}
              style={{ width: `${(f.n / totalPedidos) * 100}%`, background: ESTADO_COLOR[f.estado] }}
            />
          )
        )}
      </div>

      <div className="flex flex-col gap-2.5">
        {orden.map((f) => {
          const esSinContacto = f.estado === 'sin_contacto'
          // El 95% "sin contacto" se muestra como referencia, sin barra que aplaste al resto.
          const ancho = esSinContacto ? 100 : (f.n / maxContacto) * 100
          return (
            <div key={f.estado} className="flex items-center gap-3 text-sm">
              <span
                className="h-8 w-1 flex-none rounded-full"
                style={{ background: ESTADO_COLOR[f.estado] }}
                aria-hidden
              />
              <span className="w-56 flex-none">
                <span className="block truncate text-[var(--ink-2)]">{ESTADO_LABEL[f.estado]}</span>
                <span className="block truncate text-[11px] text-[var(--ink-3)]">{ESTADO_SUB[f.estado]}</span>
              </span>
              <span className="h-3.5 flex-1 overflow-hidden rounded-full bg-[var(--line)]">
                <span
                  className="block h-full rounded-full"
                  style={{
                    width: `${ancho}%`,
                    background: ESTADO_COLOR[f.estado],
                    opacity: esSinContacto ? 0.35 : 1,
                  }}
                />
              </span>
              <span className="w-28 flex-none text-right font-mono text-xs tabular-nums text-[var(--ink)]">
                {agrupar(f.n)} <span className="text-[var(--ink-3)]">· {f.pct}%</span>
              </span>
              <span className="w-24 flex-none text-right font-mono text-xs tabular-nums text-[var(--ink-3)]">
                {f.reembolsado > 0 ? fmtCLP(f.reembolsado) : '—'}
              </span>
            </div>
          )
        })}
      </div>

      <p className="mt-4 border-t border-[var(--line)] pt-3 text-[11px] leading-relaxed text-[var(--ink-3)]">
        Las barras de los estados con contacto están escaladas entre sí, no contra el total — si no, al ser el{' '}
        {Math.round((totalReclamos / totalPedidos) * 1000) / 10}% del universo serían invisibles. La barra
        apilada de arriba sí muestra las proporciones reales. La última columna es la plata devuelta en cada
        estado: <b className="text-[var(--ink-2)]">{fmtCLP(plataReclamos)}</b> se fue en los{' '}
        {agrupar(totalReclamos)} pedidos con reclamo.
      </p>
    </div>
  )
}
