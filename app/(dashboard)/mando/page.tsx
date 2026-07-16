import { getDashboardData, getRangoDisponible, MOTIVO_LABEL } from '@/lib/supabase/queries'
import { fmtCLP, agrupar } from '@/lib/format'

function addDays(iso: string, days: number) {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}
function fmtFecha(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}
function fmtMes(ym: string) {
  const [y, m] = ym.split('-')
  return `${m}/${y}`
}

type Estado = 'ok' | 'warn' | 'crit' | 'neutral'
const COL: Record<Estado, { color: string; border: string; bg: string }> = {
  ok: { color: 'var(--ok)', border: 'var(--ok)', bg: 'var(--ok-bg)' },
  warn: { color: 'var(--warn)', border: 'var(--warn)', bg: 'var(--warn-bg)' },
  crit: { color: 'var(--crit)', border: 'var(--crit)', bg: 'var(--crit-bg)' },
  neutral: { color: 'var(--ink)', border: 'var(--line)', bg: 'var(--panel)' },
}

function Kpi({
  label,
  value,
  unit,
  estado,
  sub,
  gauge,
  delta,
}: {
  label: string
  value: string
  unit?: string
  estado: Estado
  sub?: string
  gauge?: number
  delta?: { up: boolean; txt: string }
}) {
  const c = COL[estado]
  const isColored = estado !== 'neutral'
  return (
    <div
      className="rounded-2xl border p-4"
      style={{ borderColor: isColored ? c.border : 'var(--line)', background: isColored ? c.bg : 'var(--panel)' }}
    >
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-medium" style={{ color: isColored ? c.color : 'var(--ink-2)' }}>
          {label}
        </p>
        {isColored && <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />}
      </div>
      <div
        className="mt-1.5 font-serif text-[32px] font-semibold leading-none tabular-nums"
        style={{ color: isColored ? c.color : 'var(--ink)' }}
      >
        {value}
        {unit && <span className="text-lg">{unit}</span>}
      </div>
      {gauge != null && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--line)]">
          <div className="h-full rounded-full" style={{ width: `${Math.min(Math.max(gauge, 0), 100)}%`, background: c.color }} />
        </div>
      )}
      {sub && <p className="mt-1.5 text-[11px] leading-tight text-[var(--ink-3)]">{sub}</p>}
      {delta && (
        <p className="mt-1 text-[11px] font-semibold" style={{ color: delta.up ? 'var(--crit)' : 'var(--ok)' }}>
          {delta.up ? '▲' : '▼'} {delta.txt} vs período previo
        </p>
      )}
    </div>
  )
}

function SectionTitle({ n, title }: { n: string; title: string }) {
  return (
    <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--ink-3)]">
      <span className="text-[var(--accent)]">{n}</span>
      <span>{title}</span>
      <span className="h-px flex-1 bg-[var(--line)]" />
    </div>
  )
}

export default async function MandoPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string }>
}) {
  const sp = await searchParams
  const rango = await getRangoDisponible()
  const desde = sp.desde || rango.min
  const hasta = sp.hasta || rango.max
  const data = await getDashboardData(desde, hasta)
  const a = data.analitica

  const presets = [
    { label: 'Todo', desde: rango.min, hasta: rango.max },
    { label: '30 días', desde: addDays(rango.max, -30), hasta: rango.max },
    { label: '90 días', desde: addDays(rango.max, -90), hasta: rango.max },
  ]

  const est = (v: number, warn: number, crit: number): Estado => (v >= crit ? 'crit' : v >= warn ? 'warn' : 'ok')
  const estInv = (v: number, warn: number, crit: number): Estado => (v <= crit ? 'crit' : v <= warn ? 'warn' : 'ok')

  const pctProblema = data.resumen.pctProblema
  const expired = data.kpis.pctExpired ?? 0
  const criticos = data.embudo.criticas

  // trend
  const maxMes = Math.max(...data.reembolsosPorMes.map((r) => r.total), 1)
  // reembolso $
  const maxReemb = Math.max(data.reembolso.montoSolicitado, 1)
  const reembFilas = [
    { label: 'Solicitado', n: data.reembolso.montoSolicitado, color: 'var(--warn)' },
    { label: 'Pagado', n: data.reembolso.montoPagado, color: 'var(--ok)' },
    { label: 'Falta por pagar', n: data.reembolso.montoFalta, color: 'var(--crit)' },
  ]
  // causa raíz
  const topMotivos = [...data.motivos].slice(0, 5)
  const maxMotivo = Math.max(...topMotivos.map((m) => m.pct), 1)
  // productos a decidir
  const apagar = data.productos
    .filter((p) => p.estado_playbook === 'apagar' && p.pedidos >= 3)
    .sort((x, y) => y.monto_reembolsado - x.monto_reembolsado || y.pct_reclamo - x.pct_reclamo)
  const vigilar = data.productos
    .filter((p) => p.estado_playbook === 'vigilar' && p.pedidos >= 3)
    .sort((x, y) => y.monto_reembolsado - x.monto_reembolsado)

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-[var(--ink)]">Sala de Mando · KPIs</h1>
          <p className="text-xs text-[var(--ink-3)]">
            {fmtFecha(desde)} — {fmtFecha(hasta)} · {agrupar(data.resumen.totalPedidos)} pedidos ·{' '}
            {fmtCLP(a.totalVentas)} en ventas
          </p>
        </div>
        <a
          href={`/?desde=${desde}&hasta=${hasta}`}
          className="rounded-full bg-[var(--accent)] px-3.5 py-1.5 text-[12px] font-semibold text-white"
        >
          Ver detalle →
        </a>
      </div>

      {/* Filtro por fecha de pedido */}
      <form method="get" className="flex flex-wrap items-end gap-3 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-3)]">Pedidos desde</label>
          <input
            type="date"
            name="desde"
            defaultValue={desde}
            min={rango.min}
            max={rango.max}
            className="rounded-lg border border-[var(--line-2)] bg-[var(--panel-2)] px-2.5 py-1.5 text-[13px] text-[var(--ink)]"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-3)]">hasta</label>
          <input
            type="date"
            name="hasta"
            defaultValue={hasta}
            min={rango.min}
            max={rango.max}
            className="rounded-lg border border-[var(--line-2)] bg-[var(--panel-2)] px-2.5 py-1.5 text-[13px] text-[var(--ink)]"
          />
        </div>
        <button type="submit" className="rounded-lg bg-[var(--accent)] px-3.5 py-1.5 text-[13px] font-semibold text-white">
          Filtrar
        </button>
        <div className="ml-auto flex flex-wrap gap-1.5">
          {presets.map((p) => (
            <a
              key={p.label}
              href={`/mando?desde=${p.desde}&hasta=${p.hasta}`}
              className="rounded-full border border-[var(--line-2)] px-3 py-1 text-[12px] text-[var(--ink-2)] hover:bg-[var(--panel-2)]"
            >
              {p.label}
            </a>
          ))}
        </div>
        <p className="w-full text-[11px] text-[var(--ink-3)]">
          Los KPIs se calculan sobre los pedidos con fecha de pedido en el rango elegido.
        </p>
      </form>

      {/* 01 Salud */}
      <div>
        <SectionTitle n="01" title="Salud del negocio" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi
            label="% Problema"
            value={`${pctProblema}`}
            unit="%"
            estado={est(pctProblema, 10, 20)}
            gauge={(pctProblema / 30) * 100}
            sub="pedidos con reclamo real"
            delta={data.resumen.deltaPct !== 0 ? { up: data.resumen.deltaPct > 0, txt: `${Math.abs(data.resumen.deltaPct)}pp` } : undefined}
          />
          <Kpi
            label="Devolución solicitada / ventas"
            value={`${a.tasaDevolucionSolicitada}`}
            unit="%"
            estado={est(a.tasaDevolucionSolicitada, 5, 10)}
            gauge={(a.tasaDevolucionSolicitada / 15) * 100}
            sub="$ de devolución pedida sobre las ventas"
          />
          <Kpi
            label="% Pedidos que piden devolución"
            value={`${a.pctPidenDevolucion}`}
            unit="%"
            estado={est(a.pctPidenDevolucion, 5, 12)}
            gauge={(a.pctPidenDevolucion / 20) * 100}
            sub={`${agrupar(data.reembolso.solicitados)} pedidos solicitaron reembolso`}
          />
          <Kpi
            label="Casos críticos"
            value={agrupar(criticos)}
            estado={criticos > 10 ? 'crit' : criticos > 0 ? 'warn' : 'ok'}
            sub="legal / SERNAC / disputa abiertos"
          />
        </div>
      </div>

      {/* 02 Plata y operación */}
      <div>
        <SectionTitle n="02" title="Plata y operación" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi label="Costo SAC por pedido" value={fmtCLP(a.costoPorPedido)} estado="neutral" sub="reembolsos ÷ total pedidos" />
          <Kpi label="Ticket promedio" value={fmtCLP(a.ticketPromedio)} estado="neutral" sub="valor medio de pedido" />
          <Kpi
            label="Cumplimiento reembolso $"
            value={`${data.reembolso.pctMontoPagado}`}
            unit="%"
            estado="neutral"
            gauge={data.reembolso.pctMontoPagado}
            sub={`${fmtCLP(data.reembolso.montoPagado)} de ${fmtCLP(data.reembolso.montoSolicitado)}`}
          />
          <Kpi
            label="% Expired envíos"
            value={`${expired}`}
            unit="%"
            estado={est(expired, 5, 15)}
            gauge={(expired / 20) * 100}
            sub={`mediana tránsito ${data.kpis.mediana ?? '—'} d`}
          />
        </div>
      </div>

      {/* 03 Tendencia + Pareto */}
      <div>
        <SectionTitle n="03" title="Tendencia y concentración" />
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Tendencia pérdida por mes */}
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
            <p className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-[var(--ink-3)]">
              Pérdida por mes · CLP
            </p>
            {data.reembolsosPorMes.length === 0 ? (
              <p className="text-xs text-[var(--ink-3)]">Sin reembolsos en este rango.</p>
            ) : (
              <div className="flex h-40 items-end gap-2">
                {data.reembolsosPorMes.map((r) => (
                  <div key={r.mes} className="flex flex-1 flex-col items-center gap-1">
                    <span className="font-mono text-[9px] text-[var(--ink-3)]">
                      {r.total >= 1000000 ? `${(r.total / 1000000).toFixed(1)}M` : `${Math.round(r.total / 1000)}k`}
                    </span>
                    <div
                      className="w-full rounded-t"
                      style={{ height: `${Math.max((r.total / maxMes) * 130, 3)}px`, background: 'var(--crit)' }}
                    />
                    <span className="font-mono text-[9px] text-[var(--ink-3)]">{fmtMes(r.mes)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pareto */}
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
            <p className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-[var(--ink-3)]">
              Concentración de devoluciones solicitadas (80/20)
            </p>
            {a.paretoTotalProductos === 0 ? (
              <p className="text-xs text-[var(--ink-3)]">Sin devoluciones solicitadas en este rango.</p>
            ) : (
              <>
                <div className="font-serif text-4xl font-semibold text-[var(--crit)] tabular-nums">
                  {agrupar(a.paretoProductos)}
                  <span className="text-xl text-[var(--ink-3)]"> / {agrupar(a.paretoTotalProductos)}</span>
                </div>
                <p className="mt-1 text-[13px] text-[var(--ink-2)]">
                  productos ({a.paretoPctProductos}%) concentran el <b>80%</b> de las devoluciones solicitadas.
                </p>
                <div className="mt-4 flex h-6 overflow-hidden rounded-lg" style={{ gap: 2 }}>
                  <div
                    className="flex items-center justify-center text-[11px] font-semibold text-white"
                    style={{ width: `${a.paretoPctProductos}%`, background: 'var(--crit)', minWidth: 40 }}
                  >
                    80%
                  </div>
                  <div
                    className="flex items-center justify-center text-[11px] text-[var(--ink-2)]"
                    style={{ width: `${100 - a.paretoPctProductos}%`, background: 'var(--line)' }}
                  >
                    20%
                  </div>
                </div>
                <p className="mt-3 text-[11px] text-[var(--ink-3)]">
                  Atacando esos {agrupar(a.paretoProductos)} productos cortás la mayor parte de las solicitudes de devolución.
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 04 Reembolsos en $ */}
      <div>
        <SectionTitle n="04" title="Reembolsos en $ · solicitado vs pagado vs falta" />
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
          <div className="flex flex-col gap-2.5">
            {reembFilas.map((f) => (
              <div key={f.label} className="flex items-center gap-3">
                <span className="w-32 flex-none text-right text-[13px] text-[var(--ink-2)]">{f.label}</span>
                <div className="relative h-9 flex-1">
                  <div
                    className="flex h-full items-center rounded-lg px-3 text-white"
                    style={{ width: `${Math.max((f.n / maxReemb) * 100, 6)}%`, background: f.color, minWidth: 90 }}
                  >
                    <span className="font-serif text-base font-semibold tabular-nums">{fmtCLP(f.n)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 border-t border-[var(--line)] pt-2.5 text-[11px] text-[var(--ink-3)]">
            {agrupar(data.reembolso.solicitados)} pedidos pidieron reembolso por {fmtCLP(data.reembolso.montoSolicitado)}.
            Se pagó {fmtCLP(data.reembolso.montoPagado)} ({data.reembolso.pctMontoPagado}%); falta{' '}
            {fmtCLP(data.reembolso.montoFalta)}.
          </p>
        </div>
      </div>

      {/* 05 Causa raíz */}
      <div>
        <SectionTitle n="05" title="Causa raíz · por qué reclaman" />
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
          {topMotivos.length === 0 ? (
            <p className="text-xs text-[var(--ink-3)]">Sin reclamos en este rango.</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {topMotivos.map((m) => {
                const esAduana = m.motivo === 'no_llego_aduana'
                const esCalidad = ['calidad_material', 'roto_costura', 'foto_distinta', 'producto_equivocado'].includes(m.motivo)
                const color = esAduana ? 'var(--crit)' : esCalidad ? 'var(--warn)' : 'var(--ink-3)'
                return (
                  <div key={m.motivo} className="flex items-center gap-3 text-sm">
                    <span className="w-44 flex-none truncate text-[var(--ink-2)]">{MOTIVO_LABEL[m.motivo] || m.motivo}</span>
                    <span className="h-3.5 flex-1 overflow-hidden rounded-full bg-[var(--line)]">
                      <span className="block h-full rounded-full" style={{ width: `${(m.pct / maxMotivo) * 100}%`, background: color }} />
                    </span>
                    <span className="w-12 flex-none text-right font-mono text-xs tabular-nums text-[var(--ink)]">{m.pct}%</span>
                  </div>
                )
              })}
            </div>
          )}
          <p className="mt-3 border-t border-[var(--line)] pt-2.5 text-[11px] text-[var(--ink-3)]">
            <b className="text-[var(--crit)]">■</b> Aduana/envío (logística) &nbsp;
            <b className="text-[var(--warn)]">■</b> Calidad/producto &nbsp;
            <b className="text-[var(--ink-3)]">■</b> Gestión/otros
          </p>
        </div>
      </div>

      {/* 06 Productos a decidir */}
      <div>
        <SectionTitle n="06" title="Productos a decidir" />
        <div className="grid gap-4 lg:grid-cols-2">
          <DecisionList title="Apagar ya" hint="pasan el umbral crítico de reclamo" items={apagar} estado="crit" />
          <DecisionList title="Vigilar" hint="cerca del umbral, seguir de cerca" items={vigilar} estado="warn" />
        </div>
      </div>
    </div>
  )
}

function DecisionList({
  title,
  hint,
  items,
  estado,
}: {
  title: string
  hint: string
  items: { product_id: string; producto_titulo: string; monto_reembolsado: number; pct_reclamo: number; pedidos: number }[]
  estado: Estado
}) {
  const c = COL[estado]
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
      <div className="mb-1 flex items-center gap-2">
        <span className="rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide" style={{ background: c.bg, color: c.color }}>
          {title}
        </span>
        <span className="text-[11px] text-[var(--ink-3)]">{hint}</span>
      </div>
      {items.length === 0 ? (
        <p className="mt-2 text-xs text-[var(--ink-3)]">Ninguno en este rango. 👍</p>
      ) : (
        <div className="mt-2 flex flex-col">
          {items.slice(0, 8).map((p) => (
            <div key={p.product_id} className="flex items-center justify-between gap-2 border-b border-[var(--line)] py-2 last:border-0">
              <span className="min-w-0 truncate text-[13.5px] text-[var(--ink)]">{p.producto_titulo || '—'}</span>
              <span className="flex flex-none items-center gap-3 font-mono text-xs tabular-nums">
                <span style={{ color: c.color }}>{p.pct_reclamo}%</span>
                <span className="text-[var(--ink-3)]">{p.pedidos} ped.</span>
                <span className="w-20 text-right text-[var(--ink)]">{fmtCLP(p.monto_reembolsado)}</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
