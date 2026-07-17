'use client'

import { useState } from 'react'
import type { ProductoFila } from '@/lib/supabase/queries'
import { MOTIVO_LABEL } from '@/lib/supabase/queries'
import { fmtCLP, agrupar } from '@/lib/format'

const ESTADO_META: Record<string, { label: string; color: string }> = {
  ok: { label: 'OK', color: 'var(--ok)' },
  vigilar: { label: 'Vigilar', color: 'var(--warn)' },
  apagar: { label: 'Apagar', color: 'var(--crit)' },
}

const W = 640
const H = 400
const padL = 48
const padR = 46
const padT = 46
const padB = 42

export default function ProductScatter({ productos }: { productos: ProductoFila[] }) {
  const [hover, setHover] = useState<number | null>(null)

  const conVentas = productos.filter((p) => p.total_ventas > 0).slice(0, 45)
  if (conVentas.length === 0) {
    return <p className="text-xs text-[var(--ink-3)]">Sin datos de ventas en este rango.</p>
  }

  const maxVentas = Math.max(...conVentas.map((p) => p.total_ventas), 1)
  const maxReclamo = Math.max(...conVentas.map((p) => p.pct_reclamo || 0), 25)
  const maxPerdido = Math.max(...conVentas.map((p) => p.monto_reembolsado), 1)

  const px = (v: number) => padL + (v / maxVentas) * (W - padL - padR)
  const py = (v: number) => padT + (1 - v / maxReclamo) * (H - padT - padB)

  const puntos = conVentas.map((p, i) => ({
    ...p,
    i,
    x: px(p.total_ventas),
    y: py(p.pct_reclamo || 0),
    r: 6 + Math.sqrt(p.monto_reembolsado / maxPerdido) * 20,
    color: ESTADO_META[p.estado_playbook]?.color || 'var(--accent)',
  }))

  // etiquetar los más relevantes (mayor plata perdida)
  const etiquetados = new Set(
    [...puntos].sort((a, b) => b.monto_reembolsado - a.monto_reembolsado).slice(0, 6).map((p) => p.i)
  )

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({ f, val: maxReclamo * f, y: py(maxReclamo * f) }))
  const xTicks = [0.25, 0.5, 0.75, 1].map((f) => ({ val: maxVentas * f, x: px(maxVentas * f) }))

  const hp = hover != null ? puntos[hover] : null

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px] text-[var(--ink-3)]">
        <span>Cada burbuja = un producto · derecha vende más · arriba más reclamo de producto · tamaño = plata perdida</span>
        <span className="ml-auto flex items-center gap-3">
          {Object.entries(ESTADO_META).map(([k, m]) => (
            <span key={k} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: m.color }} />
              {m.label}
            </span>
          ))}
        </span>
      </div>

      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          style={{ maxHeight: 420 }}
          role="img"
          aria-label="Ventas vs porcentaje de reclamo por producto"
        >
          {/* gridlines Y */}
          {yTicks.map((t) => (
            <g key={`y${t.f}`}>
              <line x1={padL} y1={t.y} x2={W - padR} y2={t.y} stroke="var(--line)" strokeWidth={1} strokeDasharray="3 3" />
              <text x={padL - 6} y={t.y + 3} textAnchor="end" fontSize={9.5} fill="var(--ink-3)">
                {Math.round(t.val)}%
              </text>
            </g>
          ))}
          {/* gridlines X */}
          {xTicks.map((t, k) => (
            <g key={`x${k}`}>
              <line x1={t.x} y1={padT} x2={t.x} y2={H - padB} stroke="var(--line)" strokeWidth={0.6} strokeDasharray="3 3" />
              <text x={t.x} y={H - padB + 14} textAnchor="middle" fontSize={8.5} fill="var(--ink-3)">
                {t.val >= 1000000 ? `${(t.val / 1000000).toFixed(1)}M` : `${Math.round(t.val / 1000)}k`}
              </text>
            </g>
          ))}
          {/* ejes */}
          <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke="var(--line-2)" strokeWidth={1} />
          <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="var(--line-2)" strokeWidth={1} />
          <text x={(padL + W - padR) / 2} y={H - 6} textAnchor="middle" fontSize={10} fill="var(--ink-3)">
            ventas (CLP) →
          </text>
          <text x={12} y={padT + 4} fontSize={10} fill="var(--ink-3)" transform={`rotate(-90 12 ${(padT + H - padB) / 2})`}>
            % reclamo ↑
          </text>

          {/* burbujas */}
          {puntos.map((p) => {
            const active = hover === p.i
            return (
              <g key={p.product_id} onMouseEnter={() => setHover(p.i)} onMouseLeave={() => setHover(null)} style={{ cursor: 'pointer' }}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={p.r}
                  fill={p.color}
                  fillOpacity={active ? 0.75 : 0.42}
                  stroke={p.color}
                  strokeWidth={active ? 2 : 1}
                />
                {(etiquetados.has(p.i) || active) && (
                  <text
                    x={Math.min(Math.max(p.x, padL + 40), W - padR - 40)}
                    y={Math.max(p.y - p.r - 4, 10)}
                    textAnchor="middle"
                    fontSize={9.5}
                    fontWeight={active ? 700 : 500}
                    fill="var(--ink-2)"
                  >
                    {(p.producto_titulo || '').slice(0, 20)}
                  </text>
                )}
              </g>
            )
          })}
        </svg>

        {/* tooltip */}
        {hp && (
          <div
            className="pointer-events-none absolute z-10 w-56 rounded-xl border border-[var(--line-2)] bg-[var(--panel-2)] p-3 text-[12px] shadow-lg"
            style={{
              left: `${(hp.x / W) * 100}%`,
              top: `${(hp.y / H) * 100}%`,
              transform: `translate(${hp.x > W / 2 ? '-108%' : '8%'}, -50%)`,
            }}
          >
            <div className="mb-1.5 flex items-start justify-between gap-2">
              <span className="font-semibold leading-tight text-[var(--ink)]">{hp.producto_titulo || '—'}</span>
              <span
                className="flex-none rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase"
                style={{ background: hp.color, color: '#fff' }}
              >
                {ESTADO_META[hp.estado_playbook]?.label || ''}
              </span>
            </div>
            <dl className="flex flex-col gap-0.5 text-[var(--ink-2)]">
              <Row k="Ventas" v={fmtCLP(hp.total_ventas)} />
              <Row k="Pedidos" v={agrupar(hp.pedidos)} />
              <Row k="% reclamo" v={`${hp.pct_reclamo ?? 0}%`} />
              <Row k="Plata perdida" v={fmtCLP(hp.monto_reembolsado)} />
              {hp.motivo_dominante && <Row k="Motivo top" v={MOTIVO_LABEL[hp.motivo_dominante] || hp.motivo_dominante} />}
            </dl>
          </div>
        )}
      </div>
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-[var(--ink-3)]">{k}</dt>
      <dd className="font-mono tabular-nums text-[var(--ink)]">{v}</dd>
    </div>
  )
}
