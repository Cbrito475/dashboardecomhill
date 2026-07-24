'use client'

import { useTransition } from 'react'
import { Inbox, ArrowRight, X, Check } from 'lucide-react'
import { MOTIVO_LABEL } from '@/lib/supabase/queries'
import type { BandejaItem, BandejaBucket } from '@/lib/supabase/sac'
import CierreDiaBoton from '@/components/CierreDia'

const GRAV_COLOR = (g: number | null) => ((g || 0) >= 4 ? 'var(--crit)' : (g || 0) >= 3 ? 'var(--warn)' : 'var(--ink-3)')

const BUCKETS: { key: BandejaBucket; label: string }[] = [
  { key: 'por_responder', label: 'Por responder' },
  { key: 'respondidos', label: 'Respondidos' },
  { key: 'cerrados', label: 'Cerrados' },
  { key: 'descartados', label: 'Descartados' },
]

const HINT: Record<BandejaBucket, string> = {
  por_responder: 'Correos de clientas que esperan respuesta. Abrí uno para ver el pedido, el hilo y el borrador.',
  respondidos: 'Casos ya respondidos: en cola de envío o enviados. Podés abrirlos para revisar o cerrarlos.',
  cerrados: 'Casos marcados como resueltos.',
  descartados: 'Correos que no requerían respuesta.',
}

// Etiqueta legible del estado, para los buckets no-pendientes.
const ESTADO_LABEL: Record<string, string> = {
  en_cola: 'En cola',
  enviado: 'Enviado',
  cerrado: 'Cerrado',
  no_responder: 'Descartado',
}
const ORIGEN_LABEL: Record<string, string> = {
  auto: 'Auto IA',
  borrador_sin_editar: 'Borrador IA',
  humano: 'Escrito por SAC',
}

function Fila({
  it,
  bucket,
  onVer,
  onAbrirCaso,
  onCerrar,
  onDescartar,
}: {
  it: BandejaItem
  bucket: BandejaBucket
  onVer: (o: string) => void
  onAbrirCaso: (id: string) => void
  onCerrar: (id: string) => void
  onDescartar: (id: string) => void
}) {
  const [pending, start] = useTransition()
  const abrir = () => (it.order_number ? onVer(it.order_number as string) : onAbrirCaso(it.id))
  const puedeCerrar = bucket === 'por_responder' || bucket === 'respondidos'
  const puedeDescartar = bucket === 'por_responder'
  const estadoBadge = bucket !== 'por_responder' ? ESTADO_LABEL[it.estado] : null

  return (
    <div className={`flex items-center gap-2 border-b border-[var(--line)] px-4 py-3 transition last:border-0 hover:bg-[var(--panel-2)] ${pending ? 'opacity-40' : ''}`}>
      <button onClick={abrir} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <span className="h-2 w-2 flex-none rounded-full" style={{ background: GRAV_COLOR(it.gravedad) }} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-[13px] font-medium text-[var(--ink)]">{it.cliente || 'Sin remitente'}</span>
            {it.riesgo_legal && <span className="flex-none rounded-full bg-[var(--crit-bg)] px-1.5 text-[10px] font-semibold text-[var(--crit)]">Legal</span>}
            {!it.order_number && <span className="flex-none rounded-full bg-[var(--warn-bg)] px-1.5 text-[10px] font-semibold text-[var(--warn)]">Sin pedido</span>}
            {estadoBadge && <span className="flex-none rounded-full bg-[var(--panel-2)] px-1.5 text-[10px] font-semibold text-[var(--ink-2)]">{estadoBadge}</span>}
            {estadoBadge && it.origen_envio && ORIGEN_LABEL[it.origen_envio] && (
              <span className="flex-none rounded-full bg-[var(--accent-soft)] px-1.5 text-[10px] font-medium text-[var(--accent)]">{ORIGEN_LABEL[it.origen_envio]}</span>
            )}
          </div>
          <div className="truncate text-[12px] text-[var(--ink-2)]">{it.asunto || (it.motivo ? MOTIVO_LABEL[it.motivo] || it.motivo : '—')}</div>
          {it.motivo && <div className="text-[11px] text-[var(--ink-3)]">{MOTIVO_LABEL[it.motivo] || it.motivo}</div>}
        </div>
        <span className="flex flex-none items-center gap-1.5 rounded-lg bg-[var(--accent-soft)] px-3 py-1.5 text-[12px] font-semibold text-[var(--accent)]">
          {it.order_number ? `Abrir #${it.order_number}` : 'Ver correo'} <ArrowRight size={14} />
        </span>
      </button>
      {puedeCerrar && (
        <button
          onClick={() => start(() => Promise.resolve(onCerrar(it.id)))}
          disabled={pending}
          title="Cerrar caso (resuelto)"
          className="flex flex-none items-center gap-1 rounded-lg border border-[var(--line-2)] px-2 py-1.5 text-[11px] font-medium text-[var(--ink-3)] transition hover:border-[var(--ok)]/50 hover:text-[var(--ok)] disabled:opacity-50"
        >
          <Check size={14} /> Cerrar
        </button>
      )}
      {puedeDescartar && (
        <button
          onClick={() => start(() => Promise.resolve(onDescartar(it.id)))}
          disabled={pending}
          title="Descartar (no requiere respuesta)"
          className="flex flex-none items-center gap-1 rounded-lg border border-[var(--line-2)] px-2 py-1.5 text-[11px] font-medium text-[var(--ink-3)] transition hover:border-[var(--crit)]/40 hover:text-[var(--crit)] disabled:opacity-50"
        >
          <X size={14} /> Descartar
        </button>
      )}
    </div>
  )
}

export default function SecBandeja({
  items,
  bucket,
  counts,
  onCambiarBucket,
  onVer,
  onAbrirCaso,
  onCerrar,
  onDescartar,
}: {
  items: BandejaItem[]
  bucket: BandejaBucket
  counts: Record<BandejaBucket, number>
  onCambiarBucket: (b: BandejaBucket) => void
  onVer: (order: string) => void
  onAbrirCaso: (id: string) => void
  onCerrar: (id: string) => void
  onDescartar: (id: string) => void
}) {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-3 flex items-center gap-2">
        <Inbox size={18} className="text-[var(--accent)]" />
        <h2 className="font-serif text-[24px] font-light text-[var(--ink)]">Bandeja SAC</h2>
        <span className="flex-1" />
        <CierreDiaBoton />
      </div>

      {/* Filtro por estado — segmented con contador por grupo */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {BUCKETS.map((b) => {
          const activo = b.key === bucket
          return (
            <button
              key={b.key}
              onClick={() => onCambiarBucket(b.key)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium transition ${
                activo ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'text-[var(--ink-2)] hover:bg-[var(--panel-2)]'
              }`}
            >
              {b.label}
              <span
                className={`rounded-full px-1.5 text-[10px] font-semibold tabular-nums ${
                  activo ? 'bg-[var(--accent)] text-white' : 'bg-[var(--panel-2)] text-[var(--ink-3)]'
                }`}
              >
                {counts[b.key] ?? 0}
              </span>
            </button>
          )
        })}
      </div>

      <p className="mb-3 text-[12px] text-[var(--ink-3)]">{HINT[bucket]}</p>

      <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--panel)]">
        {items.length === 0 ? (
          <p className="p-10 text-center text-[13px] text-[var(--ink-3)]">No hay casos en este grupo.</p>
        ) : (
          items.map((it) => (
            <Fila
              key={it.id}
              it={it}
              bucket={bucket}
              onVer={onVer}
              onAbrirCaso={onAbrirCaso}
              onCerrar={onCerrar}
              onDescartar={onDescartar}
            />
          ))
        )}
      </div>
    </div>
  )
}
