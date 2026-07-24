'use client'

import { useState, useTransition } from 'react'
import { Gavel, AlertTriangle, Loader2, Send, HandCoins, Save, Trophy, TrendingDown, Clock } from 'lucide-react'
import { fmtCLP } from '@/lib/format'
import {
  ESTADO_DISPUTA_LABEL,
  MOTIVO_DISPUTA_LABEL,
  diasRestantes,
  type Disputa,
  type DisputaBucket,
  type ResumenDisputas,
} from '@/lib/supabase/disputas'
import { accionGuardarEvidencia, accionEnviarEvidencia, accionAceptarDisputa } from '@/app/actions-disputas'

const BUCKETS: { key: DisputaBucket; label: string }[] = [
  { key: 'por_responder', label: 'Hay que responder' },
  { key: 'en_revision', label: 'En revisión' },
  { key: 'cerradas', label: 'Cerradas' },
]

const HINT: Record<DisputaBucket, string> = {
  por_responder: 'Disputas con plazo abierto. Si no se responden a tiempo, se pierden solas.',
  en_revision: 'Ya se mandó la evidencia y la pasarela está decidiendo.',
  cerradas: 'Historial de disputas resueltas. Solo lectura.',
}

const ABIERTA = (e: string) => e === 'needs_response' || e === 'under_review'

// Cómo terminó: es lo que hay que ver de un vistazo en una disputa cerrada.
function desenlace(estado: string): { txt: string; color: string; bg: string } {
  if (estado === 'won') return { txt: 'Ganada', color: 'var(--ok)', bg: 'var(--ok-bg)' }
  if (estado === 'lost') return { txt: 'Perdida', color: 'var(--crit)', bg: 'var(--crit-bg)' }
  if (estado === 'accepted') return { txt: 'Aceptada', color: 'var(--warn)', bg: 'var(--warn-bg)' }
  if (estado === 'under_review') return { txt: 'En revisión', color: 'var(--accent)', bg: 'var(--accent-soft)' }
  if (estado === 'needs_response') return { txt: 'Hay que responder', color: 'var(--crit)', bg: 'var(--crit-bg)' }
  return { txt: 'Cerrada', color: 'var(--ink-3)', bg: 'var(--panel-2)' }
}

function fmtFecha(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

// El contador de plazo solo tiene sentido si la disputa sigue abierta. En una cerrada,
// "venció hace 129 días" es ruido rojo que no dice nada.
function Plazo({ d }: { d: Disputa }) {
  if (!ABIERTA(d.estado)) return null
  const dias = diasRestantes(d.fecha_limite)
  if (dias === null) return <span className="text-[11px] text-[var(--ink-3)]">sin plazo</span>
  const color = dias <= 1 ? 'var(--crit)' : dias <= 3 ? 'var(--warn)' : 'var(--ink-2)'
  const texto = dias < 0 ? `venció hace ${Math.abs(dias)} d` : dias === 0 ? 'vence hoy' : `quedan ${dias} d`
  return (
    <span className="flex items-center gap-1 font-mono text-[11px] font-semibold tabular-nums" style={{ color }}>
      <Clock size={11} /> {texto}
    </span>
  )
}

function Insignia({ estado }: { estado: string }) {
  const d = desenlace(estado)
  return (
    <span
      className="flex-none rounded-full px-2 py-0.5 text-[10px] font-semibold"
      style={{ background: d.bg, color: d.color }}
    >
      {d.txt}
    </span>
  )
}

function Resumen({ r }: { r: ResumenDisputas }) {
  const tasa = r.cerradas > 0 ? Math.round((r.ganadas / r.cerradas) * 100) : null
  const tarjetas = [
    { l: 'En disputa ahora', v: fmtCLP(r.montoAbierto), sub: `${r.abiertas} sin resolver`, c: r.abiertas > 0 ? 'var(--crit)' : 'var(--ink-3)', Ico: Gavel },
    { l: 'Recuperado', v: fmtCLP(r.montoGanado), sub: `${r.ganadas} ganadas`, c: 'var(--ok)', Ico: Trophy },
    { l: 'Perdido', v: fmtCLP(r.montoPerdido), sub: `${r.perdidas} perdidas o aceptadas`, c: 'var(--crit)', Ico: TrendingDown },
  ]
  return (
    <div className="grid flex-none gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {tarjetas.map((t) => (
        <div key={t.l} className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4">
          <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--ink-3)]">
            <t.Ico size={12} /> {t.l}
          </span>
          <div className="mt-1 font-serif text-[26px] font-light leading-none tabular-nums" style={{ color: t.c }}>
            {t.v}
          </div>
          <span className="text-[11px] text-[var(--ink-3)]">{t.sub}</span>
        </div>
      ))}
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4">
        <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--ink-3)]">Se ganan</span>
        <div
          className="mt-1 font-serif text-[26px] font-light leading-none tabular-nums"
          style={{ color: tasa === null ? 'var(--ink-3)' : tasa >= 50 ? 'var(--ok)' : tasa >= 25 ? 'var(--warn)' : 'var(--crit)' }}
        >
          {tasa === null ? '—' : `${tasa}%`}
        </div>
        <span className="text-[11px] text-[var(--ink-3)]">
          {r.cerradas > 0 ? `${r.ganadas} de ${r.cerradas} resueltas` : 'sin disputas resueltas'}
        </span>
      </div>
    </div>
  )
}

function Detalle({ d, onCambio }: { d: Disputa; onCambio: () => void }) {
  const [texto, setTexto] = useState(d.evidencia_borrador || '')
  const [confirmar, setConfirmar] = useState<'enviar' | 'aceptar' | null>(null)
  const [error, setError] = useState('')
  const [pend, start] = useTransition()

  const abierta = ABIERTA(d.estado)
  const enCola = d.accion_estado === 'en_cola'
  const des = desenlace(d.estado)
  const evidenciaFinal = d.evidencia_enviada || d.evidencia_borrador

  const correr = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      const r = await fn()
      if (!r.ok) return setError(r.error || 'No se pudo')
      setError('')
      setConfirmar(null)
      onCambio()
    })

  return (
    <div className="flex flex-col gap-3">
      {/* Cabecera: el desenlace y la plata mandan */}
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5" style={{ borderLeft: `3px solid ${des.color}` }}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Insignia estado={d.estado} />
              <span className="text-[11px] uppercase tracking-[0.06em] text-[var(--ink-3)]">{d.pasarela}</span>
            </div>
            <div className="mt-1.5 font-serif text-[32px] font-light leading-none tabular-nums" style={{ color: des.color }}>
              {fmtCLP(d.monto || 0)}
            </div>
            <span className="text-[11px] text-[var(--ink-3)]">
              {d.estado === 'won' ? 'recuperados' : abierta ? 'en juego' : 'perdidos'}
            </span>
          </div>
          <Plazo d={d} />
        </div>

        <dl className="mt-4 grid gap-x-6 gap-y-3 border-t border-[var(--line)] pt-4 text-[12px] sm:grid-cols-3">
          <div>
            <dt className="text-[10px] uppercase tracking-wide text-[var(--ink-3)]">Qué alegó</dt>
            <dd className="mt-0.5 text-[var(--ink)]">{MOTIVO_DISPUTA_LABEL[d.motivo || ''] || d.motivo || '—'}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-wide text-[var(--ink-3)]">Pedido</dt>
            <dd className="mt-0.5 font-mono text-[var(--ink)]">
              {d.order_number ? `#${d.order_number}` : <span className="font-sans text-[var(--ink-3)]">sin vincular</span>}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-wide text-[var(--ink-3)]">Clienta</dt>
            <dd className="mt-0.5 truncate text-[var(--ink)]" title={d.email_clienta || ''}>
              {d.email_clienta || <span className="text-[var(--ink-3)]">no informada</span>}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-wide text-[var(--ink-3)]">Se abrió</dt>
            <dd className="mt-0.5 tabular-nums text-[var(--ink-2)]">{fmtFecha(d.fecha_apertura)}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-wide text-[var(--ink-3)]">Plazo para responder</dt>
            <dd className="mt-0.5 tabular-nums text-[var(--ink-2)]">{fmtFecha(d.fecha_limite)}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-wide text-[var(--ink-3)]">ID en la pasarela</dt>
            <dd className="mt-0.5 truncate font-mono text-[11px] text-[var(--ink-3)]" title={d.dispute_id}>
              {d.dispute_id}
            </dd>
          </div>
        </dl>
      </div>

      {/* Evidencia: editable solo si se puede accionar */}
      <div className="flex flex-col rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--ink-3)]">
          Evidencia para la pasarela
        </span>

        {!abierta ? (
          evidenciaFinal ? (
            <>
              <p className="mt-1 text-[11px] text-[var(--ink-3)]">Esto fue lo que se presentó.</p>
              <pre className="mt-2 max-h-72 overflow-y-auto whitespace-pre-wrap rounded-xl border border-[var(--line)] bg-[var(--panel-2)] p-3 font-sans text-[12.5px] leading-relaxed text-[var(--ink-2)]">
                {evidenciaFinal}
              </pre>
            </>
          ) : (
            <div className="mt-2 rounded-xl border border-dashed border-[var(--line-2)] p-5">
              <p className="text-[13px] text-[var(--ink-2)]">No se presentó evidencia.</p>
              <p className="mt-1 text-[11px] leading-relaxed text-[var(--ink-3)]">
                {d.estado === 'accepted'
                  ? 'La disputa se aceptó: se devolvió el dinero sin pelearla.'
                  : d.estado === 'lost'
                    ? 'La disputa se perdió sin que quedara evidencia registrada. Una disputa sin respuesta se pierde por defecto, aunque el pedido se haya entregado.'
                    : 'No quedó evidencia registrada para este caso.'}
              </p>
            </div>
          )
        ) : (
          <>
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              disabled={enCola}
              placeholder="La IA la redacta sola con el tracking, la conversación y los datos del pedido. Si todavía no aparece, podés escribirla acá."
              className="mt-2 min-h-[220px] resize-y rounded-xl border border-[var(--line-2)] bg-[var(--panel-2)] p-3 text-[13px] leading-relaxed text-[var(--ink)] outline-none focus:border-[var(--accent)] disabled:opacity-60"
            />

            {enCola && (
              <p className="mt-2 rounded-lg border border-[var(--warn)]/40 bg-[var(--warn-bg)] p-2 text-[11px] text-[var(--ink-2)]">
                Hay una acción en curso ({d.accion_pendiente}). Esperá a que la pasarela confirme.
              </p>
            )}
            {d.accion_error && (
              <p className="mt-2 rounded-lg border border-[var(--crit)]/40 bg-[var(--crit-bg)] p-2 text-[11px] text-[var(--crit)]">
                Falló la última acción: {d.accion_error}
              </p>
            )}
            {error && (
              <p className="mt-2 rounded-lg border border-[var(--crit)]/40 bg-[var(--crit-bg)] p-2 text-[11px] text-[var(--crit)]">{error}</p>
            )}

            {!enCola &&
              (confirmar === null ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => correr(() => accionGuardarEvidencia(d.id, texto))}
                    disabled={pend}
                    className="flex items-center gap-1.5 rounded-lg border border-[var(--line-2)] px-3 py-2 text-[12px] font-medium text-[var(--ink-2)] transition hover:text-[var(--ink)] disabled:opacity-50"
                  >
                    <Save size={14} /> Guardar
                  </button>
                  <button
                    onClick={() => setConfirmar('enviar')}
                    disabled={pend || !texto.trim()}
                    className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 py-2 text-[12px] font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
                  >
                    <Send size={14} /> Enviar evidencia
                  </button>
                  <button
                    onClick={() => setConfirmar('aceptar')}
                    disabled={pend}
                    className="flex items-center gap-1.5 rounded-lg border border-[var(--crit)]/40 px-3 py-2 text-[12px] font-medium text-[var(--crit)] transition hover:bg-[var(--crit-bg)] disabled:opacity-50"
                  >
                    <HandCoins size={14} /> Aceptar la disputa
                  </button>
                </div>
              ) : (
                <div className="mt-3 rounded-xl border border-[var(--crit)]/40 bg-[var(--crit-bg)] p-3">
                  <p className="flex items-start gap-2 text-[12px] leading-relaxed text-[var(--ink)]">
                    <AlertTriangle size={16} className="mt-0.5 flex-none text-[var(--crit)]" />
                    {confirmar === 'enviar' ? (
                      <span>
                        <b>Esto no se puede deshacer.</b> La evidencia se envía <b>una sola vez</b> a {d.pasarela}: si va
                        incompleta, no hay una segunda oportunidad de corregirla.
                      </span>
                    ) : (
                      <span>
                        <b>Esto no se puede deshacer.</b> Aceptar significa <b>renunciar a pelear</b>: se le devuelven{' '}
                        {fmtCLP(d.monto || 0)} a la clienta y la disputa se cierra en contra.
                      </span>
                    )}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => setConfirmar(null)}
                      className="rounded-lg border border-[var(--line-2)] bg-[var(--panel)] px-3 py-2 text-[12px] font-medium text-[var(--ink-2)]"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() =>
                        correr(() =>
                          confirmar === 'enviar' ? accionEnviarEvidencia(d.id, texto) : accionAceptarDisputa(d.id)
                        )
                      }
                      disabled={pend}
                      className="flex items-center gap-1.5 rounded-lg bg-[var(--crit)] px-3 py-2 text-[12px] font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                    >
                      {pend ? <Loader2 size={14} className="animate-spin" /> : null}
                      {confirmar === 'enviar' ? 'Sí, enviar la evidencia' : 'Sí, aceptar y devolver'}
                    </button>
                  </div>
                </div>
              ))}
          </>
        )}
      </div>
    </div>
  )
}

export default function SecDisputas({
  items,
  bucket,
  counts,
  resumen,
  onCambiarBucket,
  onRecargar,
}: {
  items: Disputa[]
  bucket: DisputaBucket
  counts: Record<DisputaBucket, number>
  resumen: ResumenDisputas
  onCambiarBucket: (b: DisputaBucket) => void
  onRecargar: () => void
}) {
  const [selId, setSelId] = useState<string | null>(null)
  const sel = items.find((i) => i.id === selId) ?? items[0] ?? null

  return (
    <div className="flex flex-col gap-4 xl:h-full">
      <div className="flex flex-none flex-wrap items-center gap-2">
        <Gavel size={18} className="text-[var(--crit)]" />
        <h2 className="font-serif text-[24px] font-light text-[var(--ink)]">Disputas</h2>
        <span className="flex-1" />
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

      <Resumen r={resumen} />

      <p className="flex-none text-[12px] text-[var(--ink-3)]">{HINT[bucket]}</p>

      <div className="grid gap-4 xl:min-h-0 xl:flex-1 lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="min-h-0 overflow-y-auto rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-2 xl:h-full">
          {items.length === 0 ? (
            <p className="p-8 text-center text-[13px] leading-relaxed text-[var(--ink-3)]">
              {bucket === 'por_responder'
                ? 'Ninguna disputa pendiente. Cuando entre una, llega aviso a Telegram y aparece acá.'
                : bucket === 'en_revision'
                  ? 'Nada esperando veredicto de la pasarela.'
                  : 'Todavía no hay disputas resueltas.'}
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {items.map((d) => {
                const des = desenlace(d.estado)
                const activo = sel?.id === d.id
                return (
                  <li key={d.id}>
                    <button
                      onClick={() => setSelId(d.id)}
                      className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${
                        activo
                          ? 'border-[var(--accent)]/40 bg-[var(--accent-soft)]'
                          : 'border-transparent hover:bg-[var(--panel-2)]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[13px] font-semibold tabular-nums" style={{ color: des.color }}>
                          {fmtCLP(d.monto || 0)}
                        </span>
                        {ABIERTA(d.estado) ? <Plazo d={d} /> : <Insignia estado={d.estado} />}
                      </div>
                      <div className="mt-1 truncate text-[12px] text-[var(--ink-2)]">
                        {MOTIVO_DISPUTA_LABEL[d.motivo || ''] || d.motivo || '—'}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-[10.5px] text-[var(--ink-3)]">
                        <span className="rounded-full bg-[var(--panel-2)] px-1.5 py-0.5">{d.pasarela}</span>
                        {d.order_number ? (
                          <span className="font-mono">#{d.order_number}</span>
                        ) : (
                          <span>sin pedido</span>
                        )}
                        <span className="ml-auto tabular-nums">{fmtFecha(d.fecha_apertura)}</span>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </aside>

        <div className="min-h-0 min-w-0 xl:h-full xl:overflow-y-auto">
          {sel ? (
            <Detalle key={sel.id} d={sel} onCambio={onRecargar} />
          ) : (
            <div className="rounded-2xl border border-dashed border-[var(--line-2)] bg-[var(--panel)] p-10 text-center text-[13px] text-[var(--ink-3)]">
              Elegí una disputa para ver el detalle y su evidencia.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
