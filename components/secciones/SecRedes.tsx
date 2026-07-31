'use client'

import { useEffect, useState, useTransition } from 'react'
import { Clock, ExternalLink, MessageCircle, RefreshCw, XCircle, AlertTriangle, CheckCircle2 } from 'lucide-react'
import type { RedCaso, RedMensaje } from '@/lib/supabase/redes'
import { accionRedesLista, accionRedesHilo, accionRedesResolver, accionRedesNoResponder } from '@/app/actions-redes'

// ============================================================================
// Redes (Facebook + Instagram) — DATOS REALES desde social_mensajes.
// La ingesta corre en n8n (WF-S1, cada 5 min, solo lectura). Por ahora el SAC
// responde desde Messenger/Instagram y marca acá; los borradores IA y el envío
// desde el panel llegan en la siguiente etapa (WF-S2/S3).
// ============================================================================

function haceCuanto(iso: string): string {
  const min = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000))
  if (min < 60) return `hace ${min} min`
  const h = Math.round(min / 60)
  if (h < 48) return `hace ${h} h`
  return `hace ${Math.round(h / 24)} días`
}

function ChipRed({ plataforma }: { plataforma: RedCaso['plataforma'] }) {
  const fb = plataforma === 'facebook'
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[10.5px] font-bold"
      style={{
        background: fb ? 'color-mix(in srgb, #1864d4 14%, var(--panel))' : 'color-mix(in srgb, #c02a6c 12%, var(--panel))',
        color: fb ? '#1864d4' : '#c02a6c',
      }}
    >
      {fb ? 'FB' : 'IG'}
    </span>
  )
}

export default function SecRedes() {
  const [casos, setCasos] = useState<RedCaso[]>([])
  const [hilo, setHilo] = useState<RedMensaje[]>([])
  const [selId, setSelId] = useState<string | null>(null)
  const [filtro, setFiltro] = useState<'pendientes' | 'resueltos' | 'todos'>('pendientes')
  const [msg, setMsg] = useState<string | null>(null)
  const [cargando, startCarga] = useTransition()
  const [accionando, startAccion] = useTransition()

  const cargar = () =>
    startCarga(async () => {
      const lista = await accionRedesLista()
      setCasos(lista)
    })

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const abrir = (id: string) =>
    startCarga(async () => {
      setSelId(id)
      setMsg(null)
      setHilo(await accionRedesHilo(id))
    })

  const resolver = (id: string, modo: 'resuelto' | 'no_responder') =>
    startAccion(async () => {
      const r = modo === 'resuelto' ? await accionRedesResolver(id) : await accionRedesNoResponder(id)
      if (!r.ok) {
        setMsg(r.error || 'No se pudo completar')
        return
      }
      setMsg(modo === 'resuelto' ? 'Conversación marcada como resuelta' : 'Marcada como no responder')
      const lista = await accionRedesLista()
      setCasos(lista)
      setHilo(await accionRedesHilo(id))
    })

  const items = casos.filter((c) => {
    if (filtro === 'pendientes') return c.pendientes > 0
    if (filtro === 'resueltos') return c.pendientes === 0
    return true
  })
  const sel = selId ? casos.find((c) => c.conversacion_id === selId) ?? null : null
  const vencidos = casos.filter((c) => c.vencido).length
  const nPend = casos.filter((c) => c.pendientes > 0).length

  const FILTROS: { key: typeof filtro; label: string; n: number }[] = [
    { key: 'pendientes', label: 'Por responder', n: nPend },
    { key: 'resueltos', label: 'Resueltos', n: casos.length - nPend },
    { key: 'todos', label: 'Todos', n: casos.length },
  ]

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <p className="rounded-lg border border-[var(--ok)]/40 bg-[var(--ok-bg)] px-3 py-1.5 text-[12px] font-semibold text-[var(--ok)]">
          ● Conectado a Facebook en vivo (cada 5 min) — borradores IA y respuesta desde el panel: próxima etapa
        </p>
        {vencidos > 0 && (
          <span className="flex items-center gap-1.5 rounded-lg border border-[var(--crit)]/30 bg-[var(--crit-bg)] px-3 py-1.5 text-[12px] font-bold text-[var(--crit)]">
            <AlertTriangle size={14} /> {vencidos} DM con ventana de 24 h vencida
          </span>
        )}
        <button
          onClick={cargar}
          className="ml-auto flex items-center gap-1.5 rounded-lg border border-[var(--line-2)] bg-[var(--panel)] px-3 py-1.5 text-[12px] font-semibold text-[var(--ink-2)] transition hover:bg-[var(--panel-2)]"
        >
          <RefreshCw size={13} className={cargando ? 'animate-spin' : ''} /> Actualizar
        </button>
      </div>

      <div className={`grid min-h-0 flex-1 gap-4 transition lg:grid-cols-[minmax(320px,380px)_minmax(0,1fr)] ${cargando ? 'pointer-events-none opacity-60' : ''}`}>
        {/* ============ Cola ============ */}
        <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--panel)] lg:h-full">
          <div className="border-b border-[var(--line)] px-4 pb-3 pt-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--ink-3)]">Redes · conversaciones</p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {FILTROS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFiltro(f.key)}
                  className={`rounded-full border px-3 py-1 text-[12px] font-medium transition ${
                    filtro === f.key
                      ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                      : 'border-[var(--line-2)] bg-[var(--panel-2)] text-[var(--ink-2)] hover:text-[var(--ink)]'
                  }`}
                >
                  {f.label} <span className="ml-0.5 tabular-nums opacity-70">{f.n}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {items.length === 0 && !cargando && (
              <p className="p-6 text-center text-[13px] text-[var(--ink-3)]">
                {filtro === 'pendientes' ? 'No hay conversaciones esperando respuesta 🎉' : 'Nada por acá todavía.'}
              </p>
            )}
            {items.map((c) => {
              const activo = c.conversacion_id === selId
              return (
                <button
                  key={c.conversacion_id}
                  onClick={() => abrir(c.conversacion_id)}
                  className={`block w-full border-b border-[var(--line)] px-3.5 py-3 text-left transition hover:bg-[var(--panel-2)] ${
                    activo ? 'bg-[var(--accent-soft)]' : ''
                  } ${c.pendientes === 0 ? 'opacity-70' : ''}`}
                  style={{ borderLeft: `3px solid ${c.vencido ? 'var(--crit)' : c.pendientes > 0 ? 'var(--warn)' : 'transparent'}` }}
                >
                  <span className="flex flex-wrap items-center gap-1.5">
                    <ChipRed plataforma={c.plataforma} />
                    {c.tipo === 'dm' && (
                      <span className="rounded-full border border-[var(--line-2)] bg-[var(--panel-2)] px-2 py-0.5 text-[10.5px] font-bold text-[var(--ink-2)]">DM</span>
                    )}
                    <span className="truncate text-[13px] font-bold text-[var(--ink)]">{c.autor_nombre || 'Sin nombre'}</span>
                    {c.vencido && (
                      <span className="rounded-full bg-[var(--crit-bg)] px-2 py-0.5 text-[10.5px] font-bold text-[var(--crit)]">Ventana vencida</span>
                    )}
                    {c.pendientes > 0 && !c.vencido && (
                      <span className="rounded-full bg-[var(--warn-bg)] px-2 py-0.5 text-[10.5px] font-bold text-[var(--warn)]">
                        {c.pendientes} sin responder
                      </span>
                    )}
                    <span className="ml-auto whitespace-nowrap text-[11px] text-[var(--ink-3)]">{haceCuanto(c.ultima_fecha)}</span>
                  </span>
                  <span className="mt-1 block truncate text-[12.5px] text-[var(--ink-3)]">{c.ultimo_texto || '(sin texto)'}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* ============ Detalle: hilo completo ============ */}
        <div className="min-h-0 min-w-0 lg:h-full lg:overflow-y-auto">
          {sel ? (
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <h2 className="text-[18px] font-bold text-[var(--ink)]">
                  {sel.tipo === 'dm' ? 'Mensaje directo' : 'Comentarios'} · {sel.autor_nombre || 'Sin nombre'}
                </h2>
                <ChipRed plataforma={sel.plataforma} />
              </div>
              <p className="mb-4 text-[12.5px] text-[var(--ink-3)]">
                {sel.total} mensaje{sel.total !== 1 ? 's' : ''} · último {haceCuanto(sel.ultima_fecha)}
                {sel.tipo === 'dm' && sel.pendientes > 0 && !sel.vencido && (
                  <span className="ml-2 font-semibold text-[var(--ok)]">
                    <Clock size={12} className="mr-0.5 inline" /> ventana de 24 h corriendo
                  </span>
                )}
              </p>

              {sel.contexto_post && (
                <div className="mb-3 rounded-xl border border-[var(--line)] bg-[var(--panel-2)] px-3.5 py-2.5">
                  <p className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--ink-3)]">Post donde comentó</p>
                  <p className="mt-0.5 text-[13px] text-[var(--ink-2)]">{sel.contexto_post}</p>
                </div>
              )}

              {sel.vencido && (
                <div className="mb-3 rounded-xl border border-[var(--crit)]/30 bg-[var(--crit-bg)] px-3.5 py-3 text-[13px] font-semibold text-[var(--crit)]">
                  <AlertTriangle size={14} className="mr-1 inline" /> La ventana de 24 h de Meta venció: este DM ya no se podrá responder por API.
                  <p className="mt-1 text-[12px] font-normal text-[var(--ink-2)]">Respondelo desde Messenger y marcá la conversación como resuelta acá.</p>
                </div>
              )}

              {/* Hilo de mensajes de la clienta */}
              <div className="mb-4 space-y-2">
                {hilo.map((m) => (
                  <div
                    key={m.id}
                    className="rounded-xl border border-[var(--line)] px-3.5 py-2.5"
                    style={{
                      borderLeft: `3px solid ${m.estado === 'nuevo' || m.estado === 'esperando_humano' ? 'var(--warn)' : 'var(--line-2)'}`,
                      opacity: m.estado === 'cerrado' || m.estado === 'no_responder' ? 0.75 : 1,
                    }}
                  >
                    <p className="text-[12px] text-[var(--ink-3)]">
                      <span className="font-bold text-[var(--ink)]">{m.autor_nombre || 'Clienta'}</span> · {haceCuanto(m.fecha)}
                      {(m.estado === 'cerrado' || m.estado === 'no_responder') && (
                        <span className="ml-2 rounded-full bg-[var(--panel-2)] px-2 py-0.5 text-[10.5px] font-semibold">
                          {m.estado === 'cerrado' ? 'respondido' : 'no responder'}
                        </span>
                      )}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-[13.5px] leading-relaxed text-[var(--ink)]">{m.texto || '(sin texto)'}</p>
                  </div>
                ))}
              </div>

              {/* Acciones */}
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href="https://business.facebook.com/latest/inbox/all"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-2 text-[13px] font-semibold text-white transition hover:opacity-90"
                >
                  <ExternalLink size={15} /> Responder en Messenger
                </a>
                {sel.pendientes > 0 && (
                  <>
                    <button
                      onClick={() => resolver(sel.conversacion_id, 'resuelto')}
                      disabled={accionando}
                      className="flex items-center gap-1.5 rounded-lg border border-[var(--line-2)] px-3.5 py-2 text-[13px] font-semibold text-[var(--ink-2)] transition hover:bg-[var(--panel-2)] disabled:opacity-50"
                    >
                      <CheckCircle2 size={15} /> Marcar resuelto
                    </button>
                    <button
                      onClick={() => resolver(sel.conversacion_id, 'no_responder')}
                      disabled={accionando}
                      className="flex items-center gap-1.5 rounded-lg border border-[var(--line-2)] px-3.5 py-2 text-[13px] font-medium text-[var(--ink-3)] transition hover:bg-[var(--panel-2)] disabled:opacity-50"
                    >
                      <XCircle size={15} /> No responder
                    </button>
                  </>
                )}
              </div>
              <p className="mt-2 text-[12px] text-[var(--ink-3)]">
                Por ahora la respuesta se envía desde Messenger/Instagram y se marca acá. El borrador de IA y el envío directo desde el panel llegan en la próxima etapa.
              </p>
              {msg && <p className="mt-2 text-[12px] font-semibold text-[var(--ok)]">{msg}</p>}
            </div>
          ) : (
            <div className="grid h-full place-items-center rounded-2xl border border-dashed border-[var(--line-2)] bg-[var(--panel)] p-10 text-center">
              <div>
                <MessageCircle size={28} className="mx-auto mb-2 text-[var(--ink-3)]" strokeWidth={1.5} />
                <p className="text-[14px] font-medium text-[var(--ink-2)]">Elegí una conversación</p>
                <p className="mt-1 text-[12px] text-[var(--ink-3)]">Son tus DMs y comentarios reales de Facebook, actualizados cada 5 minutos.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
