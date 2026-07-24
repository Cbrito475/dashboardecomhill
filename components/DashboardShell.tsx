'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { LayoutGrid, Package, Truck, RotateCcw, Search, ChevronDown, Inbox, Settings, Gavel } from 'lucide-react'
import type { DashboardData, Pedido360, PedidoLista } from '@/lib/supabase/queries'
import { puede, type Rol } from '@/lib/auth/roles'
import type { ConfigSac, PoliticaMotivo, BandejaItem, BandejaBucket } from '@/lib/supabase/sac'
import { logout, accionPedidosFiltro, accionPedido360 } from '@/app/actions'
import { accionBandeja, accionBandejaCounts, accionGetConfig, accionCaso, accionNoResponder, accionCerrar } from '@/app/actions-sac'
import { accionDisputas, accionDisputasCounts } from '@/app/actions-disputas'
import type { Disputa, DisputaBucket } from '@/lib/supabase/disputas'
import SecBandeja from '@/components/secciones/SecBandeja'
import SecDisputas from '@/components/secciones/SecDisputas'
import { DrillContext } from '@/components/DrillContext'
import SecEjecutivo from '@/components/secciones/SecEjecutivo'
import SecProductos from '@/components/secciones/SecProductos'
import SecOperacion from '@/components/secciones/SecOperacion'
import SecDevoluciones from '@/components/secciones/SecDevoluciones'
import SecPedido from '@/components/secciones/SecPedido'
import SecConfig from '@/components/secciones/SecConfig'

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
  rol,
}: {
  data: DashboardData
  rango: { min: string; max: string }
  desde: string
  hasta: string
  tabInicial?: string
  userEmail?: string
  rol?: Rol | null
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const tabValido = TABS.some((t) => t.key === tabInicial) || tabInicial === TAB_PEDIDO.key
  const [tab, setTab] = useState<string>(tabValido ? (tabInicial as string) : 'ejecutivo')
  const [d1, setD1] = useState(desde)
  const [d2, setD2] = useState(hasta)
  const [dashOpen, setDashOpen] = useState(false)
  const esPedido = tab === TAB_PEDIDO.key

  // ---- Drill-down por pedido: todo en memoria, sin parámetros en la URL ----
  const [drill, setDrill] = useState<{ causa: string; desenlace: string; lista: PedidoLista[] } | null>(null)
  const [pedidoSel, setPedidoSel] = useState<Pedido360 | null>(null)
  const [buscado, setBuscado] = useState('')
  const [modoBandeja, setModoBandeja] = useState(false)
  const [cargando, startCarga] = useTransition()

  const abrirDrill = (causa: string | null, desenlace: string | null) => {
    setTab(TAB_PEDIDO.key)
    setBuscado('')
    setModoBandeja(false)
    startCarga(async () => {
      const l = await accionPedidosFiltro(causa, desenlace, desde, hasta)
      setDrill({ causa: causa ?? '', desenlace: desenlace ?? '', lista: l })
      setPedidoSel(null)
    })
  }

  // Bandeja SAC: la cola de pedidos que esperan respuesta. Reusa el master-detail:
  // clic en un pedido abre su vista 360 con el borrador de respuesta ya adentro.
  const [bandejaItems, setBandejaItems] = useState<BandejaItem[]>([])
  const [bandejaBucket, setBandejaBucket] = useState<BandejaBucket>('por_responder')
  const [bandejaCounts, setBandejaCounts] = useState<Record<BandejaBucket, number>>({
    por_responder: 0,
    respondidos: 0,
    cerrados: 0,
    descartados: 0,
  })
  const cargarBandeja = (bucket: BandejaBucket) => {
    startCarga(async () => {
      const [items, counts] = await Promise.all([accionBandeja(bucket), accionBandejaCounts()])
      setBandejaItems(items)
      setBandejaCounts(counts)
    })
  }
  const abrirBandeja = () => {
    setTab(TAB_PEDIDO.key)
    setBuscado('')
    setModoBandeja(true)
    setDrill(null)
    setPedidoSel(null)
    cargarBandeja(bandejaBucket)
  }
  const cambiarBucket = (bucket: BandejaBucket) => {
    setBandejaBucket(bucket)
    cargarBandeja(bucket)
  }
  const verCaso = (id: string) => {
    startCarga(async () => {
      setPedidoSel(await accionCaso(id))
    })
  }
  const descartarCorreo = (id: string) => {
    startCarga(async () => {
      const r = await accionNoResponder(id)
      if (r.ok) {
        const [items, counts] = await Promise.all([accionBandeja(bandejaBucket), accionBandejaCounts()])
        setBandejaItems(items)
        setBandejaCounts(counts)
      }
    })
  }
  const cerrarCaso = (id: string) => {
    startCarga(async () => {
      const r = await accionCerrar(id)
      if (r.ok) {
        const [items, counts] = await Promise.all([accionBandeja(bandejaBucket), accionBandejaCounts()])
        setBandejaItems(items)
        setBandejaCounts(counts)
      }
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
    setModoBandeja(false)
    startCarga(async () => {
      setPedidoSel(await accionPedido360(order))
    })
  }

  const [configData, setConfigData] = useState<{ config: ConfigSac; politicas: PoliticaMotivo[] } | null>(null)
  const abrirConfig = () => {
    setTab('config')
    startCarga(async () => {
      setConfigData(await accionGetConfig())
    })
  }

  // Disputas: misma mecánica de buckets + contadores que la Bandeja.
  const [disputas, setDisputas] = useState<Disputa[]>([])
  const [disputaBucket, setDisputaBucket] = useState<DisputaBucket>('por_responder')
  const [disputasCounts, setDisputasCounts] = useState<Record<DisputaBucket, number>>({
    por_responder: 0,
    en_revision: 0,
    cerradas: 0,
  })
  const cargarDisputas = (b: DisputaBucket) => {
    startCarga(async () => {
      const [items, counts] = await Promise.all([accionDisputas(b), accionDisputasCounts()])
      setDisputas(items)
      setDisputasCounts(counts)
    })
  }
  const abrirDisputas = () => {
    setTab('disputas')
    cargarDisputas(disputaBucket)
  }
  const cambiarBucketDisputa = (b: DisputaBucket) => {
    setDisputaBucket(b)
    cargarDisputas(b)
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

  return (
    <DrillContext.Provider value={abrirDrill}>
      <div className="flex h-screen flex-col overflow-hidden bg-[var(--bg)]">
        {cargando && (
          <div className="fixed inset-0 z-[70] grid place-items-center bg-[color-mix(in_srgb,var(--bg)_55%,transparent)] backdrop-blur-[2px]">
            <div className="flex items-center gap-3 rounded-xl border border-[var(--line-2)] bg-[var(--panel)] px-5 py-3 shadow-xl">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--line-2)] border-t-[var(--accent)]" />
              <span className="text-[13px] font-medium text-[var(--ink)]">Cargando pedidos…</span>
            </div>
          </div>
        )}

        {/* ---------- Barra superior: marca + menú + filtro ---------- */}
        <header className="flex-none border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--bg)_88%,transparent)] px-6 py-3.5 backdrop-blur">
          <div className="flex flex-wrap items-stretch gap-x-7 gap-y-2">
            <div className="flex flex-col justify-center gap-0.5">
              <span className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--accent)] text-[15px] font-semibold text-[var(--bg)]">
                  L
                </span>
                <span className="hidden text-[15px] font-semibold tracking-tight text-[var(--ink)] sm:block">Centro SAC</span>
              </span>
              <p className="whitespace-nowrap text-[11px] text-[var(--ink-3)]">
                {esPedido ? 'Trazabilidad 360°' : 'Lorentina'}
              </p>
            </div>
            <span className="hidden w-px self-stretch bg-[var(--line-2)] sm:block" />

            {/* Menú: desplegable "Dashboard" (los 4 resúmenes) + Buscar pedido aparte */}
            <nav className="flex items-center gap-3">
              <div className="relative">
                <button
                  onClick={() => setDashOpen((v) => !v)}
                  className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-[15px] font-medium transition ${
                    !esPedido && tab !== 'config'
                      ? 'border-[color-mix(in_srgb,var(--accent)_50%,transparent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                      : 'border-[var(--line)] text-[var(--ink-2)] hover:bg-[var(--panel-2)] hover:text-[var(--ink)]'
                  }`}
                >
                  <LayoutGrid size={17} strokeWidth={1.75} />
                  Dashboard
                  {!esPedido && tab !== 'config' && <span className="text-[var(--ink-3)]">· {actual.label}</span>}
                  <ChevronDown size={16} className={`transition ${dashOpen ? 'rotate-180' : ''}`} />
                </button>
                {dashOpen && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setDashOpen(false)} />
                    <div className="absolute left-0 top-full z-30 mt-1.5 w-60 rounded-xl border border-[var(--line-2)] bg-[var(--panel)] p-1.5 shadow-xl">
                      {TABS.map((t) => {
                        const on = t.key === tab
                        return (
                          <button
                            key={t.key}
                            onClick={() => {
                              setTab(t.key)
                              setDashOpen(false)
                            }}
                            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] transition ${
                              on ? 'bg-[var(--accent-soft)] font-medium text-[var(--ink)]' : 'text-[var(--ink-2)] hover:bg-[var(--panel-2)] hover:text-[var(--ink)]'
                            }`}
                          >
                            <t.Ico size={18} strokeWidth={1.75} className={on ? 'text-[var(--accent)]' : 'text-[var(--ink-3)]'} />
                            {t.label}
                          </button>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={() => {
                  setTab(TAB_PEDIDO.key)
                  setDrill(null)
                  setModoBandeja(false)
                  setPedidoSel(null)
                }}
                className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-[15px] font-medium transition ${
                  esPedido && !modoBandeja
                    ? 'border-[color-mix(in_srgb,var(--accent)_50%,transparent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                    : 'border-[var(--line)] text-[var(--ink-2)] hover:bg-[var(--panel-2)] hover:text-[var(--ink)]'
                }`}
              >
                <TAB_PEDIDO.Ico size={18} strokeWidth={1.75} />
                {TAB_PEDIDO.label}
              </button>

              <button
                onClick={abrirBandeja}
                className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-[15px] font-medium transition ${
                  esPedido && modoBandeja
                    ? 'border-[color-mix(in_srgb,var(--accent)_50%,transparent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                    : 'border-[var(--line)] text-[var(--ink-2)] hover:bg-[var(--panel-2)] hover:text-[var(--ink)]'
                }`}
              >
                <Inbox size={18} strokeWidth={1.75} />
                Bandeja
              </button>

              <button
                onClick={abrirDisputas}
                className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-[15px] font-medium transition ${
                  tab === 'disputas'
                    ? 'border-[color-mix(in_srgb,var(--accent)_50%,transparent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                    : 'border-[var(--line)] text-[var(--ink-2)] hover:bg-[var(--panel-2)] hover:text-[var(--ink)]'
                }`}
              >
                <Gavel size={18} strokeWidth={1.75} />
                Disputas
                {disputasCounts.por_responder > 0 && (
                  <span className="rounded-full bg-[var(--crit)] px-1.5 text-[11px] font-semibold tabular-nums text-white">
                    {disputasCounts.por_responder}
                  </span>
                )}
              </button>

              {puede(rol ?? null, 'supervisor') && (
                <button
                  onClick={abrirConfig}
                  className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-[15px] font-medium transition ${
                    tab === 'config'
                      ? 'border-[color-mix(in_srgb,var(--accent)_50%,transparent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                      : 'border-[var(--line)] text-[var(--ink-2)] hover:bg-[var(--panel-2)] hover:text-[var(--ink)]'
                  }`}
                >
                  <Settings size={18} strokeWidth={1.75} />
                  Config
                </button>
              )}
            </nav>
            <span className="hidden w-px self-stretch bg-[var(--line-2)] sm:block" />

            <div className="ml-auto flex flex-wrap items-center gap-3">
              <div className={`flex flex-wrap items-center gap-2 text-[13px] ${esPedido ? 'hidden' : ''}`}>
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
                <span className="ml-1 whitespace-nowrap text-[11px] text-[var(--ink-3)]">
                  {data.resumen.totalPedidos.toLocaleString('es-CL')} pedidos
                  {pending && <span className="ml-1.5 text-[var(--accent)]">· actualizando…</span>}
                </span>
              </div>
              <form action={logout}>
                <button
                  type="submit"
                  title={userEmail}
                  className="rounded-md border border-[var(--line-2)] px-3 py-1.5 text-[12px] text-[var(--ink-2)] transition hover:bg-[var(--panel-2)] hover:text-[var(--ink)]"
                >
                  Salir
                </button>
              </form>
            </div>
          </div>
        </header>

        <main className={`min-h-0 flex-1 overflow-y-auto px-6 py-4 transition ${pending ? 'pointer-events-none opacity-50' : ''}`}>
          {tab === 'disputas' ? (
            <SecDisputas
              items={disputas}
              bucket={disputaBucket}
              counts={disputasCounts}
              onCambiarBucket={cambiarBucketDisputa}
              onRecargar={() => cargarDisputas(disputaBucket)}
            />
          ) : tab === 'config' ? (
            configData ? (
              <SecConfig config={configData.config} politicas={configData.politicas} />
            ) : (
              <div className="p-10 text-center text-[13px] text-[var(--ink-3)]">Cargando configuración…</div>
            )
          ) : esPedido ? (
            modoBandeja && !pedidoSel ? (
              <SecBandeja
                items={bandejaItems}
                bucket={bandejaBucket}
                counts={bandejaCounts}
                onCambiarBucket={cambiarBucket}
                onVer={verPedido}
                onAbrirCaso={verCaso}
                onCerrar={cerrarCaso}
                onDescartar={descartarCorreo}
              />
            ) : (
              <SecPedido
                pedido={pedidoSel}
                lista={modoBandeja ? null : drill?.lista ?? null}
                causa={drill?.causa ?? ''}
                desenlace={drill?.desenlace ?? ''}
                rango={`${fmtFecha(desde)} – ${fmtFecha(hasta)}`}
                buscado={buscado}
                pending={cargando}
                productos={data.productos}
                rol={rol ?? null}
                onVerPedido={verPedido}
                onBuscar={buscarPedido}
              />
            )
          ) : (
            <Comp data={data} />
          )}
        </main>
      </div>
    </DrillContext.Provider>
  )
}
