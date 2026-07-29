'use client'

import { useState } from 'react'
import { Bot, Clock, Copy, MessageCircle, Save, Send, XCircle, AlertTriangle, CheckCircle2 } from 'lucide-react'

// ============================================================================
// MAQUETA — Redes (Facebook + Instagram) con DATOS DE EJEMPLO.
// La bandeja de redes es SEPARADA de la de correos (decisión del usuario).
// Cuando exista la credencial "Meta - Lorentina" en n8n, esta sección se
// conecta a la tabla social_mensajes y los datos de ejemplo se reemplazan.
// ============================================================================

type CasoRed = {
  id: string
  plataforma: 'facebook' | 'instagram'
  tipo: 'comentario' | 'dm'
  autor: string
  hace: string
  texto: string
  contexto?: string // post/reel donde comentó
  motivo: string
  gravedad: 1 | 2 | 3 | 4
  pedido?: string // "#22901 · en aduana"
  ventana?: string // DMs: cuánto queda de la ventana de 24h
  vencido?: boolean
  borrador: string
}

const EJEMPLOS: CasoRed[] = [
  {
    id: 'dm-exp',
    plataforma: 'instagram',
    tipo: 'dm',
    autor: 'valen.mora__',
    hace: 'hace 26 h',
    texto: 'Hola!! compré la parka Milano y me llegó talla S en vez de L 😭 pedido #23188. ¿Cómo hago el cambio?',
    motivo: 'talla',
    gravedad: 2,
    pedido: '#23188 · entregado 26/07',
    vencido: true,
    borrador:
      'Hola Valen! Mil disculpas por el error de talla 🙏 Ya registramos el cambio de tu parka Milano (pedido #23188) de S a L. Te enviamos las instrucciones para el cambio sin costo. — Equipo Lorentina',
  },
  {
    id: 'fb-com',
    plataforma: 'facebook',
    tipo: 'comentario',
    autor: 'Carolina Espinoza',
    hace: 'hace 40 min',
    texto: 'Llevo 3 semanas esperando mi pedido #22901 y nadie contesta los correos. ¿Me pueden decir dónde está? Ya me está dando rabia 😤',
    contexto: '"🔥 Botas Liver Alta de ecocuero –30% solo esta semana" · publicado 26/07',
    motivo: 'consulta_estado',
    gravedad: 2,
    pedido: '#22901 · en aduana · SYCL014702518',
    borrador:
      'Hola Carolina! Lamentamos la demora 🙏 Revisamos tu pedido #22901: ya llegó a Chile y está en proceso de aduana (último registro: 27/07). Apenas salga pasa a reparto. ¡Gracias por tu paciencia! — Equipo Lorentina',
  },
  {
    id: 'ig-dm',
    plataforma: 'instagram',
    tipo: 'dm',
    autor: 'fran.riquelme',
    hace: 'hace 1 h',
    texto: 'Hola, el vestido Amalfi tiene talla XL? y hacen envío a Antofagasta?',
    motivo: 'consulta_producto',
    gravedad: 1,
    ventana: 'quedan 23 h',
    borrador:
      'Hola Fran! Sí 🙌 el vestido Amalfi está disponible en XL, y hacemos envíos a todo Chile, Antofagasta incluido (5 a 12 días hábiles). Cualquier duda nos escribes! — Equipo Lorentina',
  },
  {
    id: 'ig-com',
    plataforma: 'instagram',
    tipo: 'comentario',
    autor: 'pauli.sotov',
    hace: 'hace 3 h',
    texto: '¿El abrigo de la segunda foto viene en beige? 😍',
    contexto: '"Nueva colección otoño 🍂 ya disponible" (reel) · publicado 27/07',
    motivo: 'consulta_producto',
    gravedad: 1,
    borrador:
      'Hola Pauli! 😍 Sí, el abrigo Toscana viene en beige, camel y negro. Te dejamos el link en el perfil para que veas las tallas disponibles. — Equipo Lorentina',
  },
]

const GRAVEDAD_TXT: Record<number, string> = { 1: 'Consulta', 2: 'Reclamo', 3: 'Enojada', 4: 'Legal' }

function ChipRed({ plataforma }: { plataforma: CasoRed['plataforma'] }) {
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
  const [filtro, setFiltro] = useState<'todos' | 'facebook' | 'instagram' | 'comentario' | 'dm'>('todos')
  const [selId, setSelId] = useState<string>('fb-com')
  const [msg, setMsg] = useState<string | null>(null)

  const items = EJEMPLOS.filter((c) => {
    if (filtro === 'todos') return true
    if (filtro === 'facebook' || filtro === 'instagram') return c.plataforma === filtro
    return c.tipo === filtro
  })
  const sel = EJEMPLOS.find((c) => c.id === selId) ?? null
  const vencidos = EJEMPLOS.filter((c) => c.vencido).length

  const demo = () => setMsg('Maqueta: acá se conecta el envío real cuando esté la credencial de Meta en n8n.')

  const FILTROS: { key: typeof filtro; label: string }[] = [
    { key: 'todos', label: 'Todos' },
    { key: 'facebook', label: 'Facebook' },
    { key: 'instagram', label: 'Instagram' },
    { key: 'comentario', label: 'Comentarios' },
    { key: 'dm', label: 'DMs' },
  ]

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {/* Aviso de maqueta + contador de DMs vencidos */}
      <div className="flex flex-wrap items-center gap-3">
        <p className="rounded-lg border border-[var(--warn)]/40 bg-[var(--warn-bg)] px-3 py-1.5 text-[12px] font-semibold text-[var(--warn)]">
          MAQUETA con datos de ejemplo — se conecta a Facebook/Instagram cuando cargues la credencial de Meta en n8n
        </p>
        {vencidos > 0 && (
          <span className="ml-auto flex items-center gap-1.5 rounded-lg border border-[var(--crit)]/30 bg-[var(--crit-bg)] px-3 py-1.5 text-[12px] font-bold text-[var(--crit)]">
            <AlertTriangle size={14} /> {vencidos} DM vencido — responder desde la app
          </span>
        )}
      </div>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(320px,380px)_minmax(0,1fr)]">
        {/* ============ Cola de redes ============ */}
        <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--panel)] lg:h-full">
          <div className="border-b border-[var(--line)] px-4 pb-3 pt-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--ink-3)]">Redes · Por responder · {items.length}</p>
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
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {items.map((c) => {
              const activo = c.id === selId
              return (
                <button
                  key={c.id}
                  onClick={() => setSelId(c.id)}
                  className={`block w-full border-b border-[var(--line)] px-3.5 py-3 text-left transition hover:bg-[var(--panel-2)] ${
                    activo ? 'bg-[var(--accent-soft)]' : ''
                  }`}
                  style={{ borderLeft: `3px solid ${c.vencido ? 'var(--crit)' : c.gravedad >= 2 ? 'var(--warn)' : 'transparent'}` }}
                >
                  <span className="flex flex-wrap items-center gap-1.5">
                    <ChipRed plataforma={c.plataforma} />
                    {c.tipo === 'dm' && (
                      <span className="rounded-full border border-[var(--line-2)] bg-[var(--panel-2)] px-2 py-0.5 text-[10.5px] font-bold text-[var(--ink-2)]">DM</span>
                    )}
                    <span className="text-[13px] font-bold text-[var(--ink)]">{c.autor}</span>
                    {c.vencido && (
                      <span className="rounded-full bg-[var(--crit-bg)] px-2 py-0.5 text-[10.5px] font-bold text-[var(--crit)]">Ventana vencida</span>
                    )}
                    {!c.vencido && c.gravedad >= 2 && (
                      <span className="rounded-full bg-[var(--warn-bg)] px-2 py-0.5 text-[10.5px] font-bold text-[var(--warn)]">{GRAVEDAD_TXT[c.gravedad]}</span>
                    )}
                    <span className="ml-auto whitespace-nowrap text-[11px] text-[var(--ink-3)]">{c.hace}</span>
                  </span>
                  <span className="mt-1 block truncate text-[12.5px] text-[var(--ink-3)]">
                    {c.contexto ? `Comentario en ${c.contexto.split('·')[0].trim()}: ` : ''}
                    {c.texto}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* ============ Detalle del caso ============ */}
        <div className="min-h-0 min-w-0 lg:h-full lg:overflow-y-auto">
          {sel ? (
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
              <h2 className="text-[18px] font-bold text-[var(--ink)]">
                {sel.tipo === 'dm' ? 'Mensaje directo' : 'Comentario'} en {sel.plataforma === 'facebook' ? 'Facebook' : 'Instagram'}
              </h2>
              <p className="mb-4 text-[12.5px] text-[var(--ink-3)]">
                {sel.plataforma === 'facebook' ? 'Página Lorentina Chile' : '@lorentina.chile'} · {sel.hace}
                {sel.ventana && (
                  <span className="ml-2 font-semibold text-[var(--ok)]">
                    <Clock size={12} className="mr-0.5 inline" /> ventana de respuesta: {sel.ventana}
                  </span>
                )}
              </p>

              {sel.contexto && (
                <div className="mb-3 rounded-xl border border-[var(--line)] bg-[var(--panel-2)] px-3.5 py-2.5">
                  <p className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--ink-3)]">Post donde comentó</p>
                  <p className="mt-0.5 text-[13px] text-[var(--ink-2)]">{sel.contexto}</p>
                </div>
              )}

              <div
                className="mb-3 rounded-xl border border-[var(--line)] px-3.5 py-3"
                style={{ borderLeft: `3px solid ${sel.plataforma === 'facebook' ? '#1864d4' : '#c02a6c'}` }}
              >
                <p className="text-[13px] font-bold text-[var(--ink)]">
                  {sel.autor} <span className="ml-1 font-normal text-[var(--ink-3)]">{sel.hace}</span>
                </p>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-[var(--ink)]">{sel.texto}</p>
              </div>

              <div className="mb-4 flex flex-wrap gap-1.5">
                <span className="rounded-full border border-[var(--line-2)] bg-[var(--panel-2)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--ink-2)]">
                  Gravedad {sel.gravedad} · {GRAVEDAD_TXT[sel.gravedad]}
                </span>
                <span className="rounded-full bg-[var(--accent-soft)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--accent)]">{sel.motivo}</span>
                {sel.pedido ? (
                  <span className="rounded-full border border-[var(--line-2)] bg-[var(--panel-2)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--ink-2)]">
                    Pedido vinculado: {sel.pedido}
                  </span>
                ) : (
                  <span className="rounded-full border border-[var(--line-2)] bg-[var(--panel-2)] px-2.5 py-0.5 text-[11px] text-[var(--ink-3)]">Sin pedido</span>
                )}
              </div>

              {sel.vencido && (
                <div className="mb-3 rounded-xl border border-[var(--crit)]/30 bg-[var(--crit-bg)] px-3.5 py-3 text-[13px] font-semibold text-[var(--crit)]">
                  <AlertTriangle size={14} className="mr-1 inline" /> La ventana de 24 h de Meta venció: este DM ya no se puede responder desde el sistema.
                  <p className="mt-1 text-[12px] font-normal text-[var(--ink-2)]">
                    Respondelo desde la app de Instagram (ya se avisó por Telegram). El borrador queda listo para copiar.
                  </p>
                </div>
              )}

              <div className="rounded-2xl border border-[var(--line)] p-4" style={{ borderLeft: '3px solid var(--accent)' }}>
                <p className="mb-2 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-[var(--ink-3)]">
                  <Bot size={14} /> {sel.vencido ? 'Borrador listo para copiar' : 'Borrador del SAC'}
                  {!sel.vencido && (
                    <span className="rounded-full bg-[var(--warn-bg)] px-2.5 py-0.5 text-[11px] font-semibold normal-case tracking-normal text-[var(--warn)]">
                      Espera tu aprobación
                    </span>
                  )}
                </p>
                <textarea
                  defaultValue={sel.borrador}
                  rows={5}
                  className="w-full resize-none rounded-lg border border-[var(--line-2)] bg-[var(--panel-2)] px-3 py-2.5 text-[13px] leading-relaxed text-[var(--ink)] outline-none focus:border-[var(--accent)]"
                />
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {sel.vencido ? (
                    <>
                      <button onClick={demo} className="flex items-center gap-1.5 rounded-lg border border-[var(--line-2)] px-3.5 py-2 text-[13px] font-semibold text-[var(--ink-2)] transition hover:bg-[var(--panel-2)]">
                        <Copy size={15} /> Copiar borrador
                      </button>
                      <button onClick={demo} className="flex items-center gap-1.5 rounded-lg border border-[var(--line-2)] px-3.5 py-2 text-[13px] font-semibold text-[var(--ink-2)] transition hover:bg-[var(--panel-2)]">
                        <CheckCircle2 size={15} /> Marcar resuelto
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={demo} className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-2 text-[13px] font-semibold text-white transition hover:opacity-90">
                        <Send size={15} /> Aprobar y responder
                      </button>
                      <button onClick={demo} className="flex items-center gap-1.5 rounded-lg border border-[var(--line-2)] px-3.5 py-2 text-[13px] font-medium text-[var(--ink-2)] transition hover:bg-[var(--panel-2)]">
                        <Save size={15} /> Guardar
                      </button>
                      <button onClick={demo} className="flex items-center gap-1.5 rounded-lg border border-[var(--line-2)] px-3.5 py-2 text-[13px] font-medium text-[var(--ink-3)] transition hover:bg-[var(--panel-2)]">
                        <XCircle size={15} /> No responder
                      </button>
                    </>
                  )}
                </div>
                <p className="mt-2 text-[12px] text-[var(--ink-3)]">
                  {sel.tipo === 'dm'
                    ? sel.vencido
                      ? 'Los DMs solo se pueden responder por API dentro de las 24 h del último mensaje de la clienta.'
                      : 'Se envía como DM desde la cuenta de la tienda. Si la ventana de 24 h vence antes de aprobar, pasa a "DMs vencidos".'
                    : 'La respuesta se publica como Lorentina debajo del comentario. Modo solo-borrador: nada sale sin tu aprobación.'}
                </p>
                {msg && <p className="mt-2 text-[12px] font-semibold text-[var(--warn)]">{msg}</p>}
              </div>
            </div>
          ) : (
            <div className="grid h-full place-items-center rounded-2xl border border-dashed border-[var(--line-2)] bg-[var(--panel)] p-10 text-center">
              <div>
                <MessageCircle size={28} className="mx-auto mb-2 text-[var(--ink-3)]" strokeWidth={1.5} />
                <p className="text-[14px] font-medium text-[var(--ink-2)]">Elegí un caso de la cola</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
