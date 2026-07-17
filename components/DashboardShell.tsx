'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { DashboardData } from '@/lib/supabase/queries'
import { logout } from '@/app/actions'
import SecEjecutivo from '@/components/secciones/SecEjecutivo'
import SecProductos from '@/components/secciones/SecProductos'
import SecOperacion from '@/components/secciones/SecOperacion'
import SecDevoluciones from '@/components/secciones/SecDevoluciones'

type IconProps = { className?: string }
const IcoEjecutivo = (p: IconProps) => (
  <svg viewBox="0 0 16 16" fill="none" className={p.className} aria-hidden>
    <rect x="1.5" y="1.5" width="5.5" height="7" rx="1" stroke="currentColor" strokeWidth="1.3" />
    <rect x="1.5" y="10.5" width="5.5" height="4" rx="1" stroke="currentColor" strokeWidth="1.3" />
    <rect x="9" y="1.5" width="5.5" height="4" rx="1" stroke="currentColor" strokeWidth="1.3" />
    <rect x="9" y="7.5" width="5.5" height="7" rx="1" stroke="currentColor" strokeWidth="1.3" />
  </svg>
)
const IcoProductos = (p: IconProps) => (
  <svg viewBox="0 0 16 16" fill="none" className={p.className} aria-hidden>
    <path d="M8 1.5l5.5 3v6.5L8 14.5 2.5 11V4.5L8 1.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    <path d="M2.7 4.6L8 7.6l5.3-3M8 7.6v6.9" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
  </svg>
)
const IcoOperacion = (p: IconProps) => (
  <svg viewBox="0 0 16 16" fill="none" className={p.className} aria-hidden>
    <rect x="1.5" y="4" width="8" height="6.5" rx="1" stroke="currentColor" strokeWidth="1.3" />
    <path d="M9.5 6.5h3l2 2.2v1.8h-5V6.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    <circle cx="4.5" cy="11.5" r="1.4" stroke="currentColor" strokeWidth="1.3" />
    <circle cx="11.5" cy="11.5" r="1.4" stroke="currentColor" strokeWidth="1.3" />
  </svg>
)
const IcoDevoluciones = (p: IconProps) => (
  <svg viewBox="0 0 16 16" fill="none" className={p.className} aria-hidden>
    <path d="M3.5 8a4.5 4.5 0 104.5-4.5H4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    <path d="M6 1.5L3.5 3.5 6 5.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const TABS = [
  { key: 'ejecutivo', label: 'Ejecutivo', Comp: SecEjecutivo, Ico: IcoEjecutivo },
  { key: 'productos', label: 'Productos', Comp: SecProductos, Ico: IcoProductos },
  { key: 'operacion', label: 'Operación', Comp: SecOperacion, Ico: IcoOperacion },
  { key: 'devoluciones', label: 'Devoluciones', Comp: SecDevoluciones, Ico: IcoDevoluciones },
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
  userEmail,
}: {
  data: DashboardData
  rango: { min: string; max: string }
  desde: string
  hasta: string
  tabInicial?: string
  userEmail?: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [tab, setTab] = useState<string>(TABS.some((t) => t.key === tabInicial) ? (tabInicial as string) : 'ejecutivo')
  const [d1, setD1] = useState(desde)
  const [d2, setD2] = useState(hasta)

  const irARango = (nd: string, nh: string) => {
    startTransition(() => router.push(`/?tab=${tab}&desde=${nd}&hasta=${nh}`))
  }
  const presets = [
    { label: 'Todo', d: rango.min, h: rango.max },
    { label: '30d', d: addDays(rango.max, -30), h: rango.max },
    { label: '90d', d: addDays(rango.max, -90), h: rango.max },
  ]
  const activo = (p: (typeof presets)[number]) => p.d === desde && p.h === hasta
  const actual = TABS.find((t) => t.key === tab) ?? TABS[0]
  const Comp = actual.Comp

  return (
    <div className="flex min-h-screen">
      {/* ---------- Nav lateral ---------- */}
      <aside className="fixed inset-y-0 left-0 z-20 flex w-[224px] flex-col border-r border-[var(--line)] bg-[var(--panel)]">
        <div className="flex items-center gap-2 px-5 pb-4 pt-5">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-[var(--accent)] text-[13px] font-semibold text-[var(--bg)]">
            L
          </span>
          <div className="leading-tight">
            <div className="text-[13px] font-semibold tracking-tight text-[var(--ink)]">Centro SAC</div>
            <div className="text-[11px] text-[var(--ink-3)]">Lorentina</div>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 px-2.5">
          <p className="px-2.5 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-3)]">
            Análisis
          </p>
          {TABS.map((t) => {
            const on = t.key === tab
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`group relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13.5px] transition ${
                  on
                    ? 'bg-[var(--accent-soft)] font-medium text-[var(--ink)]'
                    : 'text-[var(--ink-2)] hover:bg-[var(--panel-2)] hover:text-[var(--ink)]'
                }`}
              >
                <span
                  className={`absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full transition ${
                    on ? 'bg-[var(--accent)]' : 'bg-transparent'
                  }`}
                />
                <t.Ico className={`h-[17px] w-[17px] ${on ? 'text-[var(--accent)]' : 'text-[var(--ink-3)]'}`} />
                {t.label}
              </button>
            )
          })}
        </nav>

        <div className="border-t border-[var(--line)] px-4 py-3">
          <div className="mb-2 truncate text-[11px] text-[var(--ink-3)]" title={userEmail}>
            {userEmail ?? 'sin sesión'}
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="w-full rounded-md border border-[var(--line-2)] px-3 py-1.5 text-[12px] text-[var(--ink-2)] transition hover:bg-[var(--panel-2)] hover:text-[var(--ink)]"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>

      {/* ---------- Área principal ---------- */}
      <div className="ml-[224px] flex min-w-0 flex-1 flex-col">
        {/* Top bar con el filtro (vale para todas las secciones) */}
        <header className="sticky top-0 z-10 border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--bg)_88%,transparent)] px-6 py-2.5 backdrop-blur">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <h1 className="text-[15px] font-semibold tracking-tight text-[var(--ink)]">{actual.label}</h1>
            <div className="ml-auto flex flex-wrap items-center gap-2 text-[13px]">
              {presets.map((p) => (
                <button
                  key={p.label}
                  onClick={() => irARango(p.d, p.h)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                    activo(p)
                      ? 'bg-[var(--accent)] text-[var(--bg)]'
                      : 'border border-[var(--line)] text-[var(--ink-2)] hover:bg-[var(--panel-2)]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
              <span className="mx-1 h-4 w-px bg-[var(--line-2)]" />
              <input
                type="date"
                value={d1}
                min={rango.min}
                max={rango.max}
                onChange={(e) => setD1(e.target.value)}
                className="rounded-md border border-[var(--line)] bg-[var(--panel)] px-2 py-1 text-xs text-[var(--ink)]"
              />
              <span className="text-[var(--ink-3)]">→</span>
              <input
                type="date"
                value={d2}
                min={rango.min}
                max={rango.max}
                onChange={(e) => setD2(e.target.value)}
                className="rounded-md border border-[var(--line)] bg-[var(--panel)] px-2 py-1 text-xs text-[var(--ink)]"
              />
              <button
                onClick={() => irARango(d1, d2)}
                className="rounded-md bg-[var(--ink)] px-3 py-1 text-xs font-semibold text-[var(--bg)]"
              >
                Aplicar
              </button>
            </div>
          </div>
          <p className="mt-1 text-[11px] text-[var(--ink-3)]">
            {fmtFecha(desde)} – {fmtFecha(hasta)} · según fecha del pedido ·{' '}
            {data.resumen.totalPedidos.toLocaleString('es-CL')} pedidos
            {pending && <span className="ml-2 text-[var(--accent)]">actualizando…</span>}
          </p>
        </header>

        <main className={`px-6 py-6 transition ${pending ? 'pointer-events-none opacity-50' : ''}`}>
          <Comp data={data} />
        </main>
      </div>
    </div>
  )
}
