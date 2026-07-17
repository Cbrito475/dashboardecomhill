import {
  getDashboardData,
  getRangoDisponible,
  MOTIVO_LABEL,
  ESTADO_LABEL,
  ESTADO_SUB,
  ESTADO_COLOR,
  ENVIO_LABEL,
  DESENLACE_LABEL,
  type EstadoPedido,
} from '@/lib/supabase/queries'
import { fmtCLP, agrupar, fmtDec } from '@/lib/format'

function addDays(iso: string, days: number) {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}
function fmtFecha(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

// Familia de la causa -> color. Aduana/envio es rojo (logistica), calidad/producto
// ambar, gestion gris. Encapsula el "de que tipo" en un vistazo cromatico.
const CAUSA_CALIDAD = new Set([
  'calidad_material',
  'roto_costura',
  'foto_distinta',
  'producto_equivocado',
  'talla',
])
function causaColor(m: string): string {
  if (m === 'no_llego_aduana') return 'var(--crit)'
  if (CAUSA_CALIDAD.has(m)) return 'var(--warn)'
  return 'var(--ink-3)'
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string }>
}) {
  const sp = await searchParams
  const rango = await getRangoDisponible()
  const desde = sp.desde || rango.min
  const hasta = sp.hasta || rango.max
  const data = await getDashboardData(desde, hasta)

  const R = data.resumen
  const uni = R.totalPedidos || 1
  const pctReclamo = Math.round((R.pedidosConReclamo / uni) * 1000) / 10

  // Embudo: del universo de pedidos al caso critico. La MAGNITUD de un vistazo.
  const funnel = [
    { label: 'Pedidos del período', n: R.totalPedidos, color: 'var(--ink-2)' },
    { label: 'Escribieron al SAC', n: R.pedidosConContacto, color: 'var(--accent)' },
    { label: 'Con reclamo real', n: R.pedidosConReclamo, color: 'var(--warn)' },
    { label: 'Casos críticos', n: R.pedidosCriticos, color: 'var(--crit)' },
  ]

  // Causa raíz (de qué reclaman) — ya viene 1 pedido = 1 causa.
  const causas = data.causas.filter((c) => c.motivo !== 'consulta_estado').slice(0, 11)
  const maxCausa = Math.max(...causas.map((c) => c.n), 1)

  // Desenlace (qué piden): reembolso / cambio / nada.
  const desenlaces = data.desenlaces
  const maxDes = Math.max(...desenlaces.map((d) => d.n), 1)

  // Envío: dónde falla la logística. Ordenado por % que reclama, con dato real.
  const envioReales = data.envio.filter((e) => e.status !== 'sin_dato' && e.status !== 'sin_tracking' && e.n >= 15)
  const tasaEnvioBase =
    envioReales.reduce((a, e) => a + e.reclamo, 0) / Math.max(envioReales.reduce((a, e) => a + e.n, 0), 1) * 100
  const envioTop = [...envioReales].sort((a, b) => b.pctReclamo - a.pctReclamo).slice(0, 5)

  const estados = data.estadoPedidos
  const estadoConContacto = estados.filter((e) => e.estado !== 'sin_contacto')

  const presets = [
    { label: 'Todo', desde: rango.min, hasta: rango.max },
    { label: '30d', desde: addDays(rango.max, -30), hasta: rango.max },
    { label: '90d', desde: addDays(rango.max, -90), hasta: rango.max },
  ]
  const esActivo = (p: (typeof presets)[number]) => p.desde === desde && p.hasta === hasta

  return (
    <div className="flex flex-col gap-3 lg:h-[calc(100vh-5.5rem)] lg:overflow-hidden">
      {/* Barra de filtro — delgada */}
      <form method="get" className="flex flex-none flex-wrap items-center gap-2 text-[13px]">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-3)]">Período</span>
        {presets.map((p) => (
          <a
            key={p.label}
            href={`/?desde=${p.desde}&hasta=${p.hasta}`}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
              esActivo(p)
                ? 'bg-[var(--accent)] text-white'
                : 'border border-[var(--line)] text-[var(--ink-2)] hover:bg-[var(--panel-2)]'
            }`}
          >
            {p.label}
          </a>
        ))}
        <span className="mx-1 h-4 w-px bg-[var(--line)]" />
        <input type="date" name="desde" defaultValue={desde} className="rounded-lg border border-[var(--line)] bg-[var(--panel)] px-2 py-1 text-xs text-[var(--ink)]" />
        <span className="text-[var(--ink-3)]">→</span>
        <input type="date" name="hasta" defaultValue={hasta} className="rounded-lg border border-[var(--line)] bg-[var(--panel)] px-2 py-1 text-xs text-[var(--ink)]" />
        <button type="submit" className="rounded-lg bg-[var(--ink)] px-3 py-1 text-xs font-semibold text-[var(--bg)]">
          Ver
        </button>
        <span className="ml-auto text-[11px] text-[var(--ink-3)]">
          {fmtFecha(desde)} – {fmtFecha(hasta)} · según fecha del pedido ·{' '}
          <a href="/detalle" className="font-semibold text-[var(--accent)] hover:underline">
            ver detalle completo →
          </a>
        </span>
      </form>

      {/* Grilla principal — 3 columnas, ocupa el resto de la pantalla */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-12">
        {/* ---------- MAGNITUD ---------- */}
        <section className="flex min-h-0 flex-col gap-3 lg:col-span-3">
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-3)]">
              Magnitud del reclamo
            </p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-serif text-5xl font-semibold text-[var(--crit)] tabular-nums">{fmtDec(pctReclamo)}%</span>
              <span className="text-xs text-[var(--ink-3)]">de los pedidos</span>
            </div>
            <p className="mt-1 text-[13px] text-[var(--ink-2)]">
              <b className="text-[var(--ink)]">{agrupar(R.pedidosConReclamo)}</b> de {agrupar(R.totalPedidos)} pedidos
              tuvieron un reclamo real.
            </p>
            {R.deltaPct !== 0 && (
              <p className="mt-1 text-[11px]" style={{ color: R.deltaPct > 0 ? 'var(--crit)' : 'var(--ok)' }}>
                {R.deltaPct > 0 ? '▲' : '▼'} {fmtDec(Math.abs(R.deltaPct))} pp vs período anterior
              </p>
            )}
          </div>

          {/* Embudo horizontal */}
          <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-3)]">
              Del universo al caso crítico
            </p>
            <div className="flex flex-1 flex-col justify-around gap-2">
              {funnel.map((f, i) => {
                const pct = (f.n / uni) * 100
                return (
                  <div key={f.label}>
                    <div className="flex items-baseline justify-between text-[12px]">
                      <span className="text-[var(--ink-2)]">{f.label}</span>
                      <span className="font-mono tabular-nums text-[var(--ink)]">
                        {agrupar(f.n)}
                        <span className="ml-1 text-[10px] text-[var(--ink-3)]">{fmtDec(pct)}%</span>
                      </span>
                    </div>
                    <div className="mt-1 h-3 overflow-hidden rounded bg-[var(--line)]">
                      <div className="h-full rounded" style={{ width: `${Math.max(pct, 0.6)}%`, background: f.color }} />
                    </div>
                    {i < funnel.length - 1 && (
                      <p className="mt-0.5 text-right text-[10px] text-[var(--ink-3)]">
                        ↓ {fmtDec((funnel[i + 1].n / (f.n || 1)) * 100)}% pasa al siguiente
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-3)]">Plata devuelta</p>
            <p className="mt-1 font-serif text-3xl font-semibold text-[var(--crit)] tabular-nums">{fmtCLP(R.perdidaTotal)}</p>
            <p className="mt-0.5 text-[11px] text-[var(--ink-3)]">reembolsos de pedidos del período</p>
          </div>
        </section>

        {/* ---------- TIPO: CAUSA RAÍZ ---------- */}
        <section className="flex min-h-0 flex-col rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4 lg:col-span-5">
          <div className="mb-1 flex items-baseline justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-3)]">
              De qué reclaman · causa raíz
            </p>
            <p className="text-[11px] text-[var(--ink-3)]">1 pedido = 1 causa</p>
          </div>
          <div className="flex flex-1 flex-col justify-between gap-1.5 pt-1">
            {causas.map((c) => (
              <div key={c.motivo} className="flex items-center gap-2.5 text-[13px]">
                <span className="w-40 flex-none truncate text-[var(--ink-2)]" title={MOTIVO_LABEL[c.motivo] || c.motivo}>
                  {MOTIVO_LABEL[c.motivo] || c.motivo}
                </span>
                <span className="h-4 flex-1 overflow-hidden rounded bg-[var(--line)]">
                  <span className="block h-full rounded" style={{ width: `${(c.n / maxCausa) * 100}%`, background: causaColor(c.motivo) }} />
                </span>
                <span className="w-20 flex-none text-right font-mono text-xs tabular-nums text-[var(--ink)]">
                  {agrupar(c.n)}
                  <span className="ml-1 text-[10px] text-[var(--ink-3)]">{fmtDec(c.pct)}%</span>
                </span>
              </div>
            ))}
          </div>
          <p className="mt-2 flex-none border-t border-[var(--line)] pt-2 text-[11px] text-[var(--ink-3)]">
            <b className="text-[var(--crit)]">■</b> Aduana / envío &nbsp;
            <b className="text-[var(--warn)]">■</b> Calidad / producto &nbsp;
            <b className="text-[var(--ink-3)]">■</b> Gestión &nbsp;·&nbsp; la logística es el driver dominante.
          </p>
        </section>

        {/* ---------- TIPO: DESENLACE + ENVÍO ---------- */}
        <section className="flex min-h-0 flex-col gap-3 lg:col-span-4">
          {/* Qué piden */}
          <div className="flex min-h-0 flex-col rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-3)]">
              Qué piden · desenlace
            </p>
            <div className="flex flex-col gap-2">
              {desenlaces.map((d) => {
                const color = d.tipo === 'reembolso' ? 'var(--crit)' : d.tipo === 'cambio' ? 'var(--warn)' : 'var(--ink-3)'
                return (
                  <div key={d.tipo} className="flex items-center gap-2.5 text-[13px]">
                    <span className="w-36 flex-none truncate text-[var(--ink-2)]">{DESENLACE_LABEL[d.tipo] || d.tipo}</span>
                    <span className="h-4 flex-1 overflow-hidden rounded bg-[var(--line)]">
                      <span className="block h-full rounded" style={{ width: `${(d.n / maxDes) * 100}%`, background: color }} />
                    </span>
                    <span className="w-20 flex-none text-right font-mono text-xs tabular-nums text-[var(--ink)]">
                      {agrupar(d.n)}
                      <span className="ml-1 text-[10px] text-[var(--ink-3)]">{fmtDec(d.pct)}%</span>
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Dónde falla el envío */}
          <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4">
            <div className="mb-2 flex items-baseline justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-3)]">
                Dónde falla el envío
              </p>
              <p className="text-[10px] text-[var(--ink-3)]">promedio {fmtDec(tasaEnvioBase)}%</p>
            </div>
            {envioTop.length === 0 ? (
              <p className="text-xs text-[var(--ink-3)]">Aún sin datos de envío suficientes en este período.</p>
            ) : (
              <div className="flex flex-1 flex-col justify-around gap-1.5">
                {envioTop.map((e) => {
                  const alto = e.pctReclamo > tasaEnvioBase * 1.5
                  return (
                    <div key={e.status} className="flex items-center gap-2.5 text-[13px]">
                      <span className="w-28 flex-none truncate text-[var(--ink-2)]">{ENVIO_LABEL[e.status] || e.status}</span>
                      <span className="w-14 flex-none text-right font-mono text-xs tabular-nums text-[var(--ink-3)]">
                        {agrupar(e.n)}
                      </span>
                      <span className="w-16 flex-none text-right font-mono text-xs tabular-nums" style={{ color: alto ? 'var(--crit)' : 'var(--ink)' }}>
                        {fmtDec(e.pctReclamo)}%
                      </span>
                      {alto && (
                        <span className="rounded px-1 py-0.5 text-[9px] font-semibold text-[var(--crit)] ring-1 ring-[var(--crit)]/40">
                          {fmtDec(e.pctReclamo / (tasaEnvioBase || 1))}×
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Disputas — franja compacta */}
          <div className="flex flex-none items-center gap-4 rounded-2xl border border-[var(--line)] bg-[var(--panel)] px-4 py-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-3)]">Disputas al banco</p>
              <p className="text-[10px] text-[var(--ink-3)]">el peor desenlace</p>
            </div>
            {data.disputas.n === 0 ? (
              <p className="ml-auto text-right text-[11px] leading-tight text-[var(--ink-3)]">
                Sin disputas cargadas.
                <br />
                Falta la credencial Stripe de Lorentina.
              </p>
            ) : (
              <div className="ml-auto flex items-center gap-5 text-right">
                <div>
                  <p className="font-serif text-2xl font-semibold text-[var(--crit)] tabular-nums">{agrupar(data.disputas.n)}</p>
                  <p className="text-[10px] text-[var(--ink-3)]">pedidos</p>
                </div>
                <div>
                  <p className="font-serif text-2xl font-semibold text-[var(--crit)] tabular-nums">{fmtCLP(data.disputas.monto)}</p>
                  <p className="text-[10px] text-[var(--ink-3)]">en disputa</p>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
