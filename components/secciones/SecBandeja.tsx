'use client'

import { useMemo, useState, useTransition } from 'react'
import { Inbox, X, Check, Gavel, Search, ShieldAlert, ArrowDownWideNarrow } from 'lucide-react'
import { MOTIVO_LABEL } from '@/lib/supabase/queries'
import { MOTIVO_DISPUTA_LABEL, ESTADO_DISPUTA_LABEL } from '@/lib/supabase/disputas'
import type { BandejaItem, BandejaBucket } from '@/lib/supabase/sac'
import CierreDiaBoton from '@/components/CierreDia'

const BUCKETS: { key: BandejaBucket; label: string }[] = [
  { key: 'por_responder', label: 'Por responder' },
  { key: 'respondidos', label: 'Respondidos' },
  { key: 'cerrados', label: 'Cerrados' },
  { key: 'descartados', label: 'Descartados' },
]

const HINT: Record<BandejaBucket, string> = {
  por_responder: 'Correos que esperan respuesta, lo más urgente arriba. Elegí uno para trabajarlo al lado.',
  respondidos: 'Casos ya respondidos: en cola de envío o enviados.',
  cerrados: 'Casos marcados como resueltos.',
  descartados: 'Correos que no requerían respuesta.',
}

const ESTADO_LABEL: Record<string, string> = { en_cola: 'En cola', enviado: 'Enviado', cerrado: 'Cerrado', no_responder: 'Descartado' }
const ORIGEN_LABEL: Record<string, string> = { auto: 'Auto IA', borrador_sin_editar: 'Borrador IA', humano: 'Escrito por SAC' }

type Orden = 'prioridad' | 'nuevo' | 'viejo'
const ORDEN_LABEL: Record<Orden, string> = { prioridad: 'Prioridad', nuevo: 'Más nuevo', viejo: 'Más viejo' }

// Prioridad para ordenar la cola: lo que hay que atender antes va primero.
function prioridad(it: BandejaItem): number {
  if (it.tipo === 'disputa') return 0
  if (it.riesgo_legal) return 1
  if ((it.gravedad || 0) >= 4) return 2
  if ((it.gravedad || 0) >= 3) return 3
  return 4
}

// Cuánto hace que espera, en formato corto.
function haceCuanto(iso: string | null): string {
  if (!iso) return ''
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (min < 1) return 'recién'
  if (min < 60) return `hace ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `hace ${h} h`
  const d = Math.floor(h / 24)
  return `hace ${d} d`
}

function Fila({
  it,
  bucket,
  activo,
  onVer,
  onAbrirCaso,
  onCerrar,
  onDescartar,
}: {
  it: BandejaItem
  bucket: BandejaBucket
  activo: boolean
  onVer: (o: string) => void
  onAbrirCaso: (id: string) => void
  onCerrar: (id: string) => void
  onDescartar: (id: string) => void
}) {
  const [pending, start] = useTransition()
  const esDisputa = it.tipo === 'disputa'
  // Una disputa cerrada no es urgente: solo la abierta se pinta de alarma.
  const disputaAbierta = esDisputa && (it.estado === 'needs_response' || it.estado === 'under_review')
  const p = prioridad(it)
  const barra = disputaAbierta ? 'var(--crit)' : it.riesgo_legal ? 'var(--crit)' : p === 2 ? 'var(--crit)' : p === 3 ? 'var(--warn)' : 'var(--line-2)'

  const abrir = () => (it.order_number ? onVer(it.order_number as string) : onAbrirCaso(it.id))
  const puedeCerrar = !esDisputa && (bucket === 'por_responder' || bucket === 'respondidos')
  const puedeDescartar = !esDisputa && bucket === 'por_responder'
  const estadoBadge = !esDisputa && bucket !== 'por_responder' ? ESTADO_LABEL[it.estado] : null
  const motivoTxt = it.motivo ? (esDisputa ? MOTIVO_DISPUTA_LABEL[it.motivo] || it.motivo : MOTIVO_LABEL[it.motivo] || it.motivo) : null

  return (
    <div
      className={`group relative flex cursor-pointer flex-col gap-1 border-b border-[var(--line)] px-3 py-2.5 transition last:border-0 ${
        activo ? 'bg-[var(--accent-soft)]' : 'hover:bg-[var(--panel-2)]'
      } ${pending ? 'opacity-40' : ''}`}
      onClick={abrir}
    >
      <span className="absolute inset-y-0 left-0 w-[3px] rounded-r" style={{ background: activo ? 'var(--accent)' : barra }} />

      <div className="flex items-center gap-2 pl-1.5">
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[var(--ink)]">{it.cliente || 'Sin remitente'}</span>
        <span className="flex-none text-[10.5px] text-[var(--ink-3)]">{haceCuanto(it.fecha)}</span>
      </div>

      <div className="flex flex-wrap items-center gap-1 pl-1.5">
        {esDisputa && (
          <span
            className="flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-white"
            style={{ background: disputaAbierta ? 'var(--crit)' : 'var(--ink-3)' }}
          >
            <Gavel size={9} /> Disputa
          </span>
        )}
        {!esDisputa && it.riesgo_legal && (
          <span className="flex items-center gap-0.5 rounded-full bg-[var(--crit-bg)] px-1.5 py-0.5 text-[9.5px] font-semibold text-[var(--crit)]">
            <ShieldAlert size={9} /> Legal
          </span>
        )}
        {!it.order_number && !esDisputa && (
          <span className="rounded-full bg-[var(--warn-bg)] px-1.5 py-0.5 text-[9.5px] font-semibold text-[var(--warn)]">Sin pedido</span>
        )}
        {motivoTxt && <span className="truncate text-[11px] text-[var(--ink-2)]">{motivoTxt}</span>}
        {esDisputa && <span className="text-[10px] text-[var(--ink-3)]">· {ESTADO_DISPUTA_LABEL[it.estado] || it.estado}</span>}
        {estadoBadge && <span className="rounded-full bg-[var(--panel-2)] px-1.5 py-0.5 text-[9.5px] font-semibold text-[var(--ink-2)]">{estadoBadge}</span>}
        {estadoBadge && it.origen_envio && ORIGEN_LABEL[it.origen_envio] && (
          <span className="rounded-full bg-[var(--accent-soft)] px-1.5 py-0.5 text-[9.5px] font-medium text-[var(--accent)]">{ORIGEN_LABEL[it.origen_envio]}</span>
        )}
      </div>

      {/* Asunto + adelanto del borrador: triar sin abrir */}
      {(it.asunto || it.borrador) && (
        <div className="pl-1.5">
          {it.asunto && <div className="truncate text-[11.5px] text-[var(--ink-2)]">{it.asunto}</div>}
          {bucket === 'por_responder' && it.borrador && (
            <div className="mt-0.5 line-clamp-1 text-[11px] italic text-[var(--ink-3)]">✎ {it.borrador.replace(/\s+/g, ' ').trim()}</div>
          )}
        </div>
      )}

      {/* Acciones: aparecen al pasar el mouse o si está activa */}
      {(puedeCerrar || puedeDescartar) && (
        <div className={`flex gap-1.5 pl-1.5 pt-1 transition ${activo ? '' : 'opacity-0 group-hover:opacity-100'}`}>
          {puedeCerrar && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                start(() => Promise.resolve(onCerrar(it.id)))
              }}
              disabled={pending}
              className="flex items-center gap-1 rounded-md border border-[var(--line-2)] px-2 py-1 text-[10.5px] font-medium text-[var(--ink-3)] transition hover:border-[var(--ok)]/50 hover:text-[var(--ok)]"
            >
              <Check size={12} /> Cerrar
            </button>
          )}
          {puedeDescartar && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                start(() => Promise.resolve(onDescartar(it.id)))
              }}
              disabled={pending}
              className="flex items-center gap-1 rounded-md border border-[var(--line-2)] px-2 py-1 text-[10.5px] font-medium text-[var(--ink-3)] transition hover:border-[var(--crit)]/40 hover:text-[var(--crit)]"
            >
              <X size={12} /> Descartar
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function SecBandeja({
  items,
  bucket,
  counts,
  seleccionado,
  onCambiarBucket,
  onVer,
  onAbrirCaso,
  onCerrar,
  onDescartar,
}: {
  items: BandejaItem[]
  bucket: BandejaBucket
  counts: Record<BandejaBucket, number>
  seleccionado?: string | null
  onCambiarBucket: (b: BandejaBucket) => void
  onVer: (order: string) => void
  onAbrirCaso: (id: string) => void
  onCerrar: (id: string) => void
  onDescartar: (id: string) => void
}) {
  const [q, setQ] = useState('')
  const [soloLegal, setSoloLegal] = useState(false)
  const [soloSinPedido, setSoloSinPedido] = useState(false)
  const [orden, setOrden] = useState<Orden>('prioridad')
  const [ordenOpen, setOrdenOpen] = useState(false)

  const filtrados = useMemo(() => {
    const t = q.trim().toLowerCase()
    const list = items.filter((it) => {
      if (soloLegal && !it.riesgo_legal) return false
      if (soloSinPedido && it.order_number) return false
      if (!t) return true
      const motivo = it.motivo ? MOTIVO_LABEL[it.motivo] || it.motivo : ''
      return [it.cliente, it.order_number, it.asunto, motivo, it.motivo].filter(Boolean).join(' ').toLowerCase().includes(t)
    })
    const fecha = (it: BandejaItem) => (it.fecha ? new Date(it.fecha).getTime() : 0)
    if (orden === 'nuevo') return list.sort((a, b) => fecha(b) - fecha(a))
    if (orden === 'viejo') return list.sort((a, b) => fecha(a) - fecha(b))
    // Prioridad (por defecto): urgencia, y dentro de cada nivel la que espera hace más tiempo.
    return list.sort((a, b) => {
      const pa = prioridad(a)
      const pb = prioridad(b)
      if (pa !== pb) return pa - pb
      return (fecha(a) || Infinity) - (fecha(b) || Infinity)
    })
  }, [items, q, soloLegal, soloSinPedido, orden])

  const hayFiltro = q.trim() !== '' || soloLegal || soloSinPedido
  const activoDe = (it: BandejaItem) =>
    !!seleccionado && (it.id === seleccionado || (!!it.order_number && it.order_number === seleccionado))

  return (
    <div className="flex h-full min-h-0 flex-col rounded-2xl border border-[var(--line)] bg-[var(--panel)]">
      {/* Encabezado + toolbar */}
      <div className="flex-none border-b border-[var(--line)] px-4 pb-3.5 pt-4">
        <div className="mb-3.5 flex items-center gap-2">
          <Inbox size={18} className="text-[var(--accent)]" />
          <h2 className="font-serif text-[20px] font-light text-[var(--ink)]">Bandeja</h2>
          <span className="flex-1" />
          <CierreDiaBoton />
        </div>

        {/* Grupos por estado */}
        <div className="mb-3 flex flex-wrap gap-1.5">
          {BUCKETS.map((b) => {
            const on = b.key === bucket
            return (
              <button
                key={b.key}
                onClick={() => onCambiarBucket(b.key)}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition ${
                  on ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'text-[var(--ink-2)] hover:bg-[var(--panel-2)]'
                }`}
              >
                {b.label}
                <span
                  className={`rounded-full px-1.5 text-[10px] font-semibold tabular-nums ${
                    on ? 'bg-[var(--accent)] text-white' : 'bg-[var(--panel-2)] text-[var(--ink-3)]'
                  }`}
                >
                  {counts[b.key] ?? 0}
                </span>
              </button>
            )
          })}
        </div>

        {/* Buscador en su propia fila, con aire */}
        <div className="flex items-center gap-2 rounded-lg border border-[var(--line-2)] bg-[var(--panel-2)] px-3 py-2">
          <Search size={15} className="flex-none text-[var(--ink-3)]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar clienta, pedido, motivo…"
            className="w-full bg-transparent text-[13px] text-[var(--ink)] outline-none placeholder:text-[var(--ink-3)]"
          />
          {q && (
            <button onClick={() => setQ('')} className="flex-none text-[var(--ink-3)] hover:text-[var(--ink)]">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filtros + orden en una fila aparte, separados */}
        <div className="mt-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setSoloLegal((v) => !v)}
              title="Solo casos con riesgo legal"
              className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition ${
                soloLegal ? 'border-[var(--crit)]/50 bg-[var(--crit-bg)] text-[var(--crit)]' : 'border-[var(--line-2)] text-[var(--ink-2)] hover:bg-[var(--panel-2)]'
              }`}
            >
              Legal
            </button>
            <button
              onClick={() => setSoloSinPedido((v) => !v)}
              title="Solo casos sin pedido asignado"
              className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition ${
                soloSinPedido ? 'border-[var(--warn)]/50 bg-[var(--warn-bg)] text-[var(--warn)]' : 'border-[var(--line-2)] text-[var(--ink-2)] hover:bg-[var(--panel-2)]'
              }`}
            >
              Sin pedido
            </button>
          </div>

          {/* Orden de la lista */}
          <div className="relative">
            <button
              onClick={() => setOrdenOpen((v) => !v)}
              title="Ordenar la lista"
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition ${
                orden !== 'prioridad' ? 'border-[var(--accent)]/50 bg-[var(--accent-soft)] text-[var(--accent)]' : 'border-[var(--line-2)] text-[var(--ink-2)] hover:bg-[var(--panel-2)]'
              }`}
            >
              <ArrowDownWideNarrow size={13} /> {ORDEN_LABEL[orden]}
            </button>
            {ordenOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setOrdenOpen(false)} />
                <div className="absolute right-0 top-full z-20 mt-1.5 w-36 rounded-lg border border-[var(--line-2)] bg-[var(--panel)] p-1 shadow-xl">
                  {(['prioridad', 'nuevo', 'viejo'] as Orden[]).map((o) => (
                    <button
                      key={o}
                      onClick={() => {
                        setOrden(o)
                        setOrdenOpen(false)
                      }}
                      className={`block w-full rounded-md px-2.5 py-1.5 text-left text-[12px] transition ${
                        orden === o ? 'bg-[var(--accent-soft)] font-medium text-[var(--accent)]' : 'text-[var(--ink-2)] hover:bg-[var(--panel-2)]'
                      }`}
                    >
                      {ORDEN_LABEL[o]}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Lista */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <div className="grid h-full place-items-center p-8 text-center">
            <div>
              <Check size={26} className="mx-auto mb-2 text-[var(--ok)]" strokeWidth={1.5} />
              <p className="text-[13px] font-medium text-[var(--ink-2)]">
                {bucket === 'por_responder' ? 'Cola limpia · nada por responder' : 'No hay casos en este grupo'}
              </p>
            </div>
          </div>
        ) : filtrados.length === 0 ? (
          <p className="p-8 text-center text-[13px] text-[var(--ink-3)]">
            Nada coincide con el filtro.{' '}
            <button
              onClick={() => {
                setQ('')
                setSoloLegal(false)
                setSoloSinPedido(false)
              }}
              className="text-[var(--accent)] hover:underline"
            >
              Limpiar
            </button>
          </p>
        ) : (
          <>
            {hayFiltro && (
              <div className="border-b border-[var(--line)] bg-[var(--panel-2)] px-3 py-1 text-[10.5px] text-[var(--ink-3)]">
                {filtrados.length} de {items.length}
              </div>
            )}
            {filtrados.map((it) => (
              <Fila
                key={it.id}
                it={it}
                bucket={bucket}
                activo={activoDe(it)}
                onVer={onVer}
                onAbrirCaso={onAbrirCaso}
                onCerrar={onCerrar}
                onDescartar={onDescartar}
              />
            ))}
          </>
        )}
      </div>
    </div>
  )
}
