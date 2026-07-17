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

const W = 720
const H = 300
const padL = 44
const padR = 16
const padT = 16
const padB = 34

function fmtSemana(iso: string): string {
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
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

  const maxY = Math.max(...series.flatMap((s) => s.valores), 1)
  const nY = Math.ceil(maxY / 50) * 50 || 50
  const px = (i: number) => padL + (semanas.length === 1 ? 0 : (i / (semanas.length - 1)) * (W - padL - padR))
  const py = (v: number) => padT + (1 - v / nY) * (H - padT - padB)

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({ v: nY * f, y: py(nY * f) }))
  // etiquetas X: como máximo ~8, para no amontonar
  const paso = Math.max(1, Math.ceil(semanas.length / 8))
  const hi = hover != null ? hover : semanas.length - 1

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-[var(--ink-2)]">
        {series.map((s) => (
          <span key={s.etapa} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: ETAPA_COLOR[s.etapa] || 'var(--ink-3)' }} />
            {ETAPA_LABEL[s.etapa] || s.etapa}
          </span>
        ))}
      </div>

      <div className="relative w-full overflow-hidden">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 340 }} role="img" aria-label="Tendencia de pedidos no entregados por etapa">
          {yTicks.map((t) => (
            <g key={t.v}>
              <line x1={padL} y1={t.y} x2={W - padR} y2={t.y} stroke="var(--line)" strokeWidth={1} />
              <text x={padL - 6} y={t.y + 3} textAnchor="end" fontSize={9.5} fill="var(--ink-3)">
                {agrupar(Math.round(t.v))}
              </text>
            </g>
          ))}
          <text x={12} y={padT + 4} fontSize={9.5} fill="var(--ink-3)" transform={`rotate(-90 12 ${(padT + H - padB) / 2})`}>
            pedidos varados ↑
          </text>

          {/* etiquetas X */}
          {semanas.map((s, i) =>
            i % paso === 0 || i === semanas.length - 1 ? (
              <text key={s} x={px(i)} y={H - padB + 16} textAnchor="middle" fontSize={9} fill="var(--ink-3)">
                {i === semanas.length - 1 ? 'ahora' : fmtSemana(s)}
              </text>
            ) : null
          )}

          {/* guía vertical del hover */}
          <line x1={px(hi)} y1={padT} x2={px(hi)} y2={H - padB} stroke="var(--line-2)" strokeWidth={1} strokeDasharray="3 3" />

          {/* líneas por etapa */}
          {series.map((s) => {
            const d = s.valores.map((v, i) => `${i === 0 ? 'M' : 'L'} ${px(i)} ${py(v)}`).join(' ')
            return <path key={s.etapa} d={d} fill="none" stroke={ETAPA_COLOR[s.etapa] || 'var(--ink-3)'} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          })}

          {/* puntos en la semana activa */}
          {series.map((s) => (
            <circle key={s.etapa} cx={px(hi)} cy={py(s.valores[hi])} r={3.5} fill="var(--panel)" stroke={ETAPA_COLOR[s.etapa] || 'var(--ink-3)'} strokeWidth={2} />
          ))}

          {/* zonas de hover invisibles por semana */}
          {semanas.map((s, i) => (
            <rect
              key={s}
              x={px(i) - (W - padL - padR) / semanas.length / 2}
              y={padT}
              width={(W - padL - padR) / semanas.length}
              height={H - padT - padB}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            />
          ))}
        </svg>

        {/* tooltip */}
        <div
          className="pointer-events-none absolute z-10 w-52 rounded-xl border border-[var(--line-2)] bg-[var(--panel)] p-3 text-[12px] shadow-lg"
          style={{
            left: `${(px(hi) / W) * 100}%`,
            top: 8,
            transform: `translateX(${px(hi) > W / 2 ? '-108%' : '8%'})`,
          }}
        >
          <div className="mb-1.5 font-semibold text-[var(--ink)]">
            {hi === semanas.length - 1 ? 'Esta semana' : `Semana del ${fmtSemana(semanas[hi])}`}
          </div>
          <dl className="flex flex-col gap-1">
            {[...series].sort((a, b) => b.valores[hi] - a.valores[hi]).map((s) => (
              <div key={s.etapa} className="flex items-center justify-between gap-2">
                <dt className="flex items-center gap-1.5 text-[var(--ink-2)]">
                  <span className="h-2 w-2 rounded-sm" style={{ background: ETAPA_COLOR[s.etapa] || 'var(--ink-3)' }} />
                  {ETAPA_LABEL[s.etapa] || s.etapa}
                </dt>
                <dd className="font-mono tabular-nums text-[var(--ink)]">{agrupar(s.valores[hi])}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  )
}
