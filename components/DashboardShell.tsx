'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { LayoutGrid, Package, Truck, RotateCcw, Search, ChevronDown, Inbox, Settings, Gavel, MessageCircle, History, Store, PlugZap, type LucideIcon } from 'lucide-react'
import { TIENDA_LORENTINA } from '@/lib/core/tenant'
import type { TiendaSelector } from '@/lib/supabase/tiendas'
import type { DashboardData, Pedido360, PedidoLista } from '@/lib/supabase/queries'
import { puede, type Rol } from '@/lib/auth/roles'
import type { ConfigSac, PoliticaMotivo, BandejaItem, BandejaBucket } from '@/lib/supabase/sac'
import { logout, accionPedidosFiltro, accionPedido360 } from '@/app/actions'
import { accionBandeja, accionBandejaCounts, accionGetConfig, accionCaso, accionNoResponder, accionCerrar } from '@/app/actions-sac'
import { accionDisputas, accionDisputasCounts, accionDisputasResumen } from '@/app/actions-disputas'
import { accionRedesCounts } from '@/app/actions-redes'
import type { Disputa, DisputaBucket, ResumenDisputas } from '@/lib/supabase/disputas'
import SecBandeja from '@/components/secciones/SecBandeja'
import SecDisputas from '@/components/secciones/SecDisputas'
import { DrillContext } from '@/components/DrillContext'
import SecEjecutivo from '@/components/secciones/SecEjecutivo'
import SecProductos from '@/components/secciones/SecProductos'
import SecOperacion from '@/components/secciones/SecOperacion'
import SecDevoluciones from '@/components/secciones/SecDevoluciones'
import SecPedido from '@/components/secciones/SecPedido'
import SecConfig from '@/components/secciones/SecConfig'
import SecRedes from '@/components/secciones/SecRedes'
import SecActividad from '@/components/secciones/SecActividad'

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

// Botón de navegación con badge opcional (cola por responder / disputas abiertas).
function NavBtn({
  onClick,
  activo,
  Ico,
  label,
  badge,
  tono = 'crit',
}: {
  onClick: () => void
  activo: boolean
  Ico: LucideIcon
  label: string
  badge?: number
  tono?: 'crit' | 'warn'
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-lg border px-3.5 py-2.5 text-[14px] font-medium transition ${
        activo
          ? 'border-[color-mix(in_srgb,var(--accent)_50%,transparent)] bg-[var(--accent-soft)] text-[var(--accent)]'
          : 'border-[var(--line)] text-[var(--ink-2)] hover:bg-[var(--panel-2)] hover:text-[var(--ink)]'
      }`}
    >
      <Ico size={17} strokeWidth={1.75} />
      {label}
      {badge != null && badge > 0 && (
        <span
          className="min-w-[18px] rounded-full px-1.5 text-center text-[11px] font-semibold tabular-nums text-white"
          style={{ background: tono === 'crit' ? 'var(--crit)' : 'var(--warn)' }}
        >
          {badge}
        </span>
      )}
    </button>
  )
}

export default function DashboardShell({
  data,
  rango,
  desde,
  hasta,
  tabInicial,
  userEmail,
  rol,
  tiendas = [],
}: {
  data: DashboardData
  rango: { min: string; max: string }
  desde: string
  hasta: string
  tabInicial?: string
  userEmail?: string
  rol?: Rol | null
  tiendas?: TiendaSelector[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const tabValido = TABS.some((t) => t.key === tabInicial) || tabInicial === TAB_PEDIDO.key
  const [tab, setTab] = useState<string>(tabValido ? (tabInicial as string) : 'ejecutivo')
  const [d1, setD1] = useState(desde)
  const [d2, setD2] = useState(hasta)
  const [dashOpen, setDashOpen] = useState(false)
  // ---- Selector de tienda (H2): la plataforma opera varias tiendas del holding.
  // Lorentina es el tenant cero; las demás muestran su estado de conexión hasta
  // que el onboarding las aprovisione (sus datos y workflows aún no existen).
  const [tiendaId, setTiendaId] = useState<string>(TIENDA_LORENTINA)
  const [tiendaOpen, setTiendaOpen] = useState(false)
  const tiendaActiva = tiendas.find((t) => t.id === tiendaId)
  const tiendaLista = tiendaActiva ? tiendaActiva.aprovisionada : true
  const esPedido = tab === TAB_PEDIDO.key
  // El filtro de fecha solo tiene sentido en las vistas analíticas (Dashboard).
  const esAnalitico = tab !== TAB_PEDIDO.key && tab !== 'disputas' && tab !== 'config' && tab !== 'redes' && tab !== 'actividad'

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
  // Cuál caso de la cola está abierto en el panel derecho (para resaltarlo).
  const [bandejaSelId, setBandejaSelId] = useState<string | null>(null)
  const abrirBandeja = () => {
    setTab(TAB_PEDIDO.key)
    setBuscado('')
    setModoBandeja(true)
    setDrill(null)
    setPedidoSel(null)
    setBandejaSelId(null)
    cargarBandeja(bandejaBucket)
  }
  const cambiarBucket = (bucket: BandejaBucket) => {
    setBandejaBucket(bucket)
    cargarBandeja(bucket)
  }
  // En la Bandeja, abrir un caso resalta su fila y llena el panel — sin salir de la cola.
  const verPedidoBandeja = (order: string) => {
    setBandejaSelId(order)
    verPedido(order)
  }
  const verCasoBandeja = (id: string) => {
    setBandejaSelId(id)
    verCaso(id)
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
  const [disputasResumen, setDisputasResumen] = useState<ResumenDisputas>({
    abiertas: 0,
    montoAbierto: 0,
    ganadas: 0,
    montoGanado: 0,
    perdidas: 0,
    montoPerdido: 0,
    cerradas: 0,
  })
  const cargarDisputas = (b: DisputaBucket) => {
    startCarga(async () => {
      const [items, counts, resumen] = await Promise.all([
        accionDisputas(b),
        accionDisputasCounts(),
        accionDisputasResumen(),
      ])
      setDisputas(items)
      setDisputasCounts(counts)
      setDisputasResumen(resumen)
    })
  }
  // Los contadores se cargan al montar, no al entrar a la sección: los badges del menú
  // avisan de casos por responder o disputas abiertas aunque el SAC no haya entrado ahí.
  const [redesPend, setRedesPend] = useState(0)
  useEffect(() => {
    accionDisputasCounts().then(setDisputasCounts).catch(() => {})
    accionBandejaCounts().then(setBandejaCounts).catch(() => {})
    accionRedesCounts().then((c) => setRedesPend(c.pendientes)).catch(() => {})
  }, [])

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
            <div className="relative flex flex-col justify-center gap-0.5">
              <button
                onClick={() => setTiendaOpen((v) => !v)}
                title="Cambiar de tienda"
                className="flex items-center gap-2.5 rounded-lg px-1 py-0.5 text-left transition hover:bg-[var(--panel-2)]"
              >
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--accent)] text-[15px] font-semibold text-[var(--bg)]">
                  {(tiendaActiva?.nombre ?? 'Lorentina').charAt(0)}
                </span>
                <span className="hidden flex-col sm:flex">
                  <span className="flex items-center gap-1 text-[15px] font-semibold tracking-tight text-[var(--ink)]">
                    Centro SAC
                    {tiendas.length > 1 && <ChevronDown size={14} className={`text-[var(--ink-3)] transition ${tiendaOpen ? 'rotate-180' : ''}`} />}
                  </span>
                  <span className="whitespace-nowrap text-[11px] text-[var(--ink-3)]">
                    {tiendaActiva ? `${tiendaActiva.nombre} · ${tiendaActiva.empresa}` : 'Lorentina'}
                  </span>
                </span>
              </button>
              {tiendaOpen && tiendas.length > 1 && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setTiendaOpen(false)} />
                  <div className="absolute left-0 top-full z-30 mt-1.5 w-64 rounded-xl border border-[var(--line-2)] bg-[var(--panel)] p-1.5 shadow-xl">
                    <p className="px-3 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--ink-3)]">
                      Tiendas de {tiendaActiva?.empresa || 'la empresa'}
                    </p>
                    {tiendas.map((t) => {
                      const on = t.id === tiendaId
                      return (
                        <button
                          key={t.id}
                          onClick={() => {
                            setTiendaId(t.id)
                            setTiendaOpen(false)
                          }}
                          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] transition ${
                            on ? 'bg-[var(--accent-soft)] font-medium text-[var(--ink)]' : 'text-[var(--ink-2)] hover:bg-[var(--panel-2)] hover:text-[var(--ink)]'
                          }`}
                        >
                          <Store size={17} strokeWidth={1.75} className={on ? 'text-[var(--accent)]' : 'text-[var(--ink-3)]'} />
                          <span className="flex-1 text-left">{t.nombre}</span>
                          {!t.aprovisionada && (
                            <span className="rounded-full border border-[var(--line-2)] px-2 py-0.5 text-[10px] text-[var(--ink-3)]">
                              sin conectar
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
            <span className="hidden w-px self-stretch bg-[var(--line-2)] sm:block" />

            {/* ZONA OPERATIVA — el día a día del SAC, protagonista */}
            <nav className="flex items-center gap-1.5">
              <NavBtn onClick={abrirBandeja} activo={esPedido && modoBandeja} Ico={Inbox} label="Bandeja" badge={bandejaCounts.por_responder} tono="crit" />
              <NavBtn onClick={() => setTab('redes')} activo={tab === 'redes'} Ico={MessageCircle} label="Redes" badge={redesPend} tono="warn" />
              <NavBtn
                onClick={abrirDisputas}
                activo={tab === 'disputas'}
                Ico={Gavel}
                label="Disputas"
                badge={disputasCounts.por_responder + disputasCounts.en_revision}
                tono={disputasCounts.por_responder > 0 ? 'crit' : 'warn'}
              />
              <NavBtn
                onClick={() => {
                  setTab(TAB_PEDIDO.key)
                  setDrill(null)
                  setModoBandeja(false)
                  setPedidoSel(null)
                }}
                activo={esPedido && !modoBandeja}
                Ico={Search}
                label="Buscar pedido"
              />
            </nav>

            <span className="hidden w-px self-stretch bg-[var(--line-2)] sm:block" />

            {/* ZONA ANALÍTICA — el Dashboard (agrupado) + Config */}
            <nav className="flex items-center gap-1.5">
              <div className="relative">
                <button
                  onClick={() => setDashOpen((v) => !v)}
                  className={`flex items-center gap-2 rounded-lg border px-3.5 py-2.5 text-[14px] font-medium transition ${
                    !esPedido && tab !== 'config'
                      ? 'border-[color-mix(in_srgb,var(--accent)_50%,transparent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                      : 'border-[var(--line)] text-[var(--ink-2)] hover:bg-[var(--panel-2)] hover:text-[var(--ink)]'
                  }`}
                >
                  <LayoutGrid size={17} strokeWidth={1.75} />
                  Dashboard
                  {!esPedido && tab !== 'config' && <span className="hidden text-[var(--ink-3)] md:inline">· {actual.label}</span>}
                  <ChevronDown size={15} className={`transition ${dashOpen ? 'rotate-180' : ''}`} />
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

              <NavBtn onClick={() => setTab('actividad')} activo={tab === 'actividad'} Ico={History} label="Actividad" />
              {puede(rol ?? null, 'supervisor') && (
                <NavBtn onClick={abrirConfig} activo={tab === 'config'} Ico={Settings} label="Config" />
              )}
            </nav>
            <span className="hidden w-px self-stretch bg-[var(--line-2)] sm:block" />

            <div className="ml-auto flex flex-wrap items-center gap-3">
              <div className={`flex flex-wrap items-center gap-2 text-[13px] ${esAnalitico ? '' : 'hidden'}`}>
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
          {!tiendaLista ? (
            // La tienda existe en la plataforma pero aún no fue aprovisionada: sus
            // workflows y credenciales se conectan en el onboarding. Nada que mostrar
            // todavía — y jamás datos de otra tienda.
            <div className="grid h-full place-items-center">
              <div className="max-w-md rounded-2xl border border-dashed border-[var(--line-2)] bg-[var(--panel)] p-10 text-center">
                <PlugZap size={30} className="mx-auto mb-3 text-[var(--ink-3)]" strokeWidth={1.5} />
                <p className="text-[15px] font-semibold text-[var(--ink)]">{tiendaActiva?.nombre} todavía no está conectada</p>
                <p className="mt-2 text-[13px] leading-relaxed text-[var(--ink-3)]">
                  Esta tienda es parte de {tiendaActiva?.empresa}, pero sus servicios (correo, tracking, redes, pagos)
                  aún no se aprovisionaron. Cuando pase por el onboarding, sus casos van a aparecer acá — separados
                  del resto de las tiendas.
                </p>
                <button
                  onClick={() => setTiendaId(TIENDA_LORENTINA)}
                  className="mt-5 rounded-lg border border-[var(--line)] px-4 py-2 text-[13px] font-medium text-[var(--ink-2)] transition hover:bg-[var(--panel-2)] hover:text-[var(--ink)]"
                >
                  Volver a Lorentina
                </button>
              </div>
            </div>
          ) : tab === 'actividad' ? (
            <SecActividad
              onVerPedido={(order) => {
                setTab(TAB_PEDIDO.key)
                setModoBandeja(false)
                setDrill(null)
                setBuscado(order)
                verPedido(order)
              }}
            />
          ) : tab === 'redes' ? (
            <SecRedes />
          ) : tab === 'disputas' ? (
            <SecDisputas
              items={disputas}
              bucket={disputaBucket}
              counts={disputasCounts}
              resumen={disputasResumen}
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
            modoBandeja ? (
              // Master-detail: la cola queda fija a la izquierda y el caso se abre a la
              // derecha sin perderla. Seleccionar otro caso cambia el panel al instante.
              <div className="grid h-full min-h-0 gap-4 lg:grid-cols-[minmax(320px,380px)_minmax(0,1fr)]">
                <div className="min-h-0 lg:h-full lg:overflow-hidden">
                  <SecBandeja
                    items={bandejaItems}
                    bucket={bandejaBucket}
                    counts={bandejaCounts}
                    seleccionado={bandejaSelId}
                    onCambiarBucket={cambiarBucket}
                    onVer={verPedidoBandeja}
                    onAbrirCaso={verCasoBandeja}
                    onCerrar={cerrarCaso}
                    onDescartar={descartarCorreo}
                  />
                </div>
                <div className="min-h-0 min-w-0 lg:h-full lg:overflow-y-auto">
                  {pedidoSel ? (
                    <SecPedido
                      pedido={pedidoSel}
                      lista={null}
                      causa=""
                      desenlace=""
                      rango={`${fmtFecha(desde)} – ${fmtFecha(hasta)}`}
                      buscado=""
                      pending={cargando}
                      productos={data.productos}
                      rol={rol ?? null}
                      enPanel
                      onVerPedido={verPedido}
                      onBuscar={buscarPedido}
                    />
                  ) : (
                    <div className="grid h-full place-items-center rounded-2xl border border-dashed border-[var(--line-2)] bg-[var(--panel)] p-10 text-center">
                      <div>
                        <Inbox size={28} className="mx-auto mb-2 text-[var(--ink-3)]" strokeWidth={1.5} />
                        <p className="text-[14px] font-medium text-[var(--ink-2)]">Elegí un caso de la cola</p>
                        <p className="mt-1 text-[12px] text-[var(--ink-3)]">Se abre acá con el pedido, el hilo y el borrador — sin perder la lista.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <SecPedido
                pedido={pedidoSel}
                lista={drill?.lista ?? null}
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
