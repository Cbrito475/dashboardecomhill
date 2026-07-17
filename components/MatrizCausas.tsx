'use client'

import { useState } from 'react'
import { MOTIVO_LABEL, GRUPO_LABEL, GRUPO_ORDEN, grupoMotivo } from '@/lib/supabase/queries'
import { fmtCLP, agrupar } from '@/lib/format'

const GRUPO_CHIP: Record<string, string> = {
  tienda: 'bg-[var(--ok-bg)] text-[var(--ok)]', // verde: barato, en tu control
  producto: 'bg-[var(--warn-bg)] text-[var(--warn)]', // vía proveedora
  envio: 'bg-[var(--accent-soft)] text-[var(--accent)]', // vía courier/externo
  gestion: 'bg-[var(--panel-2)] text-[var(--ink-2)]', // ruido, sin fix de raíz
}

export type FilaCausa = {
  motivo: string
  sin_peticion: number
  cambio: number
  reembolso: number
  total: number
  perdida: number
  valor: number
  pct: number
}

type SortKey = 'grupo' | 'motivo' | 'sin_peticion' | 'cambio' | 'reembolso' | 'total' | 'valor'

export default function MatrizCausas({
  filas,
  totalPedidos,
}: {
  filas: FilaCausa[]
  totalPedidos: number
}) {
  const [key, setKey] = useState<SortKey>('grupo')
  const [asc, setAsc] = useState(true)

  const click = (k: SortKey) => {
    if (k === key) setAsc(!asc)
    else {
      setKey(k)
      setAsc(k === 'motivo' || k === 'grupo')
    }
  }

  const val = (f: FilaCausa, k: SortKey): string | number =>
    k === 'motivo' ? MOTIVO_LABEL[f.motivo] || f.motivo : k === 'grupo' ? GRUPO_ORDEN[grupoMotivo(f.motivo)] : f[k]

  const orden = [...filas].sort((a, b) => {
    const x = val(a, key)
    const y = val(b, key)
    let c = typeof x === 'string' ? x.localeCompare(y as string) : (x as number) - (y as number)
    // Al agrupar, dentro de cada grupo ordena por valor $ descendente.
    if (key === 'grupo' && c === 0) c = b.valor - a.valor
    return asc ? c : -c
  })

  const tot = filas.reduce(
    (a, f) => ({
      sin_peticion: a.sin_peticion + f.sin_peticion,
      cambio: a.cambio + f.cambio,
      reembolso: a.reembolso + f.reembolso,
      total: a.total + f.total,
      valor: a.valor + f.valor,
    }),
    { sin_peticion: 0, cambio: 0, reembolso: 0, total: 0, valor: 0 }
  )
  const maxValor = Math.max(...filas.map((f) => f.valor), 1)
  // Intensidad de la celda relativa a la celda mas cargada de su propia columna:
  // asi se ve donde se concentra cada desenlace sin que "sin pedir nada" tape todo.
  const maxCol = {
    sin_peticion: Math.max(...filas.map((f) => f.sin_peticion), 1),
    cambio: Math.max(...filas.map((f) => f.cambio), 1),
    reembolso: Math.max(...filas.map((f) => f.reembolso), 1),
  }

  const Th = ({ k, children, className = '' }: { k: SortKey; children: React.ReactNode; className?: string }) => (
    <th
      onClick={() => click(k)}
      className={`cursor-pointer select-none pb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-3)] hover:text-[var(--ink)] ${className}`}
    >
      {children}
      <span className="ml-1 text-[9px]">{key === k ? (asc ? '▲' : '▼') : '↕'}</span>
    </th>
  )

  const Celda = ({ n, col, color }: { n: number; col: keyof typeof maxCol; color: string }) => (
    <td className="py-1.5 text-center">
      <span
        className="inline-block min-w-[42px] rounded-md px-2 py-1 font-mono text-xs tabular-nums"
        style={{
          background: n === 0 ? 'transparent' : `color-mix(in srgb, ${color} ${12 + (n / maxCol[col]) * 60}%, transparent)`,
          color: n === 0 ? 'var(--ink-3)' : 'var(--ink)',
        }}
      >
        {n === 0 ? '·' : agrupar(n)}
      </span>
    </td>
  )

  return (
    <div>
      <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--ink-3)]">
        Causa raíz × desenlace · dónde se sangra
      </p>
      <p className="mb-3 mt-1 text-[11px] text-[var(--ink-3)]">
        Los {agrupar(totalPedidos)} pedidos con reclamo, cada uno en <b>una sola celda</b>: la fila dice por qué
        reclamó, la columna qué terminó pidiendo. La última columna es cuánto valen esos pedidos (la barra es su
        proporción respecto de la causa que más vale). Clic en cualquier columna para reordenar.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse">
          <thead>
            <tr className="border-b border-[var(--line)]">
              <Th k="grupo" className="text-left">
                Categoría
              </Th>
              <Th k="motivo" className="text-left">
                Causa raíz
              </Th>
              <Th k="sin_peticion">No pidió nada</Th>
              <Th k="cambio">Cambio</Th>
              <Th k="reembolso">Quiere la plata</Th>
              <Th k="total" className="text-right">
                <span className="block">Pedidos</span>
                <span className="block text-[9px] font-normal normal-case tracking-normal text-[var(--ink-3)]">
                  y % del total
                </span>
              </Th>
              <Th k="valor" className="text-right">
                <span className="block">Valor en $</span>
                <span className="block text-[9px] font-normal normal-case tracking-normal text-[var(--ink-3)]">
                  cuánto valen esos pedidos
                </span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {orden.map((f) => (
              <tr key={f.motivo} className="border-b border-[var(--line)] last:border-0 hover:bg-[var(--line)]/30">
                <td className="py-1.5 pr-3">
                  <span
                    className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[10.5px] font-medium ${GRUPO_CHIP[grupoMotivo(f.motivo)]}`}
                  >
                    {GRUPO_LABEL[grupoMotivo(f.motivo)]}
                  </span>
                </td>
                <td className="max-w-[180px] truncate py-1.5 pr-3 text-sm text-[var(--ink-2)]" title={MOTIVO_LABEL[f.motivo] || f.motivo}>
                  {MOTIVO_LABEL[f.motivo] || f.motivo}
                </td>
                <Celda n={f.sin_peticion} col="sin_peticion" color="var(--ink-3)" />
                <Celda n={f.cambio} col="cambio" color="var(--warn)" />
                <Celda n={f.reembolso} col="reembolso" color="var(--crit)" />
                <td className="py-1.5 text-center font-mono text-xs tabular-nums text-[var(--ink)]">
                  {agrupar(f.total)}
                  <span className="ml-1 text-[10px] text-[var(--ink-3)]">{f.pct}%</span>
                </td>
                <td className="py-1.5 pl-3">
                  <div className="ml-auto w-28">
                    <div className="text-right font-mono text-xs tabular-nums text-[var(--ink)]">{fmtCLP(f.valor)}</div>
                    <div className="ml-auto mt-1 h-1 w-full overflow-hidden rounded-full bg-[var(--line)]">
                      <span
                        className="block h-full rounded-full"
                        style={{ width: `${(f.valor / maxValor) * 100}%`, background: 'var(--accent)' }}
                      />
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-[var(--line)]">
              <td colSpan={2} className="pt-2 pr-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-3)]">Total</td>
              <td className="pt-2 text-center font-mono text-xs tabular-nums text-[var(--ink-2)]">{agrupar(tot.sin_peticion)}</td>
              <td className="pt-2 text-center font-mono text-xs tabular-nums text-[var(--ink-2)]">{agrupar(tot.cambio)}</td>
              <td className="pt-2 text-center font-mono text-xs tabular-nums text-[var(--ink-2)]">{agrupar(tot.reembolso)}</td>
              <td className="pt-2 text-center font-mono text-xs font-semibold tabular-nums text-[var(--ink)]">{agrupar(tot.total)}</td>
              <td className="pt-2 pl-3 text-right font-mono text-xs font-semibold tabular-nums text-[var(--ink)]">
                {fmtCLP(tot.valor)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="mt-3 text-[11px] text-[var(--ink-3)]">
        La <b>Categoría</b> dice <b>dónde se arregla</b> cada reclamo:{' '}
        <b className="text-[var(--ok)]">Tienda · lo arreglo yo</b> (talla, datos → editar la ficha en Shopify,
        gratis), <b className="text-[var(--warn)]">Producto · proveedora</b> (foto distinta, calidad, roto,
        equivocado → QC / apretar fábrica), <b className="text-[var(--accent)]">Envío · courier</b> (no llegó →
        mejorar despacho o cambiar carrier) y <b>Gestión del cliente</b> (cancelación, pago, consultas → solo
        responder bien, sin fix de raíz). La intensidad de cada celda es relativa a su propia columna. &quot;Pidió
        sin declarar causa&quot; son reclamos donde nunca quedó registrado el motivo — no se los inventamos.{' '}
        <b>Valor en $</b> es lo que valen esos pedidos (lo que la clienta pagó), no lo reembolsado — el detalle de
        devoluciones está en su sección.
      </p>
    </div>
  )
}
