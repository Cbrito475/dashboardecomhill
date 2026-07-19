'use client'

import { useState, useTransition } from 'react'
import { Inbox, ArrowRight, Link2 } from 'lucide-react'
import { MOTIVO_LABEL } from '@/lib/supabase/queries'
import type { BandejaItem } from '@/lib/supabase/sac'

const GRAV_COLOR = (g: number | null) => ((g || 0) >= 4 ? 'var(--crit)' : (g || 0) >= 3 ? 'var(--warn)' : 'var(--ink-3)')

function Fila({ it, onVer, onAsignar }: { it: BandejaItem; onVer: (o: string) => void; onAsignar: (id: string, o: string) => void }) {
  const [order, setOrder] = useState('')
  const [pending, start] = useTransition()
  const asignar = () => {
    const o = order.trim().replace(/^#/, '')
    if (o) start(() => Promise.resolve(onAsignar(it.id, o)))
  }
  return (
    <div className="flex items-center gap-3 border-b border-[var(--line)] px-4 py-3 last:border-0 hover:bg-[var(--panel-2)]">
      <span className="h-2 w-2 flex-none rounded-full" style={{ background: GRAV_COLOR(it.gravedad) }} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[13px] font-medium text-[var(--ink)]">{it.cliente || 'Sin remitente'}</span>
          {it.riesgo_legal && <span className="flex-none rounded-full bg-[var(--crit-bg)] px-1.5 text-[10px] font-semibold text-[var(--crit)]">Legal</span>}
        </div>
        <div className="truncate text-[12px] text-[var(--ink-2)]">{it.asunto || (it.motivo ? MOTIVO_LABEL[it.motivo] || it.motivo : '—')}</div>
        {it.motivo && <div className="text-[11px] text-[var(--ink-3)]">{MOTIVO_LABEL[it.motivo] || it.motivo}</div>}
      </div>
      {it.order_number ? (
        <button
          onClick={() => onVer(it.order_number as string)}
          className="flex flex-none items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-[12px] font-semibold text-white transition hover:opacity-90"
        >
          Abrir #{it.order_number} <ArrowRight size={14} />
        </button>
      ) : (
        <div className="flex flex-none items-center gap-1.5">
          <span className="text-[11px] text-[var(--ink-3)]">Sin pedido —</span>
          <div className="flex items-center rounded-lg border border-[var(--line-2)] bg-[var(--panel)] pl-2">
            <span className="text-[12px] text-[var(--ink-3)]">#</span>
            <input
              value={order}
              onChange={(e) => setOrder(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && asignar()}
              placeholder="pedido"
              className="w-20 bg-transparent px-1 py-1.5 text-[12px] text-[var(--ink)] outline-none"
            />
            <button onClick={asignar} disabled={pending || !order.trim()} className="flex items-center gap-1 rounded-r-lg bg-[var(--ink)] px-2 py-1.5 text-[11px] font-semibold text-[var(--bg)] disabled:opacity-40">
              <Link2 size={12} /> Asignar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function SecBandeja({
  items,
  onVer,
  onAsignar,
}: {
  items: BandejaItem[]
  onVer: (order: string) => void
  onAsignar: (id: string, order: string) => void
}) {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-3 flex items-center gap-2">
        <Inbox size={18} className="text-[var(--accent)]" />
        <h2 className="font-serif text-[24px] font-light text-[var(--ink)]">Bandeja SAC</h2>
        <span className="rounded-full bg-[var(--panel-2)] px-2 py-0.5 text-[11px] font-medium text-[var(--ink-2)]">{items.length} esperan respuesta</span>
      </div>
      <p className="mb-3 text-[12px] text-[var(--ink-3)]">
        Correos de clientas que esperan respuesta. Abrí uno para ver el pedido y el borrador. Si la IA no pudo
        identificar el pedido, asignáselo a mano.
      </p>
      <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--panel)]">
        {items.length === 0 ? (
          <p className="p-10 text-center text-[13px] text-[var(--ink-3)]">No hay correos esperando respuesta.</p>
        ) : (
          items.map((it) => <Fila key={it.id} it={it} onVer={onVer} onAsignar={onAsignar} />)
        )}
      </div>
    </div>
  )
}
