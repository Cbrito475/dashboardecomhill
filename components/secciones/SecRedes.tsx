'use client'

import { useState } from 'react'
import { Bot, Clock, Copy, EyeOff, Lock, MessageCircle, MessagesSquare, Save, Send, XCircle, AlertTriangle, CheckCircle2, Zap, Undo2 } from 'lucide-react'

// ============================================================================
// MAQUETA — Redes (Facebook + Instagram) con DATOS DE EJEMPLO.
// Modelo AUTOMÁTICO (decisión del usuario, distinto del correo):
//   negativo -> ocultar · estafa -> ocultar + DM pidiendo nº de pedido ·
//   consulta producto/envío -> "te respondemos por privado" + respuesta por DM ·
//   dudoso o con pedido -> queda acá para un humano.
// Cuando exista la credencial "Meta - Lorentina" en n8n, se conecta a datos reales.
// ============================================================================

type AccionBot = { hace: string; que: string }

type CasoRed = {
  id: string
  plataforma: 'facebook' | 'instagram'
  tipo: 'comentario' | 'dm'
  autor: string
  hace: string
  texto: string
  contexto?: string
  motivo: string
  gravedad: 1 | 2 | 3 | 4
  pedido?: string
  ventana?: string
  vencido?: boolean
  borrador?: string
  // Casos que el bot ya resolvió solo (según las reglas automáticas)
  auto?: 'oculto' | 'oculto_dm' | 'respondido_privado'
  accionesBot?: AccionBot[]
}

const EJEMPLOS: CasoRed[] = [
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
    id: 'auto-estafa',
    plataforma: 'facebook',
    tipo: 'comentario',
    autor: 'Marcela V.',
    hace: 'hace 2 h',
    texto: 'ESTAFADORES!! compré hace un mes y no llega nada, esto es una ESTAFA no compren aquí 😡😡',
    contexto: '"Nueva colección otoño 🍂" · publicado 27/07',
    motivo: 'insatisfaccion_estafa',
    gravedad: 3,
    auto: 'oculto_dm',
    accionesBot: [
      { hace: 'hace 2 h', que: 'Comentario OCULTADO automáticamente (regla: acusación de estafa). Solo ella y sus amigos lo ven.' },
      { hace: 'hace 2 h', que: 'DM privado enviado: "Hola Marcela, vimos tu comentario y queremos resolverlo ya mismo. ¿Nos compartes tu número de pedido (#) para revisar qué pasó con tu compra?"' },
      { hace: 'hace 2 h', que: 'Caso escalado: si responde con su nº de pedido, entra a esta bandeja vinculado al pedido.' },
    ],
  },
  {
    id: 'auto-envio',
    plataforma: 'instagram',
    tipo: 'comentario',
    autor: 'cata.munozr',
    hace: 'hace 3 h',
    texto: '¿Hacen envíos a Valdivia? ¿Cuánto demoran? 🙏',
    contexto: '"Vestido Amalfi de nuevo en stock ✨" (reel) · publicado 27/07',
    motivo: 'consulta_producto',
    gravedad: 1,
    auto: 'respondido_privado',
    accionesBot: [
      { hace: 'hace 3 h', que: 'Respuesta pública automática: "Hola Cata! Te respondemos por privado 💬 — Equipo Lorentina"' },
      { hace: 'hace 3 h', que: 'DM privado enviado: "Hola Cata! Sí, hacemos envíos a todo Chile, Valdivia incluida 🙌 Demoran entre 5 y 12 días hábiles. Cualquier duda nos escribes!"' },
    ],
  },
  {
    id: 'auto-neg',
    plataforma: 'instagram',
    tipo: 'comentario',
    autor: 'jose_m.diaz',
    hace: 'hace 5 h',
    texto: 'Qué ropa más fea jajaja quién compra esto',
    contexto: '"Nueva colección otoño 🍂 ya disponible" (reel) · publicado 27/07',
    motivo: 'otro',
    gravedad: 1,
    auto: 'oculto',
    accionesBot: [
      { hace: 'hace 5 h', que: 'Comentario OCULTADO automáticamente (regla: comentario negativo/burla, sin reclamo real). No se le respondió.' },
    ],
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
]

const GRAVEDAD_TXT: Record<number, string> = { 1: 'Consulta', 2: 'Reclamo', 3: 'Enojada', 4: 'Legal' }
const AUTO_TXT: Record<NonNullable<CasoRed['auto']>, string> = {
  oculto: 'Oculto por el bot',
  oculto_dm: 'Oculto + DM enviado',
  respondido_privado: 'Respondido en privado',
}

// Reglas automáticas (en el sistema real, editables y apagables desde Config)
const REGLAS = [
  { icono: EyeOff, texto: 'Comentario negativo o burla → ocultar', tono: 'var(--warn)' },
  { icono: AlertTriangle, texto: 'Acusación de estafa → ocultar + DM pidiendo nº de pedido', tono: 'var(--crit)' },
  { icono: Lock, texto: 'Consulta de producto o envío → "te respondemos por privado" + respuesta por DM', tono: 'var(--accent)' },
  { icono: MessageCircle, texto: 'Dudoso o con pedido de por medio → queda acá para un humano', tono: 'var(--ink-3)' },
]

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
  const [filtro, setFiltro] = useState<'todos' | 'pendientes' | 'auto' | 'facebook' | 'instagram'>('todos')
  const [selId, setSelId] = useState<string>('fb-com')
  const [msg, setMsg] = useState<string | null>(null)
  const [modoResp, setModoResp] = useState<'publico' | 'privado'>('publico')
  const [verReglas, setVerReglas] = useState(false)

  const items = EJEMPLOS.filter((c) => {
    if (filtro === 'todos') return true
    if (filtro === 'pendientes') return !c.auto
    if (filtro === 'auto') return !!c.auto
    return c.plataforma === filtro
  })
  const sel = EJEMPLOS.find((c) => c.id === selId) ?? null
  const vencidos = EJEMPLOS.filter((c) => c.vencido).length
  const autos = EJEMPLOS.filter((c) => c.auto).length

  const demo = () => setMsg('Maqueta: esta acción se conecta cuando esté la credencial de Meta en n8n.')

  const FILTROS: { key: typeof filtro; label: string; n?: number }[] = [
    { key: 'todos', label: 'Todos', n: EJEMPLOS.length },
    { key: 'pendientes', label: 'Para humano', n: EJEMPLOS.filter((c) => !c.auto).length },
    { key: 'auto', label: 'Resueltos por el bot', n: autos },
    { key: 'facebook', label: 'Facebook' },
    { key: 'instagram', label: 'Instagram' },
  ]

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <p className="rounded-lg border border-[var(--warn)]/40 bg-[var(--warn-bg)] px-3 py-1.5 text-[12px] font-semibold text-[var(--warn)]">
          MAQUETA con datos de ejemplo — se conecta a Facebook/Instagram con la credencial de Meta
        </p>
        <button
          onClick={() => setVerReglas((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg border border-[var(--line-2)] bg-[var(--panel)] px-3 py-1.5 text-[12px] font-bold text-[var(--ink-2)] transition hover:bg-[var(--panel-2)]"
        >
          <Zap size={14} className="text-[var(--accent)]" /> Reglas automáticas · 3 activas
        </button>
        {vencidos > 0 && (
          <span className="ml-auto flex items-center gap-1.5 rounded-lg border border-[var(--crit)]/30 bg-[var(--crit-bg)] px-3 py-1.5 text-[12px] font-bold text-[var(--crit)]">
            <AlertTriangle size={14} /> {vencidos} DM vencido — responder desde la app
          </span>
        )}
      </div>

      {verReglas && (
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] px-4 py-3">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[var(--ink-3)]">
            El bot actúa solo en estos casos (editable desde Config; cada acción queda auditada y avisada por Telegram)
          </p>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {REGLAS.map((r) => (
              <span key={r.texto} className="flex items-center gap-2 text-[12.5px] text-[var(--ink-2)]">
                <r.icono size={14} style={{ color: r.tono }} />
                {r.texto}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(320px,380px)_minmax(0,1fr)]">
        {/* ============ Cola ============ */}
        <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--panel)] lg:h-full">
          <div className="border-b border-[var(--line)] px-4 pb-3 pt-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--ink-3)]">Redes · {items.length} casos</p>
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
                  {f.n != null && <span className="ml-1 tabular-nums opacity-70">{f.n}</span>}
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
                  onClick={() => {
                    setSelId(c.id)
                    setModoResp('publico')
                    setMsg(null)
                  }}
                  className={`block w-full border-b border-[var(--line)] px-3.5 py-3 text-left transition hover:bg-[var(--panel-2)] ${
                    activo ? 'bg-[var(--accent-soft)]' : ''
                  } ${c.auto ? 'opacity-80' : ''}`}
                  style={{ borderLeft: `3px solid ${c.vencido ? 'var(--crit)' : c.auto ? 'var(--ok)' : c.gravedad >= 2 ? 'var(--warn)' : 'transparent'}` }}
                >
                  <span className="flex flex-wrap items-center gap-1.5">
                    <ChipRed plataforma={c.plataforma} />
                    {c.tipo === 'dm' && (
                      <span className="rounded-full border border-[var(--line-2)] bg-[var(--panel-2)] px-2 py-0.5 text-[10.5px] font-bold text-[var(--ink-2)]">DM</span>
                    )}
                    <span className="text-[13px] font-bold text-[var(--ink)]">{c.autor}</span>
                    {c.auto && (
                      <span className="flex items-center gap-1 rounded-full bg-[var(--ok-bg)] px-2 py-0.5 text-[10.5px] font-bold text-[var(--ok)]">
                        <Bot size={11} /> {AUTO_TXT[c.auto]}
                      </span>
                    )}
                    {c.vencido && (
                      <span className="rounded-full bg-[var(--crit-bg)] px-2 py-0.5 text-[10.5px] font-bold text-[var(--crit)]">Ventana vencida</span>
                    )}
                    {!c.vencido && !c.auto && c.gravedad >= 2 && (
                      <span className="rounded-full bg-[var(--warn-bg)] px-2 py-0.5 text-[10.5px] font-bold text-[var(--warn)]">{GRAVEDAD_TXT[c.gravedad]}</span>
                    )}
                    <span className="ml-auto whitespace-nowrap text-[11px] text-[var(--ink-3)]">{c.hace}</span>
                  </span>
                  <span className="mt-1 block truncate text-[12.5px] text-[var(--ink-3)]">{c.texto}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* ============ Detalle ============ */}
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

              {/* ---- Caso resuelto por el bot: registro de lo que hizo ---- */}
              {sel.auto && sel.accionesBot && (
                <div className="rounded-2xl border border-[var(--line)] p-4" style={{ borderLeft: '3px solid var(--ok)' }}>
                  <p className="mb-2.5 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-[var(--ink-3)]">
                    <Bot size={14} className="text-[var(--ok)]" /> Lo resolvió el bot · {AUTO_TXT[sel.auto]}
                  </p>
                  <ul className="space-y-2">
                    {sel.accionesBot.map((a, i) => (
                      <li key={i} className="flex gap-2.5 text-[13px] text-[var(--ink-2)]">
                        <CheckCircle2 size={15} className="mt-0.5 flex-none text-[var(--ok)]" />
                        <span>
                          {a.que} <span className="text-[11px] text-[var(--ink-3)]">· {a.hace}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(sel.auto === 'oculto' || sel.auto === 'oculto_dm') && (
                      <button onClick={demo} className="flex items-center gap-1.5 rounded-lg border border-[var(--line-2)] px-3.5 py-2 text-[13px] font-semibold text-[var(--ink-2)] transition hover:bg-[var(--panel-2)]">
                        <Undo2 size={15} /> Deshacer ocultar
                      </button>
                    )}
                    <button onClick={demo} className="flex items-center gap-1.5 rounded-lg border border-[var(--line-2)] px-3.5 py-2 text-[13px] font-medium text-[var(--ink-3)] transition hover:bg-[var(--panel-2)]">
                      <MessagesSquare size={15} /> Tomar el caso yo
                    </button>
                  </div>
                  <p className="mt-2 text-[12px] text-[var(--ink-3)]">
                    Cada acción del bot queda en la auditoría y se avisa por Telegram. Si la clienta responde el DM, el caso vuelve a "Para humano".
                  </p>
                  {msg && <p className="mt-2 text-[12px] font-semibold text-[var(--warn)]">{msg}</p>}
                </div>
              )}

              {/* ---- Casos para humano: mismo flujo de aprobación de siempre ---- */}
              {!sel.auto && (
                <>
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
                    {sel.tipo === 'comentario' && !sel.vencido && (
                      <div className="mb-2.5 flex flex-wrap gap-1.5">
                        <button
                          onClick={() => setModoResp('publico')}
                          className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-semibold transition ${
                            modoResp === 'publico'
                              ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                              : 'border-[var(--line-2)] bg-[var(--panel-2)] text-[var(--ink-2)] hover:text-[var(--ink)]'
                          }`}
                        >
                          <MessagesSquare size={13} /> Responder público
                        </button>
                        <button
                          onClick={() => setModoResp('privado')}
                          className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-semibold transition ${
                            modoResp === 'privado'
                              ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                              : 'border-[var(--line-2)] bg-[var(--panel-2)] text-[var(--ink-2)] hover:text-[var(--ink)]'
                          }`}
                        >
                          <Lock size={13} /> DM privado a {sel.autor}
                        </button>
                      </div>
                    )}
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
                            {sel.tipo === 'comentario' && modoResp === 'privado' ? <Lock size={15} /> : <Send size={15} />}
                            {sel.tipo === 'comentario' && modoResp === 'privado' ? 'Aprobar y enviar DM privado' : 'Aprobar y responder'}
                          </button>
                          <button onClick={demo} className="flex items-center gap-1.5 rounded-lg border border-[var(--line-2)] px-3.5 py-2 text-[13px] font-medium text-[var(--ink-2)] transition hover:bg-[var(--panel-2)]">
                            <Save size={15} /> Guardar
                          </button>
                          {sel.tipo === 'comentario' && (
                            <button onClick={demo} className="flex items-center gap-1.5 rounded-lg border border-[var(--line-2)] px-3.5 py-2 text-[13px] font-medium text-[var(--ink-3)] transition hover:bg-[var(--panel-2)]">
                              <EyeOff size={15} /> Ocultar comentario
                            </button>
                          )}
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
                        : modoResp === 'privado'
                          ? 'El DM privado a quien comentó se puede enviar UNA vez por comentario, dentro de los 7 días (regla de Meta). Ideal para datos del pedido que no van en público.'
                          : 'Este caso quedó para humano porque hay un pedido de por medio. Lo claro lo resuelve el bot solo (ver Reglas automáticas).'}
                    </p>
                    {msg && <p className="mt-2 text-[12px] font-semibold text-[var(--warn)]">{msg}</p>}
                  </div>
                </>
              )}
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
