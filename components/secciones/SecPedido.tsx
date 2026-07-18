'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Package, Truck, MessageSquare, AlertTriangle, User } from 'lucide-react'
import type { Pedido360 } from '@/lib/supabase/queries'
import { MOTIVO_LABEL, GRUPO_LABEL, DESENLACE_LABEL, grupoMotivo } from '@/lib/supabase/queries'
import { fmtCLP } from '@/lib/format'

const NO_CAUSA = new Set(['consulta_estado', 'reembolso_solicitado', 'cambio_solicitado'])
const GRAVEDAD_TXT: Record<number, string> = { 1: 'Consulta', 2: 'Reclamo', 3: 'Enojada / reembolso', 4: 'Disputa / legal' }

// Sintetiza los N mensajes clasificados en una sola caracterización del reclamo.
function caracterizar(reclamos: Pedido360['reclamos']) {
  if (reclamos.length === 0) return null
  const rs = [...reclamos].sort((a, b) => (a.fecha || '') < (b.fecha || '') ? -1 : 1)
  // causa raíz = motivo real (no desenlace) más frecuente
  const conteo = new Map<string, number>()
  for (const r of rs) if (r.motivo && !NO_CAUSA.has(r.motivo)) conteo.set(r.motivo, (conteo.get(r.motivo) || 0) + 1)
  let causa: string | null = null
  let maxN = 0
  for (const [m, n] of conteo) if (n > maxN) { maxN = n; causa = m }
  const motivos = new Set(rs.map((r) => r.motivo))
  const desenlace = motivos.has('reembolso_solicitado') ? 'reembolso' : motivos.has('cambio_solicitado') ? 'cambio' : 'sin_peticion'
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

export default function SecPedido({ pedido, query }: { pedido: Pedido360 | null; query: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [input, setInput] = useState(query)

  const buscar = () => {
    const q = input.trim().replace(/^#/, '')
    if (q) startTransition(() => router.push(`/?tab=pedido&q=${encodeURIComponent(q)}`))
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Buscador */}
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

      {query && !pedido && (
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-8 text-center text-[var(--ink-2)]">
          No se encontró el pedido <b>#{query}</b>. Revisá el número.
        </div>
      )}

      {pedido && (
        <>
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

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Línea de tiempo ParcelPanel */}
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
              <div className="mb-3 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-[var(--ink-3)]">
                <Truck size={14} /> Recorrido del envío ({pedido.tracking.length})
              </div>
              {pedido.tracking.length === 0 ? (
                <p className="text-xs text-[var(--ink-3)]">Sin historial de tracking cargado para este pedido.</p>
              ) : (
                <ol className="relative flex flex-col gap-3 border-l border-[var(--line-2)] pl-4">
                  {pedido.tracking.map((t, i) => (
                    <li key={i} className="relative">
                      <span
                        className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2 border-[var(--panel)]"
                        style={{ background: ETAPA_COLOR[t.etapa || ''] || 'var(--ink-3)' }}
                      />
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-[12px] font-medium text-[var(--ink)]">
                          {t.etapa ? ETAPA_LABEL[t.etapa] || t.etapa : 'Checkpoint'}
                        </span>
                        <span className="flex-none text-[10.5px] text-[var(--ink-3)]">{fmtFechaHora(t.fecha_checkpoint)}</span>
                      </div>
                      {t.descripcion && <p className="text-[11.5px] leading-snug text-[var(--ink-2)]">{t.descripcion}</p>}
                    </li>
                  ))}
                </ol>
              )}
            </div>

            {/* Conversación de correos */}
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
              <div className="mb-3 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-[var(--ink-3)]">
                <MessageSquare size={14} /> Conversación ({pedido.conversacion.length})
              </div>
              {pedido.conversacion.length === 0 ? (
                <p className="text-xs text-[var(--ink-3)]">Sin correos enlazados a este pedido.</p>
              ) : (
                <div className="flex max-h-[560px] flex-col gap-2.5 overflow-y-auto pr-1">
                  {pedido.conversacion.map((c, i) => {
                    const enviado = c.direccion === 'enviado'
                    return (
                      <div
                        key={i}
                        className={`max-w-[88%] rounded-xl border p-2.5 text-[12px] ${
                          enviado
                            ? 'ml-auto border-[var(--accent)]/25 bg-[var(--accent-soft)]'
                            : 'mr-auto border-[var(--line)] bg-[var(--panel-2)]'
                        }`}
                      >
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <span className={`text-[10px] font-semibold uppercase tracking-wide ${enviado ? 'text-[var(--accent)]' : 'text-[var(--ink-3)]'}`}>
                            {enviado ? 'SAC respondió' : 'Clienta'}
                          </span>
                          <span className="text-[10px] text-[var(--ink-3)]">{fmtFechaHora(c.fecha)}</span>
                        </div>
                        {c.asunto && <div className="mb-0.5 text-[11px] font-medium text-[var(--ink)]">{c.asunto}</div>}
                        <p className="whitespace-pre-wrap break-words leading-snug text-[var(--ink-2)]">
                          {(c.cuerpo || '').slice(0, 900)}
                          {(c.cuerpo || '').length > 900 ? '…' : ''}
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
