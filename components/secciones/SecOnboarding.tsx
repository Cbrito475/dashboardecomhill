'use client'

// ============================================================================
// Onboarding de una tienda no conectada (H3): contratar servicios y
// aprovisionar sus workflows desde plantillas. Solo lo ve supervisor+.
// ============================================================================

import { useEffect, useState, useTransition } from 'react'
import { PlugZap, CheckCircle2, Circle, Workflow, KeyRound, AlertTriangle } from 'lucide-react'
import type { TiendaSelector } from '@/lib/supabase/tiendas'
import { accionOnboardingInfo, accionAprovisionar, accionContratarServicio, type InfoOnboarding, type ServicioOnboarding } from '@/app/actions-onboarding'

const ESTADO_SERVICIO: Record<string, { label: string; color: string }> = {
  pendiente: { label: 'Contratado · pendiente', color: 'var(--warn)' },
  aprovisionando: { label: 'Aprovisionado · falta prueba', color: 'var(--warn)' },
  activo: { label: 'Activo', color: 'var(--ok)' },
  pausado: { label: 'Pausado', color: 'var(--ink-3)' },
}

function TarjetaServicio({
  s,
  tienda,
  onHecho,
}: {
  s: ServicioOnboarding
  tienda: TiendaSelector
  onHecho: () => void
}) {
  const [abierto, setAbierto] = useState(false)
  const [valores, setValores] = useState<Record<string, string>>(() =>
    // Precarga: primero la credencial ya registrada para esta tienda, después
    // la compartida por defecto del slot.
    Object.fromEntries(s.slots.map((sl) => [sl.slot, s.credencialesActuales[sl.slot] ?? sl.defaultId ?? '']))
  )
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const est = s.contratado ? ESTADO_SERVICIO[s.contratado] : null

  const aprovisionar = () => {
    setError(null)
    start(async () => {
      const r = await accionAprovisionar(tienda.id, s.clave, valores)
      if (!r.ok) setError(r.error ?? 'Falló el aprovisionamiento')
      else {
        setAbierto(false)
        onHecho()
      }
    })
  }
  const contratar = () => {
    setError(null)
    start(async () => {
      const r = await accionContratarServicio(tienda.id, s.clave)
      if (!r.ok) setError(r.error ?? 'No se pudo contratar')
      else onHecho()
    })
  }

  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
      <div className="flex items-start gap-3">
        {s.contratado ? (
          <CheckCircle2 size={18} className="mt-0.5 flex-none" style={{ color: est?.color }} strokeWidth={1.75} />
        ) : (
          <Circle size={18} className="mt-0.5 flex-none text-[var(--ink-3)]" strokeWidth={1.75} />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[14px] font-semibold text-[var(--ink)]">{s.nombre}</span>
            {est && (
              <span className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ color: est.color, background: 'var(--panel-2)' }}>
                {est.label}
              </span>
            )}
            {s.plantillas.length === 0 && (
              <span className="rounded-full border border-[var(--line-2)] px-2 py-0.5 text-[10px] text-[var(--ink-3)]">plantillas pendientes</span>
            )}
          </div>
          {s.descripcion && <p className="mt-0.5 text-[12px] leading-relaxed text-[var(--ink-3)]">{s.descripcion}</p>}

          {abierto && s.plantillas.length > 0 && (
            <div className="mt-3 space-y-3 rounded-lg border border-[var(--line)] bg-[var(--panel-2)] p-3">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--ink-3)]">
                <KeyRound size={13} /> Credenciales (ids de n8n — los secretos viven solo allá)
              </p>
              {s.slots.map((sl) => (
                <label key={sl.slot} className="block">
                  <span className="text-[12px] font-medium text-[var(--ink-2)]">{sl.nombre}</span>
                  <input
                    value={valores[sl.slot] ?? ''}
                    onChange={(e) => setValores((v) => ({ ...v, [sl.slot]: e.target.value }))}
                    placeholder="id de credencial en n8n"
                    className="mt-1 w-full rounded-md border border-[var(--line)] bg-[var(--panel)] px-2.5 py-1.5 font-mono text-[12px] text-[var(--ink)]"
                  />
                  <span className="mt-0.5 block text-[11px] text-[var(--ink-3)]">{sl.ayuda}</span>
                </label>
              ))}
              <p className="text-[11px] text-[var(--ink-3)]">
                Se van a crear {s.plantillas.length} workflow{s.plantillas.length > 1 ? 's' : ''} (
                {s.plantillas.map((p) => `${p.plantilla} ${p.version}`).join(', ')}) — nacen <b>desactivados</b> hasta la prueba controlada.
              </p>
              <button
                onClick={aprovisionar}
                disabled={pending}
                className="rounded-lg bg-[var(--accent)] px-4 py-2 text-[13px] font-semibold text-[var(--bg)] transition disabled:opacity-50"
              >
                {pending ? 'Aprovisionando…' : `Aprovisionar ${s.nombre}`}
              </button>
            </div>
          )}

          {error && (
            <p className="mt-2 flex items-start gap-1.5 text-[12px] text-[var(--crit)]">
              <AlertTriangle size={14} className="mt-0.5 flex-none" /> {error}
            </p>
          )}
        </div>
        <div className="flex-none">
          {s.plantillas.length > 0 ? (
            <button
              onClick={() => setAbierto((v) => !v)}
              className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-[12px] font-medium text-[var(--ink-2)] transition hover:bg-[var(--panel-2)] hover:text-[var(--ink)]"
            >
              {abierto ? 'Cerrar' : s.contratado === 'aprovisionando' || s.contratado === 'activo' ? 'Re-aprovisionar' : 'Conectar'}
            </button>
          ) : (
            !s.contratado && (
              <button
                onClick={contratar}
                disabled={pending}
                className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-[12px] font-medium text-[var(--ink-2)] transition hover:bg-[var(--panel-2)] hover:text-[var(--ink)] disabled:opacity-50"
              >
                Contratar
              </button>
            )
          )}
        </div>
      </div>
    </div>
  )
}

export default function SecOnboarding({ tienda }: { tienda: TiendaSelector }) {
  const [info, setInfo] = useState<InfoOnboarding | null>(null)
  const [, start] = useTransition()
  const cargar = () => {
    start(async () => {
      setInfo(await accionOnboardingInfo(tienda.id))
    })
  }
  useEffect(cargar, [tienda.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!info) return <div className="p-10 text-center text-[13px] text-[var(--ink-3)]">Cargando onboarding…</div>

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-6">
        <p className="flex items-center gap-2 text-[16px] font-semibold text-[var(--ink)]">
          <PlugZap size={20} className="text-[var(--accent)]" strokeWidth={1.75} />
          Conectar {tienda.nombre} · {tienda.empresa}
        </p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--ink-3)]">
          Elegí los servicios que va a tener esta tienda. Cada servicio dice qué credenciales necesita; los workflows se
          generan desde plantillas versionadas y <b>nacen desactivados</b> hasta su prueba controlada.
        </p>
        {!info.n8nListo && (
          <p className="mt-3 flex items-start gap-2 rounded-lg border border-[color-mix(in_srgb,var(--warn)_40%,transparent)] bg-[var(--panel-2)] p-3 text-[12px] leading-relaxed text-[var(--ink-2)]">
            <AlertTriangle size={15} className="mt-0.5 flex-none text-[var(--warn)]" />
            Falta conectar la API de n8n: definí <code className="font-mono">N8N_API_URL</code> y{' '}
            <code className="font-mono">N8N_API_KEY</code> en el entorno del servidor (la key se crea en n8n → Settings →
            n8n API). Sin eso se pueden contratar servicios pero no aprovisionar workflows.
          </p>
        )}
      </div>

      <div className="space-y-2.5">
        {info.servicios.map((s) => (
          <TarjetaServicio key={s.clave} s={s} tienda={tienda} onHecho={cargar} />
        ))}
      </div>

      {info.workflows.length > 0 && (
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-[var(--ink)]">
            <Workflow size={16} className="text-[var(--ink-3)]" /> Workflows de esta tienda
          </p>
          <div className="mt-2.5 space-y-1.5">
            {info.workflows.map((w) => (
              <div key={w.workflow_id} className="flex items-center gap-2 text-[12px]">
                <span
                  className="h-1.5 w-1.5 flex-none rounded-full"
                  style={{ background: w.estado === 'activo' ? 'var(--ok)' : w.estado === 'inactivo' ? 'var(--warn)' : 'var(--ink-3)' }}
                />
                <span className="min-w-0 flex-1 truncate text-[var(--ink-2)]" title={w.nombre ?? w.workflow_id}>
                  {w.nombre ?? `${w.plantilla} ${w.version}`}
                </span>
                <span className="flex-none font-mono text-[10px] text-[var(--ink-3)]">{w.plantilla} {w.version}</span>
                <span className="flex-none rounded-full bg-[var(--panel-2)] px-2 py-0.5 text-[10px] text-[var(--ink-3)]">{w.estado}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
