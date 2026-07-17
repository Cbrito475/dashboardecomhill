'use client'

import { useState } from 'react'
import type { ProductoFila, ProblemaProducto } from '@/lib/supabase/queries'
import { MOTIVO_LABEL, nivelMotivo } from '@/lib/supabase/queries'
import { fmtCLP } from '@/lib/format'

const CHIP_CLS: Record<'crit' | 'warn' | 'leve', string> = {
  crit: 'bg-[var(--crit-bg)] text-[var(--crit)]',
  warn: 'bg-[var(--warn-bg)] text-[var(--warn)]',
  leve: 'bg-[var(--panel-2)] text-[var(--ink-2)]',
}

const NIVEL_DOT: Record<'crit' | 'warn' | 'leve', string> = {
  crit: 'var(--crit)',
  warn: 'var(--warn)',
  leve: 'var(--ink-3)',
}

const ESTADO_PILL: Record<string, { label: string; bg: string; color: string; orden: number }> = {
  ok: { label: 'OK', bg: 'var(--ok-bg)', color: 'var(--ok)', orden: 0 },
  vigilar: { label: 'Vigilar', bg: 'var(--warn-bg)', color: 'var(--warn)', orden: 1 },
  apagar: { label: 'Apagar', bg: 'var(--crit-bg)', color: 'var(--crit)', orden: 2 },
}

type SortKey = 'producto' | 'ventas' | 'pedidos' | 'reclamo' | 'desenlace' | 'solicitado' | 'aduana' | 'estado'

const COLS: { key: SortKey; label: string; align: 'left' | 'right' | 'center' }[] = [
  { key: 'producto', label: 'Producto', align: 'left' },
  { key: 'ventas', label: 'Ventas', align: 'right' },
  { key: 'pedidos', label: 'Pedidos', align: 'right' },
  { key: 'reclamo', label: '% reclamo', align: 'right' },
  { key: 'desenlace', label: 'Qué pidieron', align: 'left' },
  { key: 'solicitado', label: '$ solicitado', align: 'right' },
  { key: 'aduana', label: 'Tipo de problema', align: 'left' },
  { key: 'estado', label: 'Estado', align: 'left' },
]

function val(p: ProductoFila, key: SortKey): number | string {
  switch (key) {
    case 'producto': return (p.producto_titulo || '').toLowerCase()
    case 'ventas': return p.total_ventas
    case 'pedidos': return p.pedidos
    case 'reclamo': return p.pct_reclamo || 0
    case 'desenlace': return p.desenlace.reembolso
    case 'solicitado': return p.monto_solicitado
    case 'aduana': return p.problemas[0]?.grav ?? 0
    case 'estado': return ESTADO_PILL[p.estado_playbook]?.orden ?? 0
  }
}

type Pop = { top: number; left: number; nombre: string; problemas: ProblemaProducto[] }

export default function ProductTable({ productos }: { productos: ProductoFila[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('solicitado')
  const [dir, setDir] = useState<'asc' | 'desc'>('desc')
  const [pop, setPop] = useState<Pop | null>(null)

  const toggle = (key: SortKey) => {
    if (key === sortKey) setDir(dir === 'desc' ? 'asc' : 'desc')
    else {
      setSortKey(key)
      setDir(key === 'producto' ? 'asc' : 'desc')
    }
  }

  const rows = [...productos]
    .sort((a, b) => {
      const va = val(a, sortKey)
      const vb = val(b, sortKey)
      let cmp: number
      if (typeof va === 'string' || typeof vb === 'string') cmp = String(va).localeCompare(String(vb))
      else cmp = (va as number) - (vb as number)
      return dir === 'asc' ? cmp : -cmp
    })
    .slice(0, 25)

  return (
    <div className="overflow-x-auto rounded-2xl border border-[var(--line)] bg-[var(--panel)]">
      <table className="w-full min-w-[720px] border-collapse text-[13.5px]">
        <thead>
          <tr>
            {COLS.map((c) => {
              const active = c.key === sortKey
              return (
                <th
                  key={c.key}
                  onClick={() => toggle(c.key)}
                  className={`cursor-pointer select-none whitespace-nowrap border-b border-[var(--line)] px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide transition hover:text-[var(--ink)] ${
                    active ? 'text-[var(--ink)]' : 'text-[var(--ink-3)]'
                  } ${c.align === 'right' ? 'text-right' : 'text-left'}`}
                >
                  {c.label}
                  <span className="ml-1 inline-block w-2 text-[var(--accent)]">
                    {active ? (dir === 'desc' ? '▼' : '▲') : ''}
                  </span>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => {
            const pill = ESTADO_PILL[p.estado_playbook] || ESTADO_PILL.ok
            const top = p.problemas[0]
            const resto = p.problemas.slice(1)
            return (
              <tr key={p.product_id} className="border-b border-[var(--line)] last:border-0 hover:bg-[var(--panel-2)]">
                <td className="px-3 py-2.5">
                  <div className="font-medium text-[var(--ink)]">{p.producto_titulo || '—'}</div>
                  {p.motivo_dominante && (
                    <div className="mt-0.5 text-[11.5px] text-[var(--ink-3)]">
                      {MOTIVO_LABEL[p.motivo_dominante] || p.motivo_dominante}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums">{fmtCLP(p.total_ventas)}</td>
                <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums">{p.pedidos}</td>
                <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums">
                  <div>{p.pct_reclamo ?? 0}%</div>
                  <div className="text-[10px] text-[var(--ink-3)]">{p.reclamos} de {p.pedidos}</div>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2 font-mono text-xs tabular-nums">
                    <span className="flex items-center gap-1" title="Reclamó sin pedir nada concreto">
                      <span className="h-1.5 w-1.5 rounded-full bg-[var(--ink-3)]" />
                      {p.desenlace.sin_peticion}
                    </span>
                    <span className="flex items-center gap-1" title="Pidió cambio o reenvío">
                      <span className="h-1.5 w-1.5 rounded-full bg-[var(--warn)]" />
                      {p.desenlace.cambio}
                    </span>
                    <span className="flex items-center gap-1" title="Pidió que le devuelvan la plata">
                      <span className="h-1.5 w-1.5 rounded-full bg-[var(--crit)]" />
                      {p.desenlace.reembolso}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums">{fmtCLP(p.monto_solicitado)}</td>
                <td className="px-3 py-2.5">
                  {top ? (
                    <span
                      onMouseEnter={(e) => {
                        if (!resto.length) return
                        const r = e.currentTarget.getBoundingClientRect()
                        setPop({ top: r.bottom + 6, left: r.left, nombre: p.producto_titulo || '', problemas: p.problemas })
                      }}
                      onMouseLeave={() => setPop(null)}
                      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ${CHIP_CLS[nivelMotivo(top.motivo)]} ${resto.length ? 'cursor-help' : ''}`}
                    >
                      {MOTIVO_LABEL[top.motivo] || top.motivo} · {top.pct}%
                      {resto.length > 0 && <span className="text-[9px] opacity-60">+{resto.length}</span>}
                    </span>
                  ) : (
                    <span className="text-xs text-[var(--ink-3)]">—</span>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <span
                    className="inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                    style={{ background: pill.bg, color: pill.color }}
                  >
                    {pill.label}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-[var(--line)] px-3 py-2.5 text-[11px] text-[var(--ink-3)]">
        <span>
          <b>% reclamo</b>, estado y problema se miden <b>solo con reclamos que arreglás vos (tienda) o el
          proveedor (producto)</b>. Envío/courier y gestión del cliente no cuentan aquí.
        </span>
        <span className="flex items-center gap-1.5">
          <b>Qué pidieron</b> (de los reclamos del producto): <span className="text-[var(--ink-3)]">●</span> no pidió
          nada · <span className="text-[var(--warn)]">●</span> cambio · <span className="text-[var(--crit)]">●</span> quiere la plata.
        </span>
        <span className="flex items-center gap-1.5">
          <b>$ solicitado</b>: plata que las clientas pidieron devolver por ese producto (no lo pagado).
        </span>
        <span className="flex items-center gap-1.5">
          <b>Tipo de problema</b>: el reclamo <b>más común</b> de tienda o producto, con su % de pedidos. El color
          marca la gravedad; pasá el cursor para ver los demás.
        </span>
        <span>
          <b>Estado</b>: Apagar = dejar de vender · Vigilar = cerca del umbral · OK.
        </span>
      </div>

      {pop && (
        <div
          className="pointer-events-none fixed z-50 w-64 rounded-xl border border-[var(--line-2)] bg-[var(--panel)] p-3 shadow-xl"
          style={{ top: pop.top, left: pop.left }}
        >
          <div className="mb-2 border-b border-[var(--line)] pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-3)]">
            Reclamos · de más a menos grave
          </div>
          <ul className="flex flex-col gap-1.5">
            {pop.problemas.map((q) => {
              const nivel = nivelMotivo(q.motivo)
              return (
                <li key={q.motivo} className="flex items-center gap-2 text-[12px]">
                  <span className="h-2 w-2 flex-none rounded-full" style={{ background: NIVEL_DOT[nivel] }} />
                  <span className="flex-1 truncate text-[var(--ink-2)]">{MOTIVO_LABEL[q.motivo] || q.motivo}</span>
                  <span className="flex-none font-mono text-[11px] tabular-nums text-[var(--ink)]">{q.pct}%</span>
                  <span className="flex-none font-mono text-[10px] tabular-nums text-[var(--ink-3)]">({q.n})</span>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
