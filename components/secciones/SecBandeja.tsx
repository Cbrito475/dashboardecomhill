'use client'

import { useTransition } from 'react'
import { Inbox, ArrowRight, X } from 'lucide-react'
import { MOTIVO_LABEL } from '@/lib/supabase/queries'
import type { BandejaItem } from '@/lib/supabase/sac'

const GRAV_COLOR = (g: number | null) => ((g || 0) >= 4 ? 'var(--crit)' : (g || 0) >= 3 ? 'var(--warn)' : 'var(--ink-3)')

function Fila({
  it,
  onVer,
  onAbrirCaso,
  onDescartar,
}: {
  it: BandejaItem
  onVer: (o: string) => void
  onAbrirCaso: (id: string) => void
  onDescartar: (id: string) => void
}) {
  const [pending, start] = useTransition()
  const abrir = () => (it.order_number ? onVer(it.order_number as string) : onAbrirCaso(it.id))
  return (
    <div className={`flex items-center gap-2 border-b border-[var(--line)] px-4 py-3 transition last:border-0 hover:bg-[var(--panel-2)] ${pending ? 'opacity-40' : ''}`}>
      <button onClick={abrir} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <span className="h-2 w-2 flex-none rounded-full" style={{ background: GRAV_COLOR(it.gravedad) }} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-[13px] font-medium text-[var(--ink)]">{it.cliente || 'Sin remitente'}</span>
            {it.riesgo_legal && <span className="flex-none rounded-full bg-[var(--crit-bg)] px-1.5 text-[10px] font-semibold text-[var(--crit)]">Legal</span>}
            {!it.order_number && <span className="flex-none rounded-full bg-[var(--warn-bg)] px-1.5 text-[10px] font-semibold text-[var(--warn)]">Sin pedido</span>}
          </div>
          <div className="truncate text-[12px] text-[var(--ink-2)]">{it.asunto || (it.motivo ? MOTIVO_LABEL[it.motivo] || it.motivo : '—')}</div>
          {it.motivo && <div className="text-[11px] text-[var(--ink-3)]">{MOTIVO_LABEL[it.motivo] || it.motivo}</div>}
        </div>
        <span className="flex flex-none items-center gap-1.5 rounded-lg bg-[var(--accent-soft)] px-3 py-1.5 text-[12px] font-semibold text-[var(--accent)]">
          {it.order_number ? `Abrir #${it.order_number}` : 'Ver correo'} <ArrowRight size={14} />
        </span>
      </button>
      <button
        onClick={() => start(() => Promise.resolve(onDescartar(it.id)))}
        disabled={pending}
        title="Descartar (no requiere respuesta)"
        className="flex flex-none items-center gap-1 rounded-lg border border-[var(--line-2)] px-2 py-1.5 text-[11px] font-medium text-[var(--ink-3)] transition hover:border-[var(--crit)]/40 hover:text-[var(--crit)] disabled:opacity-50"
      >
        <X size={14} /> Descartar
      </button>
    </div>
  )
}

export default function SecBandeja({
  items,
  onVer,
  onAbrirCaso,
  onDescartar,
}: {
  items: BandejaItem[]
  onVer: (order: string) => void
  onAbrirCaso: (id: string) => void
  onDescartar: (id: string) => void
}) {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-3 flex items-center gap-2">
        <Inbox size={18} className="text-[var(--accent)]" />
        <h2 className="font-serif text-[24px] font-light text-[var(--ink)]">Bandeja SAC</h2>
        <span className="rounded-full bg-[var(--panel-2)] px-2 py-0.5 text-[11px] font-medium text-[var(--ink-2)]">{items.length} esperan respuesta</span>
      </div>
      <p className="mb-3 text-[12px] text-[var(--ink-3)]">
        Correos de clientas que esperan respuesta. Abrí uno para ver el pedido, el hilo y el borrador; si la IA
        no pudo identificar el pedido, lo abrís igual (con el timeline) y se lo asignás. <b>Descartar</b> saca de
        la cola un correo que no requiere respuesta.
      </p>
      <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--panel)]">
        {items.length === 0 ? (
          <p className="p-10 text-center text-[13px] text-[var(--ink-3)]">No hay correos esperando respuesta.</p>
        ) : (
          items.map((it) => <Fila key={it.id} it={it} onVer={onVer} onAbrirCaso={onAbrirCaso} onDescartar={onDescartar} />)
        )}
      </div>
    </div>
  )
}
