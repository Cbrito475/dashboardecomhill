'use client'

import { useState, useTransition } from 'react'
import { CalendarCheck, Send, X, Loader2 } from 'lucide-react'
import { accionPreviewCierre, accionEnviarCierre } from '@/app/actions-cierre'
import { fmtDuracion, type CierreDia } from '@/lib/supabase/cierre'

// Cierre de día: el SAC revisa los indicadores en pantalla y recién ahí los manda al
// grupo. El texto del preview es el mismo que llega a Telegram (n8n solo lo reenvía).
export default function CierreDiaBoton() {
  const [abierto, setAbierto] = useState(false)
  const [datos, setDatos] = useState<CierreDia | null>(null)
  const [texto, setTexto] = useState('')
  const [error, setError] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [cargando, cargar] = useTransition()
  const [enviando, enviar] = useTransition()

  const abrir = () => {
    setAbierto(true)
    setError('')
    setEnviado(false)
    cargar(async () => {
      const r = await accionPreviewCierre()
      if (!r.ok) return setError(r.error || 'No se pudo calcular')
      setDatos(r.datos ?? null)
      setTexto(r.texto ?? '')
    })
  }

  const mandar = () => {
    enviar(async () => {
      const r = await accionEnviarCierre()
      if (!r.ok) return setError(r.error || 'No se pudo enviar')
      setError('')
      setEnviado(true)
    })
  }

  return (
    <>
      <button
        onClick={abrir}
        className="flex flex-none items-center gap-1.5 rounded-lg border border-[var(--line-2)] px-3 py-1.5 text-[12px] font-medium text-[var(--ink-2)] transition hover:border-[var(--accent)]/50 hover:text-[var(--accent)]"
      >
        <CalendarCheck size={14} /> Cerrar el día
      </button>

      {abierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setAbierto(false)}>
          <div
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-serif text-[20px] font-light text-[var(--ink)]">Cierre del día</h3>
              <button onClick={() => setAbierto(false)} className="text-[var(--ink-3)] transition hover:text-[var(--ink)]">
                <X size={18} />
              </button>
            </div>

            {cargando && (
              <p className="flex items-center gap-2 py-8 text-center text-[13px] text-[var(--ink-3)]">
                <Loader2 size={14} className="animate-spin" /> Calculando los indicadores…
              </p>
            )}

            {!cargando && datos && (
              <>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { l: 'Llegaron', n: datos.llegaron, c: 'var(--ink)' },
                    { l: 'Respondidos', n: datos.respondidos, c: 'var(--ok)' },
                    { l: 'Sin responder', n: datos.sin_responder_hoy, c: datos.sin_responder_hoy > 0 ? 'var(--warn)' : 'var(--ink)' },
                  ].map((k) => (
                    <div key={k.l} className="rounded-xl border border-[var(--line)] p-3 text-center">
                      <div className="font-serif text-[26px] font-light tabular-nums" style={{ color: k.c }}>
                        {k.n}
                      </div>
                      <div className="text-[11px] text-[var(--ink-3)]">{k.l}</div>
                    </div>
                  ))}
                </div>

                {datos.respuestas_medidas > 0 && (
                  <div className="mt-2 rounded-xl border border-[var(--line)] p-3">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--ink-3)]">
                        Tiempo de respuesta
                      </span>
                      <span className="text-[10px] text-[var(--ink-3)]">{datos.respuestas_medidas} medidas</span>
                    </div>
                    <div className="mt-1.5 flex items-end gap-5">
                      <div>
                        <div className="font-serif text-[22px] font-light leading-none tabular-nums text-[var(--ink)]">
                          {fmtDuracion(datos.respuesta_mediana_min)}
                        </div>
                        <div className="mt-0.5 text-[11px] text-[var(--ink-3)]">mediana</div>
                      </div>
                      <div>
                        <div className="font-serif text-[18px] font-light leading-none tabular-nums text-[var(--ink-2)]">
                          {fmtDuracion(datos.respuesta_prom_min)}
                        </div>
                        <div className="mt-0.5 text-[11px] text-[var(--ink-3)]">promedio</div>
                      </div>
                      <div>
                        <div className="font-serif text-[18px] font-light leading-none tabular-nums text-[var(--warn)]">
                          {fmtDuracion(datos.respuesta_max_min)}
                        </div>
                        <div className="mt-0.5 text-[11px] text-[var(--ink-3)]">la más lenta</div>
                      </div>
                    </div>
                    {datos.respuesta_prom_min != null &&
                      datos.respuesta_mediana_min != null &&
                      datos.respuesta_prom_min > datos.respuesta_mediana_min * 1.4 && (
                        <p className="mt-2 text-[11px] leading-relaxed text-[var(--ink-3)]">
                          El promedio está por encima de la mediana porque hoy se contestaron correos
                          atrasados. La mediana refleja mejor el ritmo del día.
                        </p>
                      )}
                  </div>
                )}

                <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--ink-3)]">
                  Así se va a ver en Telegram
                </p>
                <pre className="mt-1 max-h-56 overflow-y-auto whitespace-pre-wrap rounded-xl border border-[var(--line)] bg-[var(--panel-2)] p-3 font-sans text-[12px] leading-relaxed text-[var(--ink-2)]">
                  {texto.replace(/<\/?b>/g, '')}
                </pre>

                {datos.backlog_graves === 0 && datos.backlog_legales === 0 && datos.backlog_total > 0 && (
                  <p className="mt-2 rounded-lg border border-[var(--warn)]/40 bg-[var(--warn-bg)] p-2 text-[11px] leading-relaxed text-[var(--ink-2)]">
                    El desglose por gravedad da 0 porque hoy el clasificador está marcando todo como
                    &quot;otro / gravedad 1&quot;. Los conteos de arriba sí son correctos.
                  </p>
                )}
              </>
            )}

            {error && (
              <p className="mt-3 rounded-lg border border-[var(--crit)]/40 bg-[var(--crit-bg)] p-2 text-[12px] text-[var(--crit)]">{error}</p>
            )}
            {enviado && (
              <p className="mt-3 rounded-lg border border-[var(--ok)]/40 bg-[var(--ok-bg)] p-2 text-[12px] text-[var(--ok)]">
                Reporte enviado al grupo de Telegram.
              </p>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setAbierto(false)}
                className="rounded-lg border border-[var(--line-2)] px-3 py-2 text-[12px] font-medium text-[var(--ink-2)] transition hover:text-[var(--ink)]"
              >
                Cerrar
              </button>
              <button
                onClick={mandar}
                disabled={!datos || enviando || enviado}
                className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-2 text-[12px] font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
              >
                {enviando ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                {enviado ? 'Enviado' : 'Enviar a Telegram'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
