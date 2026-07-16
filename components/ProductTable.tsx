'use client'

import { useState } from 'react'
import type { ProductoFila } from '@/lib/supabase/queries'
import { MOTIVO_LABEL } from '@/lib/supabase/queries'
import { fmtCLP } from '@/lib/format'

const ESTADO_PILL: Record<string, { label: string; bg: string; color: string; orden: number }> = {
  ok: { label: 'OK', bg: 'var(--ok-bg)', color: 'var(--ok)', orden: 0 },
  vigilar: { label: 'Vigilar', bg: 'var(--warn-bg)', color: 'var(--warn)', orden: 1 },
  apagar: { label: 'Apagar', bg: 'var(--crit-bg)', color: 'var(--crit)', orden: 2 },
}

type SortKey = 'producto' | 'ventas' | 'pedidos' | 'reclamo' | 'perdido' | 'aduana' | 'estado'

const COLS: { key: SortKey; label: string; align: 'left' | 'right' | 'center' }[] = [
  { key: 'producto', label: 'Producto', align: 'left' },
  { key: 'ventas', label: 'Ventas', align: 'right' },
  { key: 'pedidos', label: 'Pedidos', align: 'right' },
  { key: 'reclamo', label: '% reclamo', align: 'right' },
  { key: 'perdido', label: '$ perdido', align: 'right' },
  { key: 'aduana', label: 'Aduana/calidad', align: 'left' },
  { key: 'estado', label: 'Estado', align: 'left' },
]

function val(p: ProductoFila, key: SortKey): number | string {
  switch (key) {
    case 'producto': return (p.producto_titulo || '').toLowerCase()
    case 'ventas': return p.total_ventas
    case 'pedidos': return p.pedidos
    case 'reclamo': return p.pct_reclamo || 0
    case 'perdido': return p.monto_reembolsado
    case 'aduana': return p.pct_aduana || 0
    case 'estado': return ESTADO_PILL[p.estado_playbook]?.orden ?? 0
  }
}

export default function ProductTable({ productos }: { productos: ProductoFila[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('perdido')
  const [dir, setDir] = useState<'asc' | 'desc'>('desc')

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
            const totalMotivo = (p.pct_aduana || 0) + (p.pct_calidad || 0)
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
                <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums">{p.pct_reclamo ?? 0}%</td>
                <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums">{fmtCLP(p.monto_reembolsado)}</td>
                <td className="px-3 py-2.5">
                  {totalMotivo > 0 ? (
                    <span className="flex h-1.5 w-16 overflow-hidden rounded-full bg-[var(--line-2)]">
                      <span style={{ width: `${p.pct_aduana || 0}%`, background: 'var(--crit)' }} />
                      <span style={{ width: `${p.pct_calidad || 0}%`, background: 'var(--warn)' }} />
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
    </div>
  )
}
