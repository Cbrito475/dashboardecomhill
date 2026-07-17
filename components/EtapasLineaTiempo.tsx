'use client'

import { useState } from 'react'
import { agrupar } from '@/lib/format'

export type LineaTiempoData = { semanas: string[]; series: { etapa: string; valores: number[] }[] }

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

const W = 760
const H = 320
const padL = 46
const padR = 18
const padT = 16
const padB = 36

function fmtSemana(iso: string): string {
  const p = iso.split('-')
  return `${p[2]}/${p[1]}`
}

// curva monótona simple (Catmull-Rom → path) para que se vea suave como la referencia
function pathSuave(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return pts.length ? `M ${pts[0].x} ${pts[0].y}` : ''
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] || p2
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`
  }
  return d
}

export default function EtapasLineaTiempo({ data }: { data: LineaTiempoData }) {
  const [hover, setHover] = useState<number | null>(null)
  const { semanas, series } = data

  if (semanas.length < 2 || series.length === 0) {
    return <p className="text-xs text-[var(--ink-3)]">Sin datos suficientes para la línea de tiempo.</p>
  }

  const maxY = Math.max(...series.flatMap((s) => s.valores), 1)
  const nY = Math.max(50, Math.ceil(maxY / 50) * 50)
  const px = (i: number) => padL + (semanas.length === 1 ? 0 : (i / (semanas.length - 1)) * (W - padL - padR))
  const py = (v: number) => padT + (1 - v / nY) * (H - padT - padB)
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({ v: nY * f, y: py(nY * f) }))
  const paso = Math.max(1, Math.ceil(semanas.length / 9))
  const idx = hover != null ? hover : semanas.length - 1

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
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 360 }} role="img" aria-label="Pedidos varados por etapa a lo largo del tiempo">
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

          {semanas.map((s, i) =>
            i % paso === 0 || i === semanas.length - 1 ? (
              <text key={s + i} x={px(i)} y={H - padB + 16} textAnchor="middle" fontSize={9} fill="var(--ink-3)">
                {i === semanas.length - 1 ? 'ahora' : fmtSemana(s)}
              </text>
            ) : null
          )}

          <line x1={px(idx)} y1={padT} x2={px(idx)} y2={H - padB} stroke="var(--line-2)" strokeWidth={1} strokeDasharray="3 3" />

          {series.map((s) => {
            const color = ETAPA_COLOR[s.etapa] || 'var(--ink-3)'
            const pts = s.valores.map((v, i) => ({ x: px(i), y: py(v) }))
            return <path key={s.etapa} d={pathSuave(pts)} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          })}

          {series.map((s) => (
            <circle key={s.etapa} cx={px(idx)} cy={py(s.valores[idx])} r={3.5} fill="var(--panel)" stroke={ETAPA_COLOR[s.etapa] || 'var(--ink-3)'} strokeWidth={2} />
          ))}

          {semanas.map((s, i) => (
            <rect
              key={s + i}
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

        <div
          className="pointer-events-none absolute z-10 w-56 rounded-xl border border-[var(--line-2)] bg-[var(--panel)] p-3 text-[12px] shadow-lg"
          style={{ left: `${(px(idx) / W) * 100}%`, top: 6, transform: `translateX(${px(idx) > W / 2 ? '-108%' : '8%'})` }}
        >
          <div className="mb-1.5 font-semibold text-[var(--ink)]">
            {idx === semanas.length - 1 ? 'Esta semana' : `Semana del ${fmtSemana(semanas[idx])}`}
          </div>
          <dl className="flex flex-col gap-1">
            {[...series].sort((a, b) => b.valores[idx] - a.valores[idx]).map((s) => (
              <div key={s.etapa} className="flex items-center justify-between gap-2">
                <dt className="flex items-center gap-1.5 text-[var(--ink-2)]">
                  <span className="h-2 w-2 rounded-sm" style={{ background: ETAPA_COLOR[s.etapa] || 'var(--ink-3)' }} />
                  {ETAPA_LABEL[s.etapa] || s.etapa}
                </dt>
                <dd className="font-mono tabular-nums text-[var(--ink)]">{agrupar(s.valores[idx])}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  )
}
