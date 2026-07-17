'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { DashboardData } from '@/lib/supabase/queries'
import { fmtDec } from '@/lib/format'
import SecEjecutivo from '@/components/secciones/SecEjecutivo'
import SecProductos from '@/components/secciones/SecProductos'
import SecOperacion from '@/components/secciones/SecOperacion'
import SecDevoluciones from '@/components/secciones/SecDevoluciones'

const TABS = [
  { key: 'ejecutivo', label: 'Ejecutivo', Comp: SecEjecutivo },
  { key: 'productos', label: 'Productos', Comp: SecProductos },
  { key: 'operacion', label: 'Operación', Comp: SecOperacion },
  { key: 'devoluciones', label: 'Devoluciones', Comp: SecDevoluciones },
] as const

function addDays(iso: string, days: number) {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}
function fmtFecha(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export default function DashboardShell({
  data,
  rango,
  desde,
  hasta,
  tabInicial,
}: {
  data: DashboardData
  rango: { min: string; max: string }
  desde: string
  hasta: string
  tabInicial?: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [tab, setTab] = useState<string>(
    TABS.some((t) => t.key === tabInicial) ? (tabInicial as string) : 'ejecutivo'
  )
  const [d1, setD1] = useState(desde)
  const [d2, setD2] = useState(hasta)

  // Cambiar el rango recarga la data del server, conservando la pestaña activa.
  const irARango = (nd: string, nh: string) => {
    startTransition(() => router.push(`/?tab=${tab}&desde=${nd}&hasta=${nh}`))
  }

  const presets = [
    { label: 'Todo', d: rango.min, h: rango.max },
    { label: '30d', d: addDays(rango.max, -30), h: rango.max },
    { label: '90d', d: addDays(rango.max, -90), h: rango.max },
  ]
  const activo = (p: (typeof presets)[number]) => p.d === desde && p.h === hasta

  const Comp = TABS.find((t) => t.key === tab)?.Comp ?? SecEjecutivo

  return (
    <div className="flex flex-col gap-5">
      {/* Barra superior: pestañas + filtro (compartido para todas las secciones) */}
      <div className="sticky top-[49px] z-10 -mx-4 border-b border-[var(--line)] bg-[var(--bg)]/95 px-4 py-2.5 backdrop-blur">
        <div className="flex flex-wrap items-center gap-3">
          {/* Pestañas — cambian la sección sin recargar */}
          <div className="flex gap-1 rounded-xl bg-[var(--panel-2)] p-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`rounded-lg px-3 py-1.5 text-[13px] font-medium transition ${
                  tab === t.key
                    ? 'bg-[var(--accent)] text-white shadow-sm'
                    : 'text-[var(--ink-2)] hover:bg-[var(--panel)]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Filtro de fecha — vale para todas las secciones */}
          <div className="ml-auto flex flex-wrap items-center gap-2 text-[13px]">
            {presets.map((p) => (
              <button
                key={p.label}
                onClick={() => irARango(p.d, p.h)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                  activo(p)
                    ? 'bg-[var(--accent)] text-white'
                    : 'border border-[var(--line)] text-[var(--ink-2)] hover:bg-[var(--panel-2)]'
                }`}
              >
                {p.label}
              </button>
            ))}
            <span className="mx-1 h-4 w-px bg-[var(--line)]" />
            <input
              type="date"
              value={d1}
              min={rango.min}
              max={rango.max}
              onChange={(e) => setD1(e.target.value)}
              className="rounded-lg border border-[var(--line)] bg-[var(--panel)] px-2 py-1 text-xs text-[var(--ink)]"
            />
            <span className="text-[var(--ink-3)]">→</span>
            <input
              type="date"
              value={d2}
              min={rango.min}
              max={rango.max}
              onChange={(e) => setD2(e.target.value)}
              className="rounded-lg border border-[var(--line)] bg-[var(--panel)] px-2 py-1 text-xs text-[var(--ink)]"
            />
            <button
              onClick={() => irARango(d1, d2)}
              className="rounded-lg bg-[var(--ink)] px-3 py-1 text-xs font-semibold text-[var(--bg)]"
            >
              Ver
            </button>
          </div>
        </div>
        <p className="mt-1.5 text-[11px] text-[var(--ink-3)]">
          {fmtFecha(desde)} – {fmtFecha(hasta)} · según fecha del pedido ·{' '}
          {data.resumen.totalPedidos.toLocaleString('es-CL')} pedidos ·{' '}
          {fmtDec(data.resumen.pctProblema)}% con reclamo
          {pending && <span className="ml-2 text-[var(--accent)]">actualizando…</span>}
        </p>
      </div>

      {/* Sección activa */}
      <div className={pending ? 'pointer-events-none opacity-50 transition' : 'transition'}>
        <Comp data={data} />
      </div>
    </div>
  )
}
