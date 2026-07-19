'use client'

import { useState, useTransition } from 'react'
import { Settings, ShieldAlert } from 'lucide-react'
import { MOTIVO_LABEL } from '@/lib/supabase/queries'
import { accionGuardarConfig, accionGuardarPolitica } from '@/app/actions-sac'
import type { ConfigSac, PoliticaMotivo } from '@/lib/supabase/sac'

const AUTONOMIA_LABEL: Record<string, string> = {
  auto_enviar: 'La IA envía sola',
  solo_borrador: 'Solo borrador (humano aprueba)',
  solo_humano: 'Solo humano (sin IA)',
}

function useGuardar() {
  const [pending, start] = useTransition()
  const [ok, setOk] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const guardar = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      setErr(null)
      const r = await fn()
      if (!r.ok) return setErr(r.error || 'Error')
      setOk('guardado')
      setTimeout(() => setOk(null), 1500)
    })
  return { pending, ok, err, guardar }
}

function Campo({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="text-[12px] font-semibold text-[var(--ink)]">{label}</div>
      {hint && <div className="text-[11px] text-[var(--ink-3)]">{hint}</div>}
      <div className="mt-0.5">{children}</div>
    </div>
  )
}

const inputCls =
  'rounded-lg border border-[var(--line-2)] bg-[var(--panel-2)] px-2.5 py-1.5 text-[13px] text-[var(--ink)] outline-none focus:border-[var(--accent)]'

export default function SecConfig({ config, politicas }: { config: ConfigSac; politicas: PoliticaMotivo[] }) {
  const [cfg, setCfg] = useState<ConfigSac>(config)
  const [pols, setPols] = useState<PoliticaMotivo[]>(politicas)
  const g = useGuardar()

  const set = (clave: string, valor: string) => {
    setCfg((c) => ({ ...c, [clave]: valor }))
    g.guardar(() => accionGuardarConfig(clave, valor))
  }
  const setPol = (motivo: string, autonomia: string) => {
    setPols((p) => p.map((x) => (x.motivo === motivo ? { ...x, autonomia } : x)))
    const umbral = pols.find((x) => x.motivo === motivo)?.umbral_confianza ?? null
    g.guardar(() => accionGuardarPolitica(motivo, autonomia, umbral))
  }

  const modo = cfg.SAC_MODO_GLOBAL || 'solo_borrador'

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div className="flex items-center gap-2">
        <Settings size={18} className="text-[var(--accent)]" />
        <h2 className="font-serif text-[24px] font-light text-[var(--ink)]">Configuración del SAC</h2>
        {g.ok && <span className="text-[12px] text-[var(--ok)]">✓ {g.ok}</span>}
        {g.err && <span className="text-[12px] text-[var(--crit)]">{g.err}</span>}
      </div>

      {/* Modo global */}
      <section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
        <h3 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-[var(--ink-3)]">Modo global</h3>
        <div className="flex flex-wrap gap-2">
          {[
            { v: 'solo_borrador', t: 'Solo borrador', d: 'La IA nunca envía sola; todo lo aprueba un humano.' },
            { v: 'hibrido', t: 'Híbrido', d: 'La IA auto-envía lo que esté habilitado por motivo; el resto va a humano.' },
          ].map((o) => (
            <button
              key={o.v}
              onClick={() => set('SAC_MODO_GLOBAL', o.v)}
              className={`flex-1 rounded-xl border p-3 text-left transition ${
                modo === o.v ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-[var(--line-2)] hover:bg-[var(--panel-2)]'
              }`}
            >
              <div className="text-[13px] font-semibold text-[var(--ink)]">{o.t}</div>
              <div className="mt-0.5 text-[11.5px] text-[var(--ink-3)]">{o.d}</div>
            </button>
          ))}
        </div>
        {modo === 'hibrido' && (
          <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-[var(--warn-bg)] px-3 py-2 text-[12px] text-[var(--ink-2)]">
            <ShieldAlert size={14} className="text-[var(--warn)]" /> En híbrido, la IA puede enviar sola los motivos marcados “La IA envía sola”. Los casos legales nunca se auto-envían.
          </p>
        )}
      </section>

      {/* Parámetros */}
      <section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
        <h3 className="mb-4 text-[13px] font-semibold uppercase tracking-wide text-[var(--ink-3)]">Parámetros de envío</h3>
        <div className="grid gap-5 sm:grid-cols-2">
          <Campo label="Cadencia" hint="Cada cuánto procesa la IA los correos">
            <select value={cfg.SAC_CADENCIA_MODO || 'tiempo_real'} onChange={(e) => set('SAC_CADENCIA_MODO', e.target.value)} className={inputCls}>
              <option value="tiempo_real">Tiempo real (~1 min)</option>
              <option value="lote">En lotes</option>
              <option value="manual">Manual</option>
            </select>
          </Campo>
          <Campo label="Minutos entre lotes" hint="Solo aplica en modo lote">
            <input type="number" min={1} defaultValue={cfg.SAC_CADENCIA_LOTE_MIN || '15'} onBlur={(e) => set('SAC_CADENCIA_LOTE_MIN', e.target.value)} className={`${inputCls} w-24`} />
          </Campo>
          <Campo label="Horario de envío" hint="Fuera de esta franja, el envío queda en cola (hora de la tienda)">
            <div className="flex items-center gap-2">
              <input type="time" defaultValue={cfg.HORARIO_ENVIO_DESDE || '09:00'} onBlur={(e) => set('HORARIO_ENVIO_DESDE', e.target.value)} className={inputCls} />
              <span className="text-[var(--ink-3)]">a</span>
              <input type="time" defaultValue={cfg.HORARIO_ENVIO_HASTA || '21:00'} onBlur={(e) => set('HORARIO_ENVIO_HASTA', e.target.value)} className={inputCls} />
            </div>
          </Campo>
          <Campo label="Umbral de confianza para auto-envío" hint="0 a 1 — la IA solo auto-envía si supera este valor">
            <input type="number" min={0} max={1} step={0.05} defaultValue={cfg.SAC_UMBRAL_CONFIANZA || '0.80'} onBlur={(e) => set('SAC_UMBRAL_CONFIANZA', e.target.value)} className={`${inputCls} w-24`} />
          </Campo>
        </div>
      </section>

      {/* Autonomía por motivo */}
      <section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
        <h3 className="mb-1 text-[13px] font-semibold uppercase tracking-wide text-[var(--ink-3)]">Autonomía por tipo de reclamo</h3>
        <p className="mb-3 text-[11.5px] text-[var(--ink-3)]">
          Para cada motivo, elegí cuánto puede hacer la IA. En modo solo-borrador, todo va a humano igual; esto aplica cuando el modo global es híbrido.
        </p>
        <div className="overflow-hidden rounded-xl border border-[var(--line)]">
          {pols.map((p, i) => (
            <div key={p.motivo} className={`flex items-center justify-between gap-3 px-3 py-2 text-[13px] ${i % 2 ? 'bg-[var(--panel-2)]' : ''}`}>
              <span className="text-[var(--ink-2)]">{MOTIVO_LABEL[p.motivo] || p.motivo}</span>
              <select value={p.autonomia} onChange={(e) => setPol(p.motivo, e.target.value)} className={`${inputCls} py-1`}>
                {Object.entries(AUTONOMIA_LABEL).map(([v, t]) => (
                  <option key={v} value={v}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
