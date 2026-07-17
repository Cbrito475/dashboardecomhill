'use client'

import { useState } from 'react'
import { ORDEN_ESTADOS, ESTADO_LABEL, ESTADO_SUB, ESTADO_COLOR, type EstadoPedido } from '@/lib/supabase/queries'
import { fmtCLP, agrupar, fmtDec } from '@/lib/format'

export type FilaEstado = {
  estado: EstadoPedido
  n: number
  pct: number
  ventas: number
  reembolsado: number
}

export default function EstadoPedidos({ filas, totalPedidos }: { filas: FilaEstado[]; totalPedidos: number }) {
  const byEstado = new Map(filas.map((f) => [f.estado, f]))
  // Orden visual de la barra apilada: del más benigno al más grave (izq → der).
  const orden = ORDEN_ESTADOS.map((e) => byEstado.get(e)).filter((f): f is FilaEstado => !!f)
  // La lista de abajo va ordenada de mayor a menor cantidad.
  const ordenLista = [...orden].sort((a, b) => b.n - a.n)

  const conContacto = orden.filter((f) => f.estado !== 'sin_contacto')
  const maxContacto = Math.max(...conContacto.map((f) => f.n), 1)
  const reclamos = conContacto.filter((f) => f.estado !== 'consulta')
  const totalReclamos = reclamos.reduce((a, f) => a + f.n, 0)
  const plataReclamos = reclamos.reduce((a, f) => a + f.reembolsado, 0)

  // Segmentos con posición acumulada para ubicar el tooltip sobre cada franja.
  let acc = 0
  const segmentos = orden
    .filter((f) => f.n > 0)
    .map((f) => {
      const left = acc
      const w = (f.n / totalPedidos) * 100
      acc += w
      return { ...f, left, w }
    })

  const [hover, setHover] = useState<EstadoPedido | null>(null)
  const seg = segmentos.find((s) => s.estado === hover)

  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5">
      <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--ink-3)]">
        En qué terminó cada pedido
      </p>
      <p className="mb-4 mt-1 text-[11px] leading-relaxed text-[var(--ink-3)]">
        Cada uno de los pedidos del período en <b>un solo estado</b>. Se cuentan pedidos, no correos. Si un pedido
        tuvo varios reclamos, <b>gana el más grave</b>: pidió la plata &gt; pidió cambio &gt; reclamó sin pedir.
      </p>

      {/* Total del universo sobre la barra */}
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--ink-3)]">
          Universo del período
        </span>
        <span className="font-serif text-[15px] tabular-nums text-[var(--ink)]">
          {agrupar(totalPedidos)} <span className="text-[11px] text-[var(--ink-3)]">pedidos</span>
        </span>
      </div>

      {/* Barra apilada con tooltip por franja */}
      <div className="relative">
        {seg && (
          <div
            className="pointer-events-none absolute bottom-full z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md border border-[var(--line)] bg-[var(--panel)] px-2.5 py-1.5 text-center shadow-md"
            style={{ left: `${Math.min(Math.max(seg.left + seg.w / 2, 8), 92)}%` }}
          >
            <div className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--ink)]">
              <span className="h-2 w-2 rounded-full" style={{ background: ESTADO_COLOR[seg.estado] }} />
              {ESTADO_LABEL[seg.estado]}
            </div>
            <div className="mt-0.5 font-mono text-[11px] tabular-nums text-[var(--ink-2)]">
              {agrupar(seg.n)} pedidos · {fmtDec(seg.pct)}% del universo
            </div>
          </div>
        )}
        <div className="flex h-3.5 w-full overflow-hidden rounded-full bg-[var(--line)]">
          {segmentos.map((f) => (
            <span
              key={f.estado}
              onMouseEnter={() => setHover(f.estado)}
              onMouseLeave={() => setHover(null)}
              className="h-full cursor-default transition-opacity"
              style={{
                width: `${f.w}%`,
                background: ESTADO_COLOR[f.estado],
                opacity: hover && hover !== f.estado ? 0.45 : 1,
              }}
            />
          ))}
        </div>
      </div>

      {/* Encabezado de columnas de la lista */}
      <div className="mt-5 flex items-center gap-3 border-b border-[var(--line)] pb-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-3)]">
        <span className="w-1 flex-none" aria-hidden />
        <span className="w-56 flex-none">Estado</span>
        <span className="flex-1" />
        <span className="w-28 flex-none text-right">Pedidos · %</span>
        <span className="w-28 flex-none text-right">Representa en $</span>
      </div>

      {/* Lista discriminada, de mayor a menor */}
      <div className="mt-2 flex flex-col gap-2.5">
        {ordenLista.map((f) => {
          const esSinContacto = f.estado === 'sin_contacto'
          const ancho = esSinContacto ? 100 : (f.n / maxContacto) * 100
          const activo = hover === f.estado
          return (
            <div
              key={f.estado}
              onMouseEnter={() => setHover(f.estado)}
              onMouseLeave={() => setHover(null)}
              className={`flex items-center gap-3 rounded-md px-1 py-0.5 text-sm transition ${activo ? 'bg-[var(--panel-2)]' : ''}`}
            >
              <span className="h-8 w-1 flex-none rounded-full" style={{ background: ESTADO_COLOR[f.estado] }} aria-hidden />
              <span className="w-56 flex-none">
                <span className="block truncate text-[var(--ink-2)]">{ESTADO_LABEL[f.estado]}</span>
                <span className="block truncate text-[11px] text-[var(--ink-3)]">{ESTADO_SUB[f.estado]}</span>
              </span>
              <span className="h-3.5 flex-1 overflow-hidden rounded-full bg-[var(--line)]">
                <span
                  className="block h-full rounded-full"
                  style={{ width: `${ancho}%`, background: ESTADO_COLOR[f.estado], opacity: esSinContacto ? 0.35 : 1 }}
                />
              </span>
              <span className="w-28 flex-none text-right font-mono text-xs tabular-nums text-[var(--ink)]">
                {agrupar(f.n)} <span className="text-[var(--ink-3)]">· {fmtDec(f.pct)}%</span>
              </span>
              <span className="w-28 flex-none text-right font-mono text-xs tabular-nums text-[var(--ink-2)]">
                {fmtCLP(f.ventas)}
              </span>
            </div>
          )
        })}
      </div>

      <p className="mt-4 border-t border-[var(--line)] pt-3 text-[11px] leading-relaxed text-[var(--ink-3)]">
        Las barras de la lista están escaladas entre los estados con contacto (al ser el{' '}
        {fmtDec(Math.round((totalReclamos / totalPedidos) * 1000) / 10)}% del universo, contra el total serían
        invisibles); la barra apilada de arriba sí muestra las proporciones reales. <b>Representa en $</b> es el{' '}
        <b>valor de venta</b> de los pedidos de cada estado, no lo reembolsado. De los reclamos, se devolvieron{' '}
        <b className="text-[var(--ink-2)]">{fmtCLP(plataReclamos)}</b> (el detalle de devoluciones está en su
        sección).
      </p>
    </div>
  )
}
