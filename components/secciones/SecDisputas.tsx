'use client'

import { useState, useTransition } from 'react'
import { Gavel, AlertTriangle, Loader2, Send, HandCoins, Save } from 'lucide-react'
import { fmtCLP } from '@/lib/format'
import {
  ESTADO_DISPUTA_LABEL,
  MOTIVO_DISPUTA_LABEL,
  diasRestantes,
  type Disputa,
  type DisputaBucket,
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
  cerradas: 'Ganadas, perdidas o aceptadas. Solo lectura.',
}

// Semáforo del plazo: lo que decide si esto es urgente o no.
function Plazo({ fecha }: { fecha: string | null }) {
  const d = diasRestantes(fecha)
  if (d === null) return <span className="text-[11px] text-[var(--ink-3)]">sin plazo</span>
  const color = d < 0 ? 'var(--crit)' : d <= 1 ? 'var(--crit)' : d <= 3 ? 'var(--warn)' : 'var(--ink-2)'
  const texto = d < 0 ? `venció hace ${Math.abs(d)} d` : d === 0 ? 'vence hoy' : `quedan ${d} d`
  return (
    <span className="font-mono text-[11px] font-semibold tabular-nums" style={{ color }}>
      {texto}
    </span>
  )
}

function Detalle({ d, onCambio }: { d: Disputa; onCambio: () => void }) {
  const [texto, setTexto] = useState(d.evidencia_borrador || '')
  const [confirmar, setConfirmar] = useState<'enviar' | 'aceptar' | null>(null)
  const [error, setError] = useState('')
  const [pend, start] = useTransition()

  const cerrada = !['needs_response', 'under_review'].includes(d.estado)
  const enCola = d.accion_estado === 'en_cola'

  const correr = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      const r = await fn()
      if (!r.ok) return setError(r.error || 'No se pudo')
      setError('')
      setConfirmar(null)
      onCambio()
    })

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--ink-3)]">
              {d.pasarela} · {ESTADO_DISPUTA_LABEL[d.estado] || d.estado}
            </span>
            <div className="font-serif text-[28px] font-light leading-none tabular-nums text-[var(--crit)]">
              {fmtCLP(d.monto || 0)}
            </div>
          </div>
          <Plazo fecha={d.fecha_limite} />
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[12px]">
          <div>
            <dt className="text-[10px] uppercase tracking-wide text-[var(--ink-3)]">Motivo</dt>
            <dd className="text-[var(--ink)]">{MOTIVO_DISPUTA_LABEL[d.motivo || ''] || d.motivo || '—'}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-wide text-[var(--ink-3)]">Pedido</dt>
            <dd className="font-mono text-[var(--ink)]">{d.order_number ? `#${d.order_number}` : 'sin vincular'}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-[10px] uppercase tracking-wide text-[var(--ink-3)]">Clienta</dt>
            <dd className="truncate text-[var(--ink)]">{d.email_clienta || '—'}</dd>
          </div>
        </dl>
      </div>

      <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--ink-3)]">
            Evidencia para la pasarela
          </span>
          {!d.evidencia_borrador && !cerrada && (
            <span className="text-[11px] text-[var(--ink-3)]">la IA aún no la redactó</span>
          )}
        </div>
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          disabled={cerrada || enCola}
          placeholder="Acá va la evidencia: seguimiento del envío, conversación con la clienta y datos del pedido."
          className="min-h-[180px] flex-1 resize-none rounded-xl border border-[var(--line-2)] bg-[var(--panel-2)] p-3 text-[13px] leading-relaxed text-[var(--ink)] outline-none focus:border-[var(--accent)] disabled:opacity-60"
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

        {!cerrada && !enCola && (
          <>
            {confirmar === null ? (
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
              // Confirmación explícita: estas dos acciones no se pueden deshacer.
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
            )}
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
  onCambiarBucket,
  onRecargar,
}: {
  items: Disputa[]
  bucket: DisputaBucket
  counts: Record<DisputaBucket, number>
  onCambiarBucket: (b: DisputaBucket) => void
  onRecargar: () => void
}) {
  const [selId, setSelId] = useState<string | null>(null)
  const sel = items.find((i) => i.id === selId) ?? items[0] ?? null

  return (
    <div className="flex flex-col gap-3 xl:h-full">
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
      <p className="flex-none text-[12px] text-[var(--ink-3)]">{HINT[bucket]}</p>

      <div className="grid gap-4 xl:min-h-0 xl:flex-1 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="min-h-0 overflow-y-auto rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-2 xl:h-full">
          {items.length === 0 ? (
            <p className="p-8 text-center text-[13px] text-[var(--ink-3)]">No hay disputas en este grupo.</p>
          ) : (
            <ul className="flex flex-col">
              {items.map((d) => (
                <li key={d.id}>
                  <button
                    onClick={() => setSelId(d.id)}
                    className={`w-full rounded-lg px-3 py-2.5 text-left transition ${
                      sel?.id === d.id ? 'bg-[var(--accent-soft)]' : 'hover:bg-[var(--panel-2)]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[12px] font-semibold tabular-nums text-[var(--crit)]">
                        {fmtCLP(d.monto || 0)}
                      </span>
                      <Plazo fecha={d.fecha_limite} />
                    </div>
                    <div className="mt-0.5 truncate text-[11.5px] text-[var(--ink-2)]">
                      {MOTIVO_DISPUTA_LABEL[d.motivo || ''] || d.motivo || '—'}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-[var(--ink-3)]">
                      <span className="rounded-full bg-[var(--panel-2)] px-1.5">{d.pasarela}</span>
                      {d.order_number ? <span className="font-mono">#{d.order_number}</span> : <span>sin pedido</span>}
                    </div>
                  </button>
                </li>
              ))}
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
