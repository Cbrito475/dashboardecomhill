'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { LayoutGrid, Package, Truck, RotateCcw, Search, PanelLeft } from 'lucide-react'
import type { DashboardData, Pedido360, PedidoLista } from '@/lib/supabase/queries'
import { logout, accionPedidosFiltro, accionPedido360 } from '@/app/actions'
import { DrillContext } from '@/components/DrillContext'
import SecEjecutivo from '@/components/secciones/SecEjecutivo'
import SecProductos from '@/components/secciones/SecProductos'
import SecOperacion from '@/components/secciones/SecOperacion'
import SecDevoluciones from '@/components/secciones/SecDevoluciones'
import SecPedido from '@/components/secciones/SecPedido'

const TABS = [
  { key: 'ejecutivo', label: 'Ejecutivo', Comp: SecEjecutivo, Ico: LayoutGrid },
  { key: 'productos', label: 'Productos', Comp: SecProductos, Ico: Package },
  { key: 'operacion', label: 'Operación', Comp: SecOperacion, Ico: Truck },
  { key: 'devoluciones', label: 'Devoluciones', Comp: SecDevoluciones, Ico: RotateCcw },
] as const

const TAB_PEDIDO = { key: 'pedido', label: 'Buscar pedido', Ico: Search } as const

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
  const tabValido = TABS.some((t) => t.key === tabInicial) || tabInicial === TAB_PEDIDO.key
  const [tab, setTab] = useState<string>(tabValido ? (tabInicial as string) : 'ejecutivo')
  const [d1, setD1] = useState(desde)
  const [d2, setD2] = useState(hasta)
  const [navOpen, setNavOpen] = useState(true)
  const esPedido = tab === TAB_PEDIDO.key

  // ---- Drill-down por pedido: todo en memoria, sin parámetros en la URL ----
  const [drill, setDrill] = useState<{ causa: string; desenlace: string; lista: PedidoLista[] } | null>(null)
  const [pedidoSel, setPedidoSel] = useState<Pedido360 | null>(null)
  const [buscado, setBuscado] = useState('')
  const [cargando, startCarga] = useTransition()

  const abrirDrill = (causa: string | null, desenlace: string | null) => {
    setTab(TAB_PEDIDO.key)
    setBuscado('')
    startCarga(async () => {
      const l = await accionPedidosFiltro(causa, desenlace, desde, hasta)
      setDrill({ causa: causa ?? '', desenlace: desenlace ?? '', lista: l })
      setPedidoSel(null)
    })
  }
  const verPedido = (order: string) => {
    startCarga(async () => {
      setPedidoSel(await accionPedido360(order))
    })
  }
  const buscarPedido = (order: string) => {
    setDrill(null)
    setBuscado(order)
    startCarga(async () => {
      setPedidoSel(await accionPedido360(order))
    })
  }

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
  const tituloTab = esPedido ? TAB_PEDIDO.label : actual.label

  return (
    <DrillContext.Provider value={abrirDrill}>
    <div className="flex min-h-screen">
      {cargando && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-[color-mix(in_srgb,var(--bg)_55%,transparent)] backdrop-blur-[2px]">
          <div className="flex items-center gap-3 rounded-xl border border-[var(--line-2)] bg-[var(--panel)] px-5 py-3 shadow-xl">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--line-2)] border-t-[var(--accent)]" />
            <span className="text-[13px] font-medium text-[var(--ink)]">Cargando pedidos…</span>
          </div>
        </div>
      )}
      {/* ---------- Nav lateral (colapsable) ---------- */}
      <aside
        className={`fixed inset-y-0 left-0 z-20 flex w-[224px] flex-col border-r border-[var(--line)] bg-[var(--panel)] transition-transform duration-200 ${
          navOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
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
                <t.Ico size={17} strokeWidth={1.75} className={on ? 'text-[var(--accent)]' : 'text-[var(--ink-3)]'} />
                {t.label}
              </button>
            )
          })}

          <p className="px-2.5 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-3)]">
            Trazabilidad
          </p>
          <button
            onClick={() => {
              setTab(TAB_PEDIDO.key)
              setDrill(null)
            }}
            className={`group relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13.5px] transition ${
              esPedido
                ? 'bg-[var(--accent-soft)] font-medium text-[var(--ink)]'
                : 'text-[var(--ink-2)] hover:bg-[var(--panel-2)] hover:text-[var(--ink)]'
            }`}
          >
            <span
              className={`absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full transition ${
                esPedido ? 'bg-[var(--accent)]' : 'bg-transparent'
              }`}
            />
            <TAB_PEDIDO.Ico size={17} strokeWidth={1.75} className={esPedido ? 'text-[var(--accent)]' : 'text-[var(--ink-3)]'} />
            {TAB_PEDIDO.label}
          </button>
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
      <div className={`flex min-w-0 flex-1 flex-col transition-[margin] duration-200 ${navOpen ? 'ml-[224px]' : 'ml-0'}`}>
        {/* Top bar con el filtro (vale para todas las secciones) */}
        <header className="sticky top-0 z-10 border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--bg)_88%,transparent)] px-6 py-2.5 backdrop-blur">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <button
              onClick={() => setNavOpen((v) => !v)}
              title={navOpen ? 'Esconder menú' : 'Mostrar menú'}
              className="grid h-7 w-7 place-items-center rounded-md border border-[var(--line)] text-[var(--ink-2)] transition hover:bg-[var(--panel-2)] hover:text-[var(--ink)]"
            >
              <PanelLeft size={15} strokeWidth={1.75} />
            </button>
            <h1 className="text-[15px] font-semibold tracking-tight text-[var(--ink)]">{tituloTab}</h1>
            <div className={`ml-auto flex flex-wrap items-center gap-2 text-[13px] ${esPedido ? 'hidden' : ''}`}>
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
          {esPedido ? (
            <p className="mt-1 text-[11px] text-[var(--ink-3)]">Trazabilidad 360° de un pedido</p>
          ) : (
            <p className="mt-1 text-[11px] text-[var(--ink-3)]">
              {fmtFecha(desde)} – {fmtFecha(hasta)} · según fecha del pedido ·{' '}
              {data.resumen.totalPedidos.toLocaleString('es-CL')} pedidos
              {pending && <span className="ml-2 text-[var(--accent)]">actualizando…</span>}
            </p>
          )}
        </header>

        <main className={`px-6 py-6 transition ${pending ? 'pointer-events-none opacity-50' : ''}`}>
          {esPedido ? (
            <SecPedido
              pedido={pedidoSel}
              lista={drill?.lista ?? null}
              causa={drill?.causa ?? ''}
              desenlace={drill?.desenlace ?? ''}
              buscado={buscado}
              pending={cargando}
              onVerPedido={verPedido}
              onBuscar={buscarPedido}
            />
          ) : (
            <Comp data={data} />
          )}
        </main>
      </div>
    </div>
    </DrillContext.Provider>
  )
}
