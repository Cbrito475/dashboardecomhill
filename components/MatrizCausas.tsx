'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { MOTIVO_LABEL, MOTIVO_DESC, GRUPO_LABEL, GRUPO_ORDEN, grupoMotivo } from '@/lib/supabase/queries'
import { fmtCLP, agrupar } from '@/lib/format'

const GRUPO_CHIP: Record<string, string> = {
  tienda: 'bg-[var(--ok-bg)] text-[var(--ok)]',
  producto: 'bg-[var(--warn-bg)] text-[var(--warn)]',
  envio: 'bg-[var(--accent-soft)] text-[var(--accent)]',
  gestion: 'bg-[var(--panel-2)] text-[var(--ink-2)]',
}

export type FilaCausa = {
  motivo: string
  esperando: number
  sin_exigir: number
  cambio: number
  reembolso: number
  total: number
  perdida: number
  valor: number
  pct: number
}

type SortKey = 'grupo' | 'motivo' | 'esperando' | 'sin_exigir' | 'cambio' | 'reembolso' | 'total' | 'valor'
type Pop = { top: number; left: number; motivo: string }

export default function MatrizCausas({ filas, totalPedidos }: { filas: FilaCausa[]; totalPedidos: number }) {
  const [key, setKey] = useState<SortKey>('grupo')
  const [asc, setAsc] = useState(true)
  const [pop, setPop] = useState<Pop | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()

  // Drill-down: abre la lista de pedidos filtrada, conservando el rango de fechas.
  const drill = (extra: Record<string, string>) => {
    const sp = new URLSearchParams()
    sp.set('tab', 'pedido')
    const d = searchParams.get('desde')
    const h = searchParams.get('hasta')
    if (d) sp.set('desde', d)
    if (h) sp.set('hasta', h)
    for (const [k, v] of Object.entries(extra)) sp.set(k, v)
    startTransition(() => router.push(`/?${sp.toString()}`))
  }
  const DESENLACE_COLS = ['esperando', 'sin_exigir', 'cambio', 'reembolso'] as const

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
    if (key === 'grupo' && c === 0) c = b.valor - a.valor
    return asc ? c : -c
  })

  const tot = filas.reduce(
    (a, f) => ({
      esperando: a.esperando + f.esperando,
      sin_exigir: a.sin_exigir + f.sin_exigir,
      cambio: a.cambio + f.cambio,
      reembolso: a.reembolso + f.reembolso,
      total: a.total + f.total,
      valor: a.valor + f.valor,
    }),
    { esperando: 0, sin_exigir: 0, cambio: 0, reembolso: 0, total: 0, valor: 0 }
  )
  const maxValor = Math.max(...filas.map((f) => f.valor), 1)
  const maxCol = {
    esperando: Math.max(...filas.map((f) => f.esperando), 1),
    sin_exigir: Math.max(...filas.map((f) => f.sin_exigir), 1),
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

  const Celda = ({ n, col, color, motivo }: { n: number; col: keyof typeof maxCol; color: string; motivo: string }) => (
    <td className="py-1.5 text-center">
      <span
        onClick={() => n > 0 && drill({ causa: motivo, desenlace: col })}
        title={n > 0 ? 'Ver estos pedidos' : undefined}
        className={`inline-block min-w-[40px] rounded-md px-2 py-1 font-mono text-xs tabular-nums transition ${
          n > 0 ? 'cursor-pointer hover:ring-2 hover:ring-[var(--accent)]/40' : ''
        }`}
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
        reclamó, la columna qué terminó pidiendo. <b>Clic en una causa, celda o total</b> abre la lista de esos
        pedidos para verlos uno por uno. Clic en el encabezado reordena.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] border-collapse">
          <thead>
            <tr className="border-b border-[var(--line)]">
              <Th k="grupo" className="text-left">
                Categoría
              </Th>
              <Th k="motivo" className="text-left">
                Causa raíz
              </Th>
              <Th k="esperando">
                <span className="block">Solo espera</span>
                <span className="block text-[9px] font-normal normal-case tracking-normal text-[var(--ink-3)]">¿dónde está?</span>
              </Th>
              <Th k="sin_exigir">
                <span className="block">Sin exigir</span>
                <span className="block text-[9px] font-normal normal-case tracking-normal text-[var(--ink-3)]">se quejó, no pidió</span>
              </Th>
              <Th k="cambio">Cambio</Th>
              <Th k="reembolso">Quiere la plata</Th>
              <Th k="total" className="text-right">
                <span className="block">Pedidos</span>
                <span className="block text-[9px] font-normal normal-case tracking-normal text-[var(--ink-3)]">y % del total</span>
              </Th>
              <Th k="valor" className="text-right">
                <span className="block">Valor en $</span>
                <span className="block text-[9px] font-normal normal-case tracking-normal text-[var(--ink-3)]">cuánto valen</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {orden.map((f) => (
              <tr key={f.motivo} className="border-b border-[var(--line)] last:border-0 hover:bg-[var(--line)]/30">
                <td className="py-1.5 pr-3">
                  <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[10.5px] font-medium ${GRUPO_CHIP[grupoMotivo(f.motivo)]}`}>
                    {GRUPO_LABEL[grupoMotivo(f.motivo)]}
                  </span>
                </td>
                <td className="max-w-[180px] truncate py-1.5 pr-3 text-sm text-[var(--ink-2)]">
                  <button
                    onClick={() => drill({ causa: f.motivo })}
                    title="Ver todos los pedidos de esta causa"
                    className="cursor-pointer border-b border-dotted border-[var(--line-2)] text-left hover:text-[var(--accent)]"
                    onMouseEnter={(e) => {
                      const r = e.currentTarget.getBoundingClientRect()
                      setPop({ top: r.bottom + 6, left: r.left, motivo: f.motivo })
                    }}
                    onMouseLeave={() => setPop(null)}
                  >
                    {MOTIVO_LABEL[f.motivo] || f.motivo}
                  </button>
                </td>
                <Celda n={f.esperando} col="esperando" color="var(--accent)" motivo={f.motivo} />
                <Celda n={f.sin_exigir} col="sin_exigir" color="var(--ink-3)" motivo={f.motivo} />
                <Celda n={f.cambio} col="cambio" color="var(--warn)" motivo={f.motivo} />
                <Celda n={f.reembolso} col="reembolso" color="var(--crit)" motivo={f.motivo} />
                <td className="py-1.5 text-center font-mono text-xs tabular-nums text-[var(--ink)]">
                  {agrupar(f.total)}
                  <span className="ml-1 text-[10px] text-[var(--ink-3)]">{f.pct}%</span>
                </td>
                <td className="py-1.5 pl-3">
                  <div className="ml-auto w-28">
                    <div className="text-right font-mono text-xs tabular-nums text-[var(--ink)]">{fmtCLP(f.valor)}</div>
                    <div className="ml-auto mt-1 h-1 w-full overflow-hidden rounded-full bg-[var(--line)]">
                      <span className="block h-full rounded-full" style={{ width: `${(f.valor / maxValor) * 100}%`, background: 'var(--accent)' }} />
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-[var(--line)]">
              <td colSpan={2} className="pt-2 pr-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-3)]">Total · clic para ver</td>
              {DESENLACE_COLS.map((col) => (
                <td key={col} className="pt-2 text-center">
                  <button
                    onClick={() => tot[col] > 0 && drill({ desenlace: col })}
                    title="Ver todos los pedidos que terminaron así"
                    className="rounded px-1.5 font-mono text-xs tabular-nums text-[var(--ink-2)] transition hover:text-[var(--accent)] hover:underline"
                  >
                    {agrupar(tot[col])}
                  </button>
                </td>
              ))}
              <td className="pt-2 text-center font-mono text-xs font-semibold tabular-nums text-[var(--ink)]">{agrupar(tot.total)}</td>
              <td className="pt-2 pl-3 text-right font-mono text-xs font-semibold tabular-nums text-[var(--ink)]">{fmtCLP(tot.valor)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="mt-3 text-[11px] text-[var(--ink-3)]">
        <b>Solo espera</b> = reclamó por el envío (&quot;¿dónde está?&quot;) pero no exigió nada, está esperando ·{' '}
        <b>Sin exigir</b> = se quejó del producto pero no pidió solución · <b>Cambio</b> / <b>Quiere la plata</b> =
        su última petición. La <b>Categoría</b> dice dónde se arregla. <b>Valor en $</b> es lo que valen esos
        pedidos (lo que la clienta pagó), no lo reembolsado.
      </p>

      {pending && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-[color-mix(in_srgb,var(--bg)_55%,transparent)] backdrop-blur-[2px]">
          <div className="flex items-center gap-3 rounded-xl border border-[var(--line-2)] bg-[var(--panel)] px-5 py-3 shadow-xl">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--line-2)] border-t-[var(--accent)]" />
            <span className="text-[13px] font-medium text-[var(--ink)]">Cargando pedidos…</span>
          </div>
        </div>
      )}

      {pop && !pending && (
        <div
          className="pointer-events-none fixed z-50 w-64 rounded-xl border border-[var(--line-2)] bg-[var(--panel)] p-3 shadow-xl"
          style={{ top: pop.top, left: pop.left }}
        >
          <div className="mb-1 text-[12px] font-semibold text-[var(--ink)]">{MOTIVO_LABEL[pop.motivo] || pop.motivo}</div>
          <div className="text-[12px] leading-snug text-[var(--ink-2)]">{MOTIVO_DESC[pop.motivo] || 'Sin descripción.'}</div>
        </div>
      )}
    </div>
  )
}
