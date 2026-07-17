import type { DashboardData } from '@/lib/supabase/queries'
import { MOTIVO_LABEL } from '@/lib/supabase/queries'
import { fmtCLP, agrupar, fmtDec } from '@/lib/format'
import { Clock, PackageX, Truck, Inbox, Wallet } from 'lucide-react'
import { TituloSeccion, type Estado } from '@/components/Kpi'
import EnvioReclamo from '@/components/EnvioReclamo'

const ETAPA_LABEL: Record<string, string> = {
  origen: 'En origen (China)',
  transito_nacional: 'En tránsito nacional',
  aduana: 'Aduana / aeropuerto CL',
  ultima_milla: 'Última milla / regional',
  sin_dato: 'Sin dato de etapa',
}

export default function SecOperacion({ data }: { data: DashboardData }) {
  const k = data.kpis
  const est = (v: number, warn: number, crit: number): Estado => (v >= crit ? 'crit' : v >= warn ? 'warn' : 'ok')
  const etapas = [...data.etapas].sort((a, b) => b.n - a.n)
  const maxEtapa = Math.max(...etapas.map((e) => e.n), 1)
  const cola = data.cola
  const col = (e: Estado) => (e === 'crit' ? 'var(--crit)' : e === 'warn' ? 'var(--warn)' : e === 'ok' ? 'var(--ok)' : 'var(--ink-3)')

  // Intención: DIAGNÓSTICO — ¿dónde se traba el pedido y está sano o no? Filas de
  // medidor: cada indicador con su barra y el umbral marcado, no tarjetas sueltas.
  const meters: {
    Ico: typeof Clock
    label: string
    value: string
    unit?: string
    estado: Estado
    gauge?: number // 0..1 posición del valor
    umbral?: number // 0..1 posición del umbral crítico
    contexto: string
  }[] = [
    {
      Ico: PackageX,
      label: 'Envíos vencidos',
      value: k.pctExpired == null ? '—' : fmtDec(k.pctExpired),
      unit: k.pctExpired == null ? undefined : '%',
      estado: k.pctExpired == null ? 'neutral' : est(k.pctExpired, 3, 8),
      gauge: k.pctExpired == null ? undefined : Math.min(k.pctExpired / 12, 1),
      umbral: 8 / 12,
      contexto: 'umbral 8% · tracking murió',
    },
    {
      Ico: Truck,
      label: 'Días en tránsito',
      value: k.mediana == null ? '—' : agrupar(k.mediana),
      unit: k.mediana == null ? undefined : ' días',
      estado: k.mediana == null ? 'neutral' : est(k.mediana, 20, 30),
      gauge: k.mediana == null ? undefined : Math.min(k.mediana / 45, 1),
      umbral: 30 / 45,
      contexto: 'umbral 30 días',
    },
    {
      Ico: Clock,
      label: 'Días hasta el reclamo',
      value: k.diasHastaReclamo == null ? '—' : agrupar(k.diasHastaReclamo),
      unit: k.diasHastaReclamo == null ? undefined : ' días',
      estado: 'neutral',
      contexto: 'mediana pedido → 1er reclamo',
    },
    {
      Ico: Inbox,
      label: 'Casos abiertos',
      value: agrupar(k.ticketsAbiertos),
      estado: k.ticketsAbiertos > 0 ? 'warn' : 'ok',
      contexto: 'reclamos sin cerrar',
    },
    {
      Ico: Wallet,
      label: 'Reembolsos por pagar',
      value: fmtCLP(data.reembolso.montoFalta),
      estado: data.reembolso.montoFalta > 0 ? 'crit' : 'ok',
      contexto: `${agrupar(data.reembolso.solicitados - data.reembolso.solicitadosCumplidos)} solicitudes pendientes`,
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <TituloSeccion hint="dónde se traban los pedidos">Estado operativo del envío</TituloSeccion>
        <div className="divide-y divide-[var(--line)] overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--panel)]">
          {meters.map((m) => (
            <div key={m.label} className="flex items-center gap-4 px-5 py-3.5">
              <m.Ico size={16} strokeWidth={1.9} style={{ color: col(m.estado) }} className="flex-none" />
              <span className="w-40 flex-none text-[13px] text-[var(--ink-2)]">{m.label}</span>
              <div className="hidden flex-1 sm:block">
                {m.gauge != null ? (
                  <div className="relative h-1.5 overflow-hidden rounded-full bg-[var(--line)]">
                    <span className="block h-full rounded-full" style={{ width: `${m.gauge * 100}%`, background: col(m.estado) }} />
                    {m.umbral != null && (
                      <span className="absolute inset-y-0 w-px bg-[var(--ink-3)]" style={{ left: `${m.umbral * 100}%` }} />
                    )}
                  </div>
                ) : null}
              </div>
              <span className="w-24 flex-none text-right font-serif text-[19px] font-light tabular-nums" style={{ color: m.estado === 'neutral' || m.estado === 'ok' ? 'var(--ink)' : col(m.estado) }}>
                {m.value}
                {m.unit && <span className="text-[12px] text-[var(--ink-3)]">{m.unit}</span>}
              </span>
              <span className="hidden w-40 flex-none text-right text-[11px] text-[var(--ink-3)] md:block">{m.contexto}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Envío × reclamo */}
      <div>
        <TituloSeccion hint="¿el problema es la logística?">Envío × reclamo</TituloSeccion>
        <EnvioReclamo filas={data.envio} cobertura={data.coberturaEnvio} totalPedidos={data.resumen.totalPedidos} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Etapa del tracking */}
        <div>
          <TituloSeccion hint="pedidos no entregados">En qué etapa están</TituloSeccion>
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
            {etapas.length === 0 ? (
              <p className="text-xs text-[var(--ink-3)]">Sin datos de etapa en este período.</p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {etapas.map((e) => (
                  <div key={e.etapa} className="flex items-center gap-3 text-[13px]">
                    <span className="w-44 flex-none text-[var(--ink-2)]">{ETAPA_LABEL[e.etapa] || e.etapa}</span>
                    <span className="h-3.5 flex-1 overflow-hidden rounded-full bg-[var(--line)]">
                      <span
                        className="block h-full rounded-full bg-[var(--warn)]"
                        style={{ width: `${(e.n / maxEtapa) * 100}%` }}
                      />
                    </span>
                    <span className="w-20 flex-none text-right font-mono text-xs tabular-nums text-[var(--ink)]">
                      {agrupar(e.n)} <span className="text-[10px] text-[var(--ink-3)]">{e.pct}%</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Cola priorizada de casos abiertos */}
        <div>
          <TituloSeccion hint="atender primero los de arriba">Cola de casos abiertos</TituloSeccion>
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-3">
            {cola.length === 0 ? (
              <p className="p-2 text-xs text-[var(--ink-3)]">No hay casos abiertos en este período.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-[var(--line)]">
                {cola.slice(0, 8).map((c, i) => (
                  <li key={i} className="-mx-2 flex items-center gap-3 rounded px-2 py-2 text-[13px] transition hover:bg-[var(--panel-2)]">
                    <span
                      className="h-6 w-1 flex-none rounded-full"
                      style={{ background: (c.gravedad || 0) >= 4 ? 'var(--crit)' : (c.gravedad || 0) >= 3 ? 'var(--warn)' : 'var(--ink-3)' }}
                    />
                    <span className="w-16 flex-none font-mono text-xs text-[var(--ink-3)]">
                      {c.order_number ? `#${c.order_number}` : 's/nº'}
                    </span>
                    <span className="flex-1 truncate text-[var(--ink-2)]" title={c.resumen || ''}>
                      {c.resumen || MOTIVO_LABEL[c.motivo || ''] || 'Sin resumen'}
                    </span>
                    <span className="flex-none rounded px-1.5 py-0.5 text-[10px] font-semibold text-[var(--ink-2)] ring-1 ring-[var(--line-2)]">
                      G{c.gravedad || 1}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
