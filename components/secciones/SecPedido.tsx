'use client'

import { useState } from 'react'
import { Search, Package, Truck, MessageSquare, AlertTriangle, User } from 'lucide-react'
import type { Pedido360, PedidoLista } from '@/lib/supabase/queries'
import { MOTIVO_LABEL, GRUPO_LABEL, DESENLACE_LABEL, grupoMotivo, causaRaizDe, desenlaceDe } from '@/lib/supabase/queries'
import { fmtCLP } from '@/lib/format'

const GRAVEDAD_TXT: Record<number, string> = { 1: 'Consulta', 2: 'Reclamo', 3: 'Enojada / reembolso', 4: 'Disputa / legal' }

// Sintetiza los N mensajes clasificados en una sola caracterización del reclamo.
function caracterizar(reclamos: Pedido360['reclamos']) {
  if (reclamos.length === 0) return null
  const rs = [...reclamos].sort((a, b) => (a.fecha || '') < (b.fecha || '') ? -1 : 1)
  // MISMA regla que el dashboard: función compartida causaRaizDe.
  const causaRaiz = causaRaizDe(rs)
  const causa: string | null = causaRaiz === 'sin_causa_declarada' ? null : causaRaiz
  const desenlace = desenlaceDe(rs) // última petición del cliente (misma función que el dashboard)
  const gravMax = Math.max(0, ...rs.map((r) => r.gravedad || 0))
  return {
    causa,
    grupo: causa ? grupoMotivo(causa) : null,
    desenlace,
    gravMax,
    riesgo: rs.some((r) => r.riesgo_legal),
    abierto: rs.some((r) => r.estado === 'abierto'),
    mensajes: rs.length,
    desde: rs[0]?.fecha ?? null,
    hasta: rs[rs.length - 1]?.fecha ?? null,
  }
}

const ETAPA_LABEL: Record<string, string> = {
  origen: 'En origen (China)',
  aduana: 'Aduana / aeropuerto CL',
  ultima_milla: 'Última milla / regional',
  transito_nacional: 'En tránsito nacional',
}
const ETAPA_COLOR: Record<string, string> = {
  origen: 'var(--warn)',
  aduana: 'var(--crit)',
  ultima_milla: 'var(--ok)',
  transito_nacional: 'var(--ink-3)',
}
const GRAVEDAD_COLOR = (g: number | null) => ((g || 0) >= 4 ? 'var(--crit)' : (g || 0) >= 3 ? 'var(--warn)' : 'var(--ink-3)')

function fmtFechaHora(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function Dato({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-3)]">{label}</div>
      <div className="mt-0.5 text-[13px] text-[var(--ink)]">{children}</div>
    </div>
  )
}

type EventoTL = {
  fecha: string | null
  tipo: 'tracking' | 'correo'
  etapa?: string | null
  descripcion?: string | null
  direccion?: 'enviado' | 'recibido'
  asunto?: string | null
  cuerpo?: string | null
}

// Fusiona el recorrido del envío y la conversación en una sola línea de tiempo,
// del más reciente al más viejo.
function lineaTiempo(pedido: Pedido360): EventoTL[] {
  const ev: EventoTL[] = []
  for (const t of pedido.tracking) ev.push({ fecha: t.fecha_checkpoint, tipo: 'tracking', etapa: t.etapa, descripcion: t.descripcion })
  for (const c of pedido.conversacion) ev.push({ fecha: c.fecha, tipo: 'correo', direccion: c.direccion, asunto: c.asunto, cuerpo: c.cuerpo })
  // Respaldo: si aún no cargaron los checkpoints, mostrar el estado de envío conocido.
  if (pedido.tracking.length === 0 && pedido.orden.status_envio) {
    ev.push({
      fecha: pedido.orden.fecha_orden,
      tipo: 'tracking',
      etapa: pedido.orden.etapa_actual,
      descripcion: 'Estado del envío: ' + (pedido.orden.status_envio || '—') + ' (checkpoints detallados en carga)',
    })
  }
  ev.sort((a, b) => (a.fecha ? Date.parse(a.fecha) : 0) < (b.fecha ? Date.parse(b.fecha) : 0) ? 1 : -1)
  return ev
}

export default function SecPedido({
  pedido,
  lista,
  causa,
  desenlace,
  buscado,
  pending,
  onVerPedido,
  onBuscar,
}: {
  pedido: Pedido360 | null
  lista: PedidoLista[] | null
  causa: string
  desenlace: string
  buscado: string
  pending: boolean
  onVerPedido: (order: string) => void
  onBuscar: (order: string) => void
}) {
  const [input, setInput] = useState(buscado)

  const irAPedido = (on: string) => onVerPedido(on)
  const buscar = () => {
    const q = input.trim().replace(/^#/, '')
    if (q) onBuscar(q)
  }
  const tituloFiltro = [causa ? MOTIVO_LABEL[causa] || causa : '', desenlace ? DESENLACE_LABEL[desenlace] || desenlace : '']
    .filter(Boolean)
    .join(' · ')

  const contenido = (
    <div className="flex flex-col gap-6">
      {/* Buscador (solo fuera del drill-down) */}
      {!lista && (
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
        <div className="flex items-center gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-lg border border-[var(--line-2)] bg-[var(--panel-2)] px-3 py-2">
            <Search size={16} className="text-[var(--ink-3)]" />
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && buscar()}
              placeholder="Buscá por número de pedido (ej. 17283)"
              className="w-full bg-transparent text-[14px] text-[var(--ink)] outline-none placeholder:text-[var(--ink-3)]"
              autoFocus
            />
          </div>
          <button
            onClick={buscar}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-[13px] font-semibold text-white transition hover:opacity-90"
          >
            {pending ? 'Buscando…' : 'Buscar'}
          </button>
        </div>
        <p className="mt-2 text-[11px] text-[var(--ink-3)]">
          Ves el pedido, su recorrido en ParcelPanel, el reclamo clasificado y toda la conversación de correos (los
          que llegaron y los que respondió el SAC).
        </p>
      </div>
      )}

      {buscado && !pedido && !pending && (
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-8 text-center text-[var(--ink-2)]">
          No se encontró el pedido <b>#{buscado}</b>. Revisá el número.
        </div>
      )}

      {lista && !pedido && (
        <div className="rounded-2xl border border-dashed border-[var(--line-2)] bg-[var(--panel)] p-10 text-center text-[var(--ink-3)]">
          Elegí un pedido de la lista para ver su detalle completo.
        </div>
      )}

      {pedido && (
        <div className="grid gap-4 xl:grid-cols-[minmax(320px,410px)_1fr]">
          <div className="flex flex-col gap-4">
          {/* Cabecera del pedido */}
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <h2 className="font-serif text-[26px] font-light leading-none text-[var(--ink)]">
                Pedido #{pedido.orden.order_number}
              </h2>
              {pedido.reclamos.length > 0 && (
                <span className="rounded-full bg-[var(--crit-bg)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--crit)]">
                  Con reclamo
                </span>
              )}
              {pedido.orden.disputa_stripe && (
                <span className="rounded-full bg-[var(--crit-bg)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--crit)]">
                  Disputa Stripe
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              <Dato label="Fecha del pedido">{pedido.orden.fecha_orden || '—'}</Dato>
              <Dato label="Clienta">
                <span className="flex items-center gap-1.5">
                  <User size={13} className="text-[var(--ink-3)]" />
                  <span className="truncate" title={pedido.orden.email_clienta || ''}>
                    {pedido.orden.email_clienta || '—'}
                  </span>
                </span>
              </Dato>
              <Dato label="Monto">{pedido.orden.monto_clp ? fmtCLP(pedido.orden.monto_clp) : '—'}</Dato>
              <Dato label="Estado financiero">{pedido.orden.estado_financiero || '—'}</Dato>
              <Dato label="Reembolsado">
                {pedido.orden.monto_reembolsado ? fmtCLP(pedido.orden.monto_reembolsado) : '—'}
              </Dato>
              <Dato label="Envío">
                {pedido.orden.status_envio || '—'}
                {pedido.orden.etapa_actual && (
                  <span className="ml-1 text-[var(--ink-3)]">· {ETAPA_LABEL[pedido.orden.etapa_actual] || pedido.orden.etapa_actual}</span>
                )}
              </Dato>
              <Dato label="Días en tránsito">{pedido.orden.dias_transito ?? '—'}</Dato>
              <Dato label="Carrier">{pedido.orden.carrier || '—'}</Dato>
            </div>

            {/* Items */}
            {pedido.items.length > 0 && (
              <div className="mt-4 border-t border-[var(--line)] pt-3">
                <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-3)]">
                  <Package size={13} /> Productos
                </div>
                <ul className="flex flex-col gap-1">
                  {pedido.items.map((it, i) => (
                    <li key={i} className="flex items-center justify-between gap-3 text-[13px]">
                      <span className="truncate text-[var(--ink-2)]">
                        {it.cantidad || 1}× {it.producto_titulo || '—'}
                      </span>
                      <span className="flex-none font-mono text-xs tabular-nums text-[var(--ink)]">
                        {fmtCLP((it.precio || 0) * (it.cantidad || 1))}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Caracterización del reclamo (síntesis de todos los mensajes) */}
          {(() => {
            const c = caracterizar(pedido.reclamos)
            if (!c) return null
            return (
              <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5" style={{ borderLeft: '3px solid ' + GRAVEDAD_COLOR(c.gravMax) }}>
                <div className="mb-3 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-[var(--ink-3)]">
                  <AlertTriangle size={14} /> Caracterización del reclamo
                </div>

                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <span className="font-serif text-[22px] font-light text-[var(--ink)]">
                    {c.causa ? MOTIVO_LABEL[c.causa] || c.causa : 'Sin causa declarada'}
                  </span>
                  {c.grupo && (
                    <span className="rounded-full bg-[var(--panel-2)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--ink-2)]">
                      {GRUPO_LABEL[c.grupo]}
                    </span>
                  )}
                  <span
                    className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                    style={{ background: c.abierto ? 'var(--warn-bg)' : 'var(--ok-bg)', color: c.abierto ? 'var(--warn)' : 'var(--ok)' }}
                  >
                    {c.abierto ? 'Abierto' : 'Cerrado'}
                  </span>
                  {c.riesgo && (
                    <span className="rounded-full bg-[var(--crit-bg)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--crit)]">
                      Riesgo legal
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <Dato label="Qué terminó pidiendo">{DESENLACE_LABEL[c.desenlace] || c.desenlace}</Dato>
                  <Dato label="Gravedad máxima">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ background: GRAVEDAD_COLOR(c.gravMax) }} />
                      {c.gravMax} · {GRAVEDAD_TXT[c.gravMax] || '—'}
                    </span>
                  </Dato>
                  <Dato label="Mensajes">{c.mensajes}</Dato>
                  <Dato label="Desde → hasta">
                    <span className="text-[12px]">{fmtFechaHora(c.desde)} → {fmtFechaHora(c.hasta)}</span>
                  </Dato>
                </div>

                {/* Detalle mensaje por mensaje (colapsable) */}
                <details className="mt-3 border-t border-[var(--line)] pt-3">
                  <summary className="cursor-pointer text-[12px] font-medium text-[var(--accent)]">
                    Ver los {pedido.reclamos.length} mensajes clasificados
                  </summary>
                  <ul className="mt-2 flex flex-col gap-2">
                    {[...pedido.reclamos]
                      .sort((a, b) => ((a.fecha || '') < (b.fecha || '') ? -1 : 1))
                      .map((r, i) => (
                        <li key={i} className="flex items-start gap-3 rounded-lg border border-[var(--line)] p-2.5">
                          <span className="mt-1 h-2 w-2 flex-none rounded-full" style={{ background: GRAVEDAD_COLOR(r.gravedad) }} />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[12.5px] font-medium text-[var(--ink)]">
                                {r.motivo ? MOTIVO_LABEL[r.motivo] || r.motivo : 'Sin motivo'}
                              </span>
                              {r.resolucion && (
                                <span className="rounded-full bg-[var(--panel-2)] px-2 py-0.5 text-[10px] text-[var(--ink-2)]">{r.resolucion}</span>
                              )}
                              <span className="ml-auto text-[11px] text-[var(--ink-3)]">{fmtFechaHora(r.fecha)}</span>
                            </div>
                            {r.resumen && <p className="mt-0.5 text-[12px] leading-snug text-[var(--ink-2)]">{r.resumen}</p>}
                          </div>
                        </li>
                      ))}
                  </ul>
                </details>
              </div>
            )
          })()}
          </div>

          {/* Línea de tiempo unificada: envío + correos, del más reciente al más viejo */}
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
            <div className="mb-4 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-[var(--ink-3)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
              Línea de tiempo del pedido
              <span className="rounded-full bg-[var(--panel-2)] px-2 py-0.5 text-[10px] font-medium normal-case tracking-normal text-[var(--ink-2)]">
                {pedido.tracking.length + pedido.conversacion.length} eventos
              </span>
              <span className="ml-auto font-normal normal-case tracking-normal text-[10px]">del más reciente al más viejo</span>
            </div>
            {pedido.tracking.length + pedido.conversacion.length === 0 ? (
              <p className="text-xs text-[var(--ink-3)]">Sin envío ni correos cargados para este pedido.</p>
            ) : (
              <ol className="flex max-h-[70vh] flex-col overflow-y-auto pr-1">
                {lineaTiempo(pedido).map((e, i, arr) => {
                  const esTrack = e.tipo === 'tracking'
                  const color = esTrack
                    ? ETAPA_COLOR[e.etapa || ''] || 'var(--ink-3)'
                    : e.direccion === 'enviado'
                      ? 'var(--accent)'
                      : 'var(--ink-2)'
                  return (
                    <li key={i} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <span
                          className="grid h-7 w-7 flex-none place-items-center rounded-full ring-1 ring-inset"
                          style={{ background: `color-mix(in srgb, ${color} 13%, transparent)`, color, ...({ ['--tw-ring-color']: `color-mix(in srgb, ${color} 25%, transparent)` } as React.CSSProperties) }}
                        >
                          {esTrack ? <Truck size={13} /> : <MessageSquare size={13} />}
                        </span>
                        {i < arr.length - 1 && <span className="my-1 w-px flex-1 bg-[var(--line)]" />}
                      </div>
                      <div className="min-w-0 flex-1 pb-4">
                        {esTrack ? (
                          <>
                            <div className="flex items-baseline justify-between gap-2">
                              <span className="text-[12.5px] font-medium text-[var(--ink)]">
                                {e.etapa ? ETAPA_LABEL[e.etapa] || e.etapa : 'Envío'}
                              </span>
                              <span className="flex-none text-[10.5px] text-[var(--ink-3)]">{fmtFechaHora(e.fecha)}</span>
                            </div>
                            {e.descripcion && <p className="mt-0.5 text-[11.5px] leading-snug text-[var(--ink-3)]">{e.descripcion}</p>}
                          </>
                        ) : (
                          <div
                            className={`rounded-xl border p-3 ${
                              e.direccion === 'enviado' ? 'border-[var(--accent)]/20 bg-[var(--accent-soft)]' : 'border-[var(--line)] bg-[var(--panel-2)]'
                            }`}
                          >
                            <div className="mb-1 flex items-center justify-between gap-2">
                              <span className="text-[11px] font-semibold" style={{ color }}>
                                {e.direccion === 'enviado' ? 'SAC respondió' : 'Clienta'}
                              </span>
                              <span className="text-[10px] text-[var(--ink-3)]">{fmtFechaHora(e.fecha)}</span>
                            </div>
                            {e.asunto && <div className="mb-1 text-[11.5px] font-medium text-[var(--ink)]">{e.asunto}</div>}
                            <p className="whitespace-pre-wrap break-words text-[12px] leading-relaxed text-[var(--ink-2)]">
                              {(e.cuerpo || '').slice(0, 1200)}
                              {(e.cuerpo || '').length > 1200 ? '…' : ''}
                            </p>
                          </div>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ol>
            )}
          </div>
        </div>
      )}
    </div>
  )

  if (!lista) return contenido

  // Drill-down: lista de pedidos (master) + detalle (detail), estilo SPA.
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 text-[13px]">
        <span className="text-[var(--ink-2)]">
          Pedidos en <b className="text-[var(--ink)]">{tituloFiltro || 'el filtro'}</b>
        </span>
        <span className="rounded-full bg-[var(--panel-2)] px-2 py-0.5 text-[11px] font-medium text-[var(--ink-2)]">
          {lista.length}
        </span>
        {pending && <span className="text-[11px] text-[var(--accent)]">cargando…</span>}
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        {/* Master: lista */}
        <aside className="max-h-[calc(100vh-160px)] overflow-y-auto rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-2">
          {lista.length === 0 ? (
            <p className="p-4 text-xs text-[var(--ink-3)]">No hay pedidos en este filtro y rango.</p>
          ) : (
            <ul className="flex flex-col">
              {lista.map((p) => {
                const activo = p.order_number === pedido?.orden.order_number
                return (
                  <li key={p.order_number}>
                    <button
                      onClick={() => irAPedido(p.order_number)}
                      className={`w-full rounded-lg px-3 py-2 text-left transition ${
                        activo ? 'bg-[var(--accent-soft)]' : 'hover:bg-[var(--panel-2)]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 font-mono text-[12px] font-semibold text-[var(--ink)]">
                          <span className="h-1.5 w-1.5 rounded-full" style={{ background: GRAVEDAD_COLOR(p.gravedad) }} />
                          #{p.order_number}
                        </span>
                        <span className="text-[10px] text-[var(--ink-3)]">{p.fecha_orden || ''}</span>
                      </div>
                      <div className="mt-0.5 truncate text-[11px] text-[var(--ink-3)]">{p.email_clienta || '—'}</div>
                      {p.resumen && <div className="mt-0.5 line-clamp-2 text-[11.5px] leading-snug text-[var(--ink-2)]">{p.resumen}</div>}
                      <div className="mt-1 text-[10px] text-[var(--ink-3)]">{DESENLACE_LABEL[p.desenlace] || p.desenlace}</div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </aside>

        {/* Detail */}
        <div className={`min-w-0 transition ${pending ? 'pointer-events-none opacity-40' : ''}`}>{contenido}</div>
      </div>
    </div>
  )
}
