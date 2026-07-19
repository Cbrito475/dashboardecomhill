'use client'

import { useMemo, useState } from 'react'
import { Search, Package, Truck, MessageSquare, AlertTriangle, User } from 'lucide-react'
import type { Pedido360, PedidoLista, ProductoFila } from '@/lib/supabase/queries'
import { MOTIVO_LABEL, GRUPO_LABEL, DESENLACE_LABEL, grupoMotivo, nivelMotivo, causaRaizDe, desenlaceDe } from '@/lib/supabase/queries'
import { fmtCLP } from '@/lib/format'

const GRAVEDAD_TXT: Record<number, string> = { 1: 'Consulta', 2: 'Reclamo', 3: 'Enojada / reembolso', 4: 'Disputa / legal' }

const NIVEL_DOT: Record<'crit' | 'warn' | 'leve', string> = {
  crit: 'var(--crit)',
  warn: 'var(--warn)',
  leve: 'var(--ink-3)',
}

// Normaliza título de producto para cruzar items del pedido con las estadísticas
// del dashboard cuando no coincide el shopify_product_id.
const normTit = (s: string) => (s || '').toLowerCase().trim().replace(/\s+/g, ' ')

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
function fmtFechaCorta(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' })
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
  track_number?: string | null
  carrier?: string | null
  paquete?: number // nº de paquete (reenvíos): 1 = original, 2+ = reenvío
  direccion?: 'enviado' | 'recibido'
  asunto?: string | null
  cuerpo?: string | null
}

// Fusiona el recorrido del envío y la conversación en una sola línea de tiempo,
// del más reciente al más viejo. Cuando hay más de un nº de seguimiento, cada
// evento de envío queda etiquetado con su paquete (el pedido fue reenviado).
function lineaTiempo(pedido: Pedido360): { eventos: EventoTL[]; paquetes: string[] } {
  // Orden de aparición de los tracking numbers = orden de despacho (1º original).
  const paquetes: string[] = []
  for (const t of pedido.tracking) {
    const tn = (t.track_number || '').trim()
    if (tn && !paquetes.includes(tn)) paquetes.push(tn)
  }
  const numPaquete = (tn: string | null | undefined) => {
    const i = paquetes.indexOf((tn || '').trim())
    return i >= 0 ? i + 1 : undefined
  }

  const ev: EventoTL[] = []
  for (const t of pedido.tracking)
    ev.push({
      fecha: t.fecha_checkpoint,
      tipo: 'tracking',
      etapa: t.etapa,
      descripcion: t.descripcion,
      track_number: t.track_number,
      carrier: t.carrier,
      paquete: paquetes.length > 1 ? numPaquete(t.track_number) : undefined,
    })
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
  return { eventos: ev, paquetes }
}

type PopProd = { top: number; left: number; prod: ProductoFila | null; titulo: string }

export default function SecPedido({
  pedido,
  lista,
  causa,
  desenlace,
  rango,
  buscado,
  pending,
  productos,
  onVerPedido,
  onBuscar,
}: {
  pedido: Pedido360 | null
  lista: PedidoLista[] | null
  causa: string
  desenlace: string
  rango: string
  buscado: string
  pending: boolean
  productos: ProductoFila[]
  onVerPedido: (order: string) => void
  onBuscar: (order: string) => void
}) {
  const [input, setInput] = useState(buscado)
  const [popProd, setPopProd] = useState<PopProd | null>(null)

  // Cruce artículo → estadísticas de reclamo del producto (mismas que la tabla de
  // productos). Por shopify_product_id y, de respaldo, por título normalizado.
  const prodMap = useMemo(() => {
    const m = new Map<string, ProductoFila>()
    for (const p of productos) {
      if (p.product_id) m.set(String(p.product_id), p)
      if (p.producto_titulo) m.set('t:' + normTit(p.producto_titulo), p)
    }
    return m
  }, [productos])
  const statsDe = (it: { shopify_product_id?: string | null; producto_titulo?: string | null }): ProductoFila | null =>
    (it.shopify_product_id != null ? prodMap.get(String(it.shopify_product_id)) : undefined) ??
    (it.producto_titulo ? prodMap.get('t:' + normTit(it.producto_titulo)) : undefined) ??
    null

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
        <div className="grid gap-4 xl:h-[calc(100vh-175px)] xl:grid-cols-[340px_minmax(0,1fr)]">
          <div className="flex min-w-0 flex-col gap-4 xl:overflow-y-auto xl:pr-1">
          {/* Detalle del pedido */}
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
            <div className="grid grid-cols-2 gap-x-5 gap-y-3">
              <Dato label="Fecha del pedido">{pedido.orden.fecha_orden || '—'}</Dato>
              <Dato label="Clienta">
                <span className="flex items-start gap-1.5">
                  <User size={13} className="mt-0.5 flex-none text-[var(--ink-3)]" />
                  <span className="[overflow-wrap:anywhere]">{pedido.orden.email_clienta || '—'}</span>
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
                <ul className="flex max-w-xl flex-col gap-1">
                  {pedido.items.map((it, i) => {
                    const st = statsDe(it)
                    const reclamado = !!st && (st.pct_reclamo ?? 0) > 0 && st.problemas.length > 0
                    const nivel = reclamado ? nivelMotivo(st!.problemas[0].motivo) : 'leve'
                    return (
                      <li
                        key={i}
                        onMouseEnter={(e) => {
                          const r = e.currentTarget.getBoundingClientRect()
                          setPopProd({ top: r.bottom + 6, left: r.left, prod: st, titulo: it.producto_titulo || '—' })
                        }}
                        onMouseLeave={() => setPopProd(null)}
                        className="flex cursor-help items-center justify-between gap-3 -mx-1 rounded-md px-1 text-[13px] hover:bg-[var(--panel-2)]"
                      >
                        <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
                          <span
                            className="h-1.5 w-1.5 flex-none rounded-full"
                            style={{ background: reclamado ? NIVEL_DOT[nivel] : 'var(--line-2)' }}
                          />
                          <span className="text-[var(--ink-2)] [overflow-wrap:anywhere]">
                            {it.cantidad || 1}× {it.producto_titulo || '—'}
                          </span>
                          {st && (
                            <span
                              className="flex-none rounded-full px-1.5 py-px text-[10px] font-semibold tabular-nums"
                              style={
                                reclamado
                                  ? { background: 'color-mix(in srgb, ' + NIVEL_DOT[nivel] + ' 14%, transparent)', color: NIVEL_DOT[nivel] }
                                  : { background: 'var(--panel-2)', color: 'var(--ink-3)' }
                              }
                              title="% de pedidos de este producto que terminaron en reclamo de producto"
                            >
                              {st.pct_reclamo}%
                            </span>
                          )}
                        </span>
                        <span className="flex-none font-mono text-xs tabular-nums text-[var(--ink)]">
                          {fmtCLP((it.precio || 0) * (it.cantidad || 1))}
                        </span>
                      </li>
                    )
                  })}
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

                {/* Facts clave para decidir: fila label / valor */}
                <div className="mt-4 flex flex-col divide-y divide-[var(--line)] border-t border-[var(--line)] text-[13px]">
                  <div className="flex items-start justify-between gap-3 py-2">
                    <span className="flex-none pt-0.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-3)]">Qué pide</span>
                    <span className="text-right font-medium text-[var(--ink)]">{DESENLACE_LABEL[c.desenlace] || c.desenlace}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 py-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-3)]">Gravedad</span>
                    <span className="flex items-center gap-1.5 font-medium text-[var(--ink)]">
                      <span className="h-2 w-2 rounded-full" style={{ background: GRAVEDAD_COLOR(c.gravMax) }} />
                      {c.gravMax} · {GRAVEDAD_TXT[c.gravMax] || '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 py-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-3)]">Mensajes</span>
                    <span className="font-medium text-[var(--ink)]">{c.mensajes}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 py-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-3)]">Período</span>
                    <span className="font-mono text-[12px] tabular-nums text-[var(--ink-2)]">{fmtFechaCorta(c.desde)} → {fmtFechaCorta(c.hasta)}</span>
                  </div>
                </div>

                {/* Evolución mensaje por mensaje (colapsable, con scroll propio) */}
                <details className="mt-3 border-t border-[var(--line)] pt-3">
                  <summary className="cursor-pointer select-none text-[12px] font-medium text-[var(--accent)]">
                    Ver la evolución · {pedido.reclamos.length} mensajes clasificados
                  </summary>
                  <ol className="mt-2.5 flex max-h-[380px] flex-col gap-2 overflow-y-auto pr-1">
                    {[...pedido.reclamos]
                      .sort((a, b) => ((a.fecha || '') < (b.fecha || '') ? -1 : 1))
                      .map((r, i) => (
                        <li key={i} className="rounded-lg border border-[var(--line)] bg-[var(--panel-2)] p-2.5">
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 flex-none rounded-full" style={{ background: GRAVEDAD_COLOR(r.gravedad) }} />
                            <span className="text-[12.5px] font-medium text-[var(--ink)]">
                              {r.motivo ? MOTIVO_LABEL[r.motivo] || r.motivo : 'Sin motivo'}
                            </span>
                            {r.resolucion && (
                              <span className="rounded-full bg-[var(--panel)] px-2 py-0.5 text-[10px] text-[var(--ink-2)]">{r.resolucion}</span>
                            )}
                          </div>
                          <div className="mt-0.5 pl-4 text-[10.5px] text-[var(--ink-3)]">{fmtFechaHora(r.fecha)}</div>
                          {r.resumen && <p className="mt-1 pl-4 text-[12px] leading-snug text-[var(--ink-2)]">{r.resumen}</p>}
                        </li>
                      ))}
                  </ol>
                </details>
              </div>
            )
          })()}
          </div>

          {/* Línea de tiempo unificada: envío + correos, del más reciente al más viejo */}
          <div className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 xl:h-full">
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
            ) : (() => {
              const tl = lineaTiempo(pedido)
              const carrierPorTrack = new Map<string, string>()
              for (const t of pedido.tracking) {
                const tn = (t.track_number || '').trim()
                if (tn && t.carrier && !carrierPorTrack.has(tn)) carrierPorTrack.set(tn, t.carrier)
              }
              const reenvio = tl.paquetes.length > 1
              return (
              <>
              {tl.paquetes.length > 0 && (
                <div
                  className="mb-3 flex-none rounded-lg border px-3 py-2"
                  style={reenvio ? { borderColor: 'color-mix(in srgb, var(--warn) 30%, transparent)', background: 'var(--warn-bg)' } : { borderColor: 'var(--line)', background: 'var(--panel-2)' }}
                >
                  <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide" style={{ color: reenvio ? 'var(--warn)' : 'var(--ink-3)' }}>
                    <Truck size={12} />
                    {reenvio ? `Pedido reenviado · ${tl.paquetes.length} paquetes` : 'Número de seguimiento'}
                  </div>
                  <ul className="flex flex-col gap-0.5">
                    {tl.paquetes.map((tn, idx) => (
                      <li key={tn} className="flex items-center gap-2 text-[12px]">
                        {reenvio && (
                          <span className="flex-none rounded bg-[var(--panel)] px-1.5 text-[10px] font-semibold text-[var(--ink-2)]">P{idx + 1}</span>
                        )}
                        <span className="font-mono tabular-nums text-[var(--ink)] [overflow-wrap:anywhere]">{tn}</span>
                        {carrierPorTrack.get(tn) && <span className="flex-none text-[var(--ink-3)]">· {carrierPorTrack.get(tn)}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <ol className="flex max-h-[70vh] min-h-0 flex-col overflow-y-auto pr-1 xl:max-h-none xl:flex-1">
                {tl.eventos.map((e, i, arr) => {
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
                            <div className="flex flex-wrap items-center gap-1.5 text-[12.5px] font-medium text-[var(--ink)]">
                              {e.paquete && (
                                <span className="rounded bg-[var(--panel-2)] px-1.5 py-px text-[10px] font-semibold text-[var(--ink-2)]">
                                  Paquete {e.paquete}
                                </span>
                              )}
                              {e.etapa ? ETAPA_LABEL[e.etapa] || e.etapa : 'Envío'}
                            </div>
                            {e.descripcion && <p className="mt-0.5 text-[11.5px] leading-snug text-[var(--ink-3)]">{e.descripcion}</p>}
                            <div className="mt-0.5 text-[10.5px] text-[var(--ink-3)]">{fmtFechaHora(e.fecha)}</div>
                          </>
                        ) : (
                          <div
                            className={`rounded-xl border p-3 ${
                              e.direccion === 'enviado' ? 'border-[var(--accent)]/20 bg-[var(--accent-soft)]' : 'border-[var(--line)] bg-[var(--panel-2)]'
                            }`}
                          >
                            <div className="mb-1.5">
                              <div className="text-[11px] font-semibold" style={{ color }}>
                                {e.direccion === 'enviado' ? 'SAC respondió' : 'Clienta'}
                              </div>
                              <div className="text-[10px] text-[var(--ink-3)]">{fmtFechaHora(e.fecha)}</div>
                            </div>
                            {e.asunto && <div className="mb-1 text-[11.5px] font-medium text-[var(--ink)]">{e.asunto}</div>}
                            <p className="whitespace-pre-wrap text-[12px] leading-relaxed text-[var(--ink-2)] [overflow-wrap:anywhere]">
                              {e.cuerpo}
                            </p>
                          </div>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ol>
              </>
              )
            })()}
          </div>
        </div>
      )}

      {popProd && (
        <div
          className="pointer-events-none fixed z-50 w-72 rounded-xl border border-[var(--line-2)] bg-[var(--panel)] p-3 shadow-xl"
          style={{ top: popProd.top, left: popProd.left }}
        >
          <div className="mb-1 truncate text-[12.5px] font-semibold text-[var(--ink)]" title={popProd.titulo}>
            {popProd.titulo}
          </div>
          {popProd.prod ? (
            <>
              <div className="mb-2 flex items-center gap-2 border-b border-[var(--line)] pb-1.5 text-[11px] text-[var(--ink-3)]">
                <span className="font-mono font-semibold tabular-nums text-[var(--ink-2)]">{popProd.prod.pct_reclamo}%</span>
                de reclamo · {popProd.prod.reclamos} de {popProd.prod.pedidos} pedidos
              </div>
              {popProd.prod.problemas.length > 0 ? (
                <>
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-3)]">
                    Reclamos · de más a menos grave
                  </div>
                  <ul className="flex flex-col gap-1.5">
                    {popProd.prod.problemas.map((q) => (
                      <li key={q.motivo} className="flex items-center gap-2 text-[12px]">
                        <span className="h-2 w-2 flex-none rounded-full" style={{ background: NIVEL_DOT[nivelMotivo(q.motivo)] }} />
                        <span className="flex-1 truncate text-[var(--ink-2)]">{MOTIVO_LABEL[q.motivo] || q.motivo}</span>
                        <span className="flex-none font-mono text-[11px] tabular-nums text-[var(--ink)]">{q.pct}%</span>
                        <span className="flex-none font-mono text-[10px] tabular-nums text-[var(--ink-3)]">({q.n})</span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="text-[12px] text-[var(--ink-3)]">
                  Sin reclamos de producto (tienda/proveedor) registrados. Los reclamos de este pedido, si los hay,
                  son de envío o gestión.
                </p>
              )}
            </>
          ) : (
            <p className="text-[12px] text-[var(--ink-3)]">Sin datos de este producto en el rango consultado.</p>
          )}
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
          {lista.length} pedidos
        </span>
        <span className="text-[11px] text-[var(--ink-3)]">· rango consultado: {rango} (por fecha del pedido)</span>
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
