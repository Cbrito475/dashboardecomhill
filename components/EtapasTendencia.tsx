'use client'

import { useState } from 'react'
import type { DashboardData } from '@/lib/supabase/queries'
import { agrupar } from '@/lib/format'

const ETAPA_LABEL: Record<string, string> = {
  origen: 'En origen (China)',
  aduana: 'Aduana / aeropuerto CL',
  ultima_milla: 'Última milla / regional',
  transito_nacional: 'En tránsito nacional',
  sin_dato: 'Sin dato de etapa',
}

const ETAPA_COLOR: Record<string, string> = {
  origen: 'var(--warn)',
  aduana: 'var(--crit)',
  ultima_milla: 'var(--ok)',
  transito_nacional: 'var(--ink-3)',
  sin_dato: 'var(--line-2)',
}

function fmtSemana(iso: string): string {
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}

// Diagnóstico de tendencia: ¿el pico es reciente (sigue) o viejo (ya pasó)?
function estadoTendencia(valores: number[]): { txt: string; color: string; bg: string } {
  const n = valores.length
  const peak = Math.max(...valores)
  if (peak === 0) return { txt: 'Sin varados', color: 'var(--ink-3)', bg: 'var(--panel-2)' }
  const peakIdx = valores.lastIndexOf(peak)
  const recientes = valores.slice(Math.max(0, n - 3))
  const maxReciente = Math.max(...recientes)
  if (peakIdx >= n - 3 && maxReciente >= peak * 0.6) return { txt: 'En alza', color: 'var(--crit)', bg: 'var(--crit-bg)' }
  if (maxReciente <= peak * 0.35) return { txt: 'Ya pasó', color: 'var(--ok)', bg: 'var(--ok-bg)' }
  return { txt: 'Estable', color: 'var(--ink-2)', bg: 'var(--panel-2)' }
}

const SW = 260
const SH = 52

function Sparkline({
  valores,
  color,
  activo,
  onHover,
}: {
  valores: number[]
  color: string
  activo: number
  onHover: (i: number | null) => void
}) {
  const n = valores.length
  const max = Math.max(...valores, 1)
  const px = (i: number) => (n === 1 ? SW / 2 : (i / (n - 1)) * SW)
  const py = (v: number) => SH - 3 - (v / max) * (SH - 8)
  const linea = valores.map((v, i) => `${i === 0 ? 'M' : 'L'} ${px(i).toFixed(1)} ${py(v).toFixed(1)}`).join(' ')
  const area = `${linea} L ${px(n - 1).toFixed(1)} ${SH} L ${px(0).toFixed(1)} ${SH} Z`
  const gid = `grad-${color.replace(/[^a-z]/gi, '')}`

  return (
    <svg viewBox={`0 0 ${SW} ${SH}`} className="w-full" style={{ height: SH }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.22} />
          <stop offset="100%" stopColor={color} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={linea} fill="none" stroke={color} strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <line x1={px(activo)} y1={0} x2={px(activo)} y2={SH} stroke="var(--line-2)" strokeWidth={1} strokeDasharray="2 2" vectorEffect="non-scaling-stroke" />
      <circle cx={px(activo)} cy={py(valores[activo])} r={3} fill="var(--panel)" stroke={color} strokeWidth={1.6} vectorEffect="non-scaling-stroke" />
      {valores.map((_, i) => (
        <rect key={i} x={px(i) - SW / n / 2} y={0} width={SW / n} height={SH} fill="transparent" onMouseEnter={() => onHover(i)} onMouseLeave={() => onHover(null)} />
      ))}
    </svg>
  )
}

export default function EtapasTendencia({ data }: { data: DashboardData['etapasTendencia'] }) {
  const [hover, setHover] = useState<number | null>(null)
  const { semanas, series } = data

  if (semanas.length < 2 || series.length === 0) {
    return (
      <p className="text-xs text-[var(--ink-3)]">
        Se necesita al menos dos semanas con pedidos no entregados para ver la tendencia.
      </p>
    )
  }

  const idx = hover != null ? hover : semanas.length - 1

  return (
    <div>
      <div className="mb-3 rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2 text-[11px] text-[var(--ink-2)]">
        Cada pedido se ubica por su <b>semana de creación</b> (fecha de compra) y su <b>último estado conocido</b> en
        ParcelPanel — no es la etapa en vivo ni el día en que cambió de etapa. Sirve para ver qué camadas de pedidos
        quedaron trabadas y dónde.
      </div>
      <p className="mb-3 text-[11px] text-[var(--ink-3)]">
        Cada etapa con su propia escala — la <b>forma</b> importa, no comparar alturas entre etapas. Pasá el cursor
        para ver una semana; la línea punteada marca <b>{hover != null ? `la semana del ${fmtSemana(semanas[idx])}` : 'la última semana del rango'}</b>.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {series.map((s) => {
          const est = estadoTendencia(s.valores)
          const color = ETAPA_COLOR[s.etapa] || 'var(--ink-3)'
          const peak = Math.max(...s.valores)
          const peakIdx = s.valores.lastIndexOf(peak)
          return (
            <div key={s.etapa} className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3">
              <div className="flex items-start justify-between gap-2">
                <span className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--ink-2)]">
                  <span className="h-2.5 w-2.5 flex-none rounded-sm" style={{ background: color }} />
                  {ETAPA_LABEL[s.etapa] || s.etapa}
                </span>
                <span
                  className="flex-none rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                  style={{ background: est.bg, color: est.color }}
                >
                  {est.txt}
                </span>
              </div>

              <div className="mt-1 flex items-end gap-1.5">
                <span className="font-serif text-[26px] font-light leading-none tabular-nums text-[var(--ink)]">
                  {agrupar(s.valores[idx])}
                </span>
                <span className="mb-0.5 text-[10px] text-[var(--ink-3)]">
                  varados · {hover != null ? fmtSemana(semanas[idx]) : 'última sem.'}
                </span>
              </div>

              <div className="mt-1.5">
                <Sparkline valores={s.valores} color={color} activo={idx} onHover={setHover} />
              </div>

              <div className="mt-1 text-[10px] text-[var(--ink-3)]">
                Pico <b className="text-[var(--ink-2)]">{agrupar(peak)}</b> la semana del {fmtSemana(semanas[peakIdx])}
              </div>
            </div>
          )
        })}
      </div>

      <p className="mt-3 text-[11px] text-[var(--ink-3)]">
        Rango: {fmtSemana(semanas[0])} → {fmtSemana(semanas[semanas.length - 1])}.{' '}
        <b className="text-[var(--crit)]">En alza</b> = el pico es de las últimas semanas (sigue caliente) ·{' '}
        <b className="text-[var(--ok)]">Ya pasó</b> = bajó fuerte desde el pico.
      </p>
    </div>
  )
}
