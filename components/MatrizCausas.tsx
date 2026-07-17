'use client'

import { useState } from 'react'
import { MOTIVO_LABEL } from '@/lib/supabase/queries'
import { fmtCLP, agrupar } from '@/lib/format'

export type FilaCausa = {
  motivo: string
  sin_peticion: number
  cambio: number
  reembolso: number
  total: number
  perdida: number
  pct: number
}

type SortKey = 'motivo' | 'sin_peticion' | 'cambio' | 'reembolso' | 'total' | 'perdida'

export default function MatrizCausas({
  filas,
  totalPedidos,
  perdidaGlobal,
}: {
  filas: FilaCausa[]
  totalPedidos: number
  perdidaGlobal: number
}) {
  const [key, setKey] = useState<SortKey>('perdida')
  const [asc, setAsc] = useState(false)

  const click = (k: SortKey) => {
    if (k === key) setAsc(!asc)
    else {
      setKey(k)
      setAsc(k === 'motivo')
    }
  }

  const val = (f: FilaCausa, k: SortKey): string | number => (k === 'motivo' ? MOTIVO_LABEL[f.motivo] || f.motivo : f[k])

  const orden = [...filas].sort((a, b) => {
    const x = val(a, key)
    const y = val(b, key)
    const c = typeof x === 'string' ? x.localeCompare(y as string) : (x as number) - (y as number)
    return asc ? c : -c
  })

  const tot = filas.reduce(
    (a, f) => ({
      sin_peticion: a.sin_peticion + f.sin_peticion,
      cambio: a.cambio + f.cambio,
      reembolso: a.reembolso + f.reembolso,
      total: a.total + f.total,
      perdida: a.perdida + f.perdida,
    }),
    { sin_peticion: 0, cambio: 0, reembolso: 0, total: 0, perdida: 0 }
  )
  const maxPerdida = Math.max(...filas.map((f) => f.perdida), 1)
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
        reclamó, la columna qué terminó pidiendo. Ordenada por lo reembolsado (la barra roja es su proporción
        respecto de la causa que más costó). Clic en cualquier columna para reordenar.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse">
          <thead>
            <tr className="border-b border-[var(--line)]">
              <Th k="motivo" className="text-left">
                Causa raíz
              </Th>
              <Th k="sin_peticion">No pidió nada</Th>
              <Th k="cambio">Cambio</Th>
              <Th k="reembolso">Quiere la plata</Th>
              <Th k="total">Pedidos</Th>
              <Th k="perdida" className="text-right">
                <span className="block">$ reembolsado</span>
                <span className="block text-[9px] font-normal normal-case tracking-normal text-[var(--ink-3)]">
                  barra = proporción del máximo
                </span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {orden.map((f) => (
              <tr key={f.motivo} className="border-b border-[var(--line)] last:border-0 hover:bg-[var(--line)]/30">
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
                  <div className="flex items-center justify-end gap-2">
                    <span className="h-2 w-16 flex-none overflow-hidden rounded-full bg-[var(--line)]">
                      <span
                        className="block h-full rounded-full"
                        style={{ width: `${(f.perdida / maxPerdida) * 100}%`, background: 'var(--crit)' }}
                      />
                    </span>
                    <span className="w-24 flex-none text-right font-mono text-xs tabular-nums text-[var(--ink)]">
                      {fmtCLP(f.perdida)}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-[var(--line)]">
              <td className="pt-2 pr-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-3)]">Total</td>
              <td className="pt-2 text-center font-mono text-xs tabular-nums text-[var(--ink-2)]">{agrupar(tot.sin_peticion)}</td>
              <td className="pt-2 text-center font-mono text-xs tabular-nums text-[var(--ink-2)]">{agrupar(tot.cambio)}</td>
              <td className="pt-2 text-center font-mono text-xs tabular-nums text-[var(--ink-2)]">{agrupar(tot.reembolso)}</td>
              <td className="pt-2 text-center font-mono text-xs font-semibold tabular-nums text-[var(--ink)]">{agrupar(tot.total)}</td>
              <td className="pt-2 pl-3 text-right font-mono text-xs font-semibold tabular-nums text-[var(--ink)]">
                {fmtCLP(tot.perdida)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="mt-3 text-[11px] text-[var(--ink-3)]">
        La intensidad de cada celda es relativa a su propia columna. &quot;Pidió sin declarar causa&quot; son
        reclamos donde nunca quedó registrado el motivo — no se los inventamos.
      </p>
      {perdidaGlobal > tot.perdida && (
        <p className="mt-2 rounded-lg border border-[var(--line)] bg-[var(--line)]/20 p-2.5 text-[11px] leading-relaxed text-[var(--ink-3)]">
          <b className="text-[var(--ink-2)]">Ojo con el total:</b> estos {fmtCLP(tot.perdida)} son solo los
          reembolsos de pedidos con un reclamo atado. En el período se devolvieron{' '}
          <b className="text-[var(--ink-2)]">{fmtCLP(perdidaGlobal)}</b> — la diferencia (
          {fmtCLP(perdidaGlobal - tot.perdida)},{' '}
          {Math.round(((perdidaGlobal - tot.perdida) / perdidaGlobal) * 100)}%) son pedidos que se reembolsaron
          sin que tengamos su reclamo enlazado. Esa brecha se cierra a medida que carguemos los correos que faltan.
        </p>
      )}
    </div>
  )
}
