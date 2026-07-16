import {
  getDashboardData,
  getRangoDisponible,
  getCoberturaEnlace,
  getClasificacion,
  MOTIVO_LABEL,
} from '@/lib/supabase/queries'
import CostoTabs from '@/components/CostoTabs'
import MatrizCausas from '@/components/MatrizCausas'
import ProductScatter from '@/components/ProductScatter'
import ProductTable from '@/components/ProductTable'
import { fmtCLP, agrupar } from '@/lib/format'

const BALDE_LABEL: Record<string, string> = {
  no_grave: 'Consulta / seguimiento',
  grave: 'Pide reembolso o reenvío',
  critico: 'Crítico · legal / SERNAC / disputa',
}
const BALDE_SUB: Record<string, string> = {
  no_grave: '"¿dónde está mi pedido?" — solo pregunta',
  grave: 'quiere que le devuelvan la plata o le reenvíen',
  critico: 'amenaza legal, SERNAC o disputa de pago',
}
const BALDE_COLOR: Record<string, string> = {
  no_grave: 'var(--ink-3)',
  grave: 'var(--crit)',
  critico: 'var(--crit-deep)',
}
const ORDEN_BALDE = ['no_grave', 'grave', 'critico']


const ETAPA_LABEL: Record<string, string> = {
  origen: 'En origen (China)',
  transito_nacional: 'En tránsito nacional',
  aduana: 'Aduana / aeropuerto CL',
  ultima_milla: 'Última milla / regional',
  sin_dato: 'Sin dato de etapa',
}
const ORDEN_ETAPA = ['aduana', 'transito_nacional', 'origen', 'ultima_milla', 'sin_dato']
const CANAL_LABEL: Record<string, string> = { mail: 'MAIL', stripe: 'STRIPE', paypal: 'PAYPAL' }

function SectionTitle({ n, title }: { n: string; title: string }) {
  return (
    <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--ink-3)]">
      <span className="text-[var(--accent)]">{n}</span>
      <span>{title}</span>
      <span className="h-px flex-1 bg-[var(--line)]" />
    </div>
  )
}

function addDays(iso: string, days: number) {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

// yyyy-MM-dd -> dd/MM/yyyy
function fmtFecha(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}
// yyyy-MM -> MM/yyyy
function fmtMes(ym: string) {
  const [y, m] = ym.split('-')
  return `${m}/${y}`
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

  const [data, cobertura, clasificacion] = await Promise.all([
    getDashboardData(desde, hasta),
    getCoberturaEnlace(desde, hasta),
    getClasificacion(desde, hasta),
  ])

  const CLASIF_META: Record<string, { label: string; color: string }> = {
    reclamo_con_pedido: { label: 'Reclamo con pedido', color: 'var(--ok)' },
    no_reclamo: { label: 'Ruido / sin pedido (no cuenta)', color: 'var(--ink-3)' },
    sin_pedido_identificable: { label: 'Sin pedido identificable', color: 'var(--warn)' },
    no_reclamo_automatico: { label: 'No-reclamo / automático', color: 'var(--ink-3)' },
    sin_clasificar: { label: 'Sin clasificar', color: 'var(--ink-3)' },
  }
  const clasifOrden = ['reclamo_con_pedido', 'no_reclamo', 'sin_pedido_identificable', 'no_reclamo_automatico', 'sin_clasificar']

  // Funnel del universo de pedidos
  const uni = data.resumen.totalPedidos || 1
  const funnel = [
    { label: 'Pedidos en el período', sub: 'universo total', n: data.resumen.totalPedidos, color: 'var(--ink-2)' },
    { label: 'Escribieron a SAC', sub: 'con algún contacto', n: data.resumen.pedidosConContacto, color: 'var(--accent)' },
    { label: 'Con reclamo real', sub: 'un problema, no solo consulta', n: data.resumen.pedidosConReclamo, color: 'var(--warn)' },
    { label: 'Casos críticos', sub: 'legal / SERNAC / disputa', n: data.resumen.pedidosCriticos, color: 'var(--crit)' },
  ]
  const clasifSorted = [...clasificacion].sort(
    (a, b) => clasifOrden.indexOf(a.clasificacion) - clasifOrden.indexOf(b.clasificacion)
  )
  const totalCorreos = clasificacion.reduce((a, c) => a + c.correos, 0)
  const totalConversaciones = clasificacion.reduce((a, c) => a + c.conversaciones, 0)

  const cobSegments = [
    { key: 'con_pedido', label: 'Con pedido asociado', n: cobertura.con_pedido, color: 'var(--ok)' },
    { key: 'ruido', label: 'Ruido', n: cobertura.nro_sin_pedido + cobertura.sin_nro, color: 'var(--ink-3)' },
  ]

  const presets = [
    { label: 'Todo lo cargado', desde: rango.min, hasta: rango.max },
    { label: 'Últimos 30 días', desde: addDays(rango.max, -30), hasta: rango.max },
    { label: 'Últimos 90 días', desde: addDays(rango.max, -90), hasta: rango.max },
  ]

  const totalCasos = data.severidad.no_grave + data.severidad.grave + data.severidad.critico
  const severidadOrdenada = ORDEN_BALDE.map((b) => ({
    balde: b,
    n: data.severidad[b as keyof typeof data.severidad],
  }))

  // Tabla ordenable (componente cliente): solo productos con volumen real (>=5 pedidos).
  const tablaProductos = data.productos.filter((p) => p.pedidos >= 5)

  const filasEmbudo = [
    { label: 'Interacciones de pedidos del período', n: data.embudo.total, color: 'var(--ink-3)' },
    { label: 'Abiertas', n: data.embudo.abiertas, color: 'var(--warn)' },
    { label: 'Críticas (legal/disputa)', n: data.embudo.criticas, color: 'var(--crit-deep)' },
  ]
  const maxEmbudo = Math.max(...filasEmbudo.map((f) => f.n), 1)

  const etapasOrdenadas = [...data.etapas].sort(
    (a, b) => ORDEN_ETAPA.indexOf(a.etapa) - ORDEN_ETAPA.indexOf(b.etapa)
  )
  const maxEtapa = Math.max(...data.etapas.map((e) => e.pct), 1)
  const maxReembolsoMes = Math.max(...data.reembolsosPorMes.map((r) => r.total), 1)

  return (
    <div className="flex flex-col gap-10">
      <form
        method="get"
        className="flex flex-wrap items-end gap-3 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4"
      >
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-3)]">
            Pedidos desde
          </label>
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
          <label className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-3)]">
            hasta
          </label>
          <input
            type="date"
            name="hasta"
            defaultValue={hasta}
            min={rango.min}
            max={rango.max}
            className="rounded-lg border border-[var(--line-2)] bg-[var(--panel-2)] px-2.5 py-1.5 text-[13px] text-[var(--ink)]"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-[var(--accent)] px-3.5 py-1.5 text-[13px] font-semibold text-white"
        >
          Filtrar
        </button>
        <div className="ml-auto flex flex-wrap gap-1.5">
          {presets.map((p) => (
            <a
              key={p.label}
              href={`?desde=${p.desde}&hasta=${p.hasta}`}
              className="rounded-full border border-[var(--line-2)] px-3 py-1 text-[12px] text-[var(--ink-2)] hover:bg-[var(--panel-2)]"
            >
              {p.label}
            </a>
          ))}
        </div>
        <p className="w-full text-[11px] text-[var(--ink-3)]">
          Filtrado por fecha del pedido (no del reclamo) · {fmtFecha(desde)} — {fmtFecha(hasta)} ·{' '}
          {agrupar(data.resumen.totalPedidos)} pedidos en el rango. Las interacciones que no
          se pudieron enlazar a un pedido quedan fuera de este análisis.
        </p>
      </form>

      {/* Cobertura de enlace reclamo -> pedido (global) */}
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
        <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold text-[var(--ink)]">
            Enlace reclamo → pedido · calidad del dato
          </h3>
          <span className="font-serif text-2xl font-semibold text-[var(--ok)] tabular-nums">
            {cobertura.pct_con_pedido}% con pedido
          </span>
        </div>
        <p className="mb-3 text-xs text-[var(--ink-3)]">
          De las {agrupar(cobertura.total)} interacciones recibidas en el período: cuántas son reclamo real
          (atado a un pedido) y cuántas son ruido.
        </p>
        <div className="flex h-9 overflow-hidden rounded-lg" style={{ gap: 2 }}>
          {cobSegments.map((s) => {
            const pct = cobertura.total > 0 ? (s.n / cobertura.total) * 100 : 0
            if (pct === 0) return null
            return (
              <div
                key={s.key}
                className="flex items-center justify-center text-[12px] font-semibold text-white"
                style={{ width: `${pct}%`, background: s.color }}
                title={`${s.label}: ${agrupar(s.n)}`}
              >
                {pct >= 8 ? `${Math.round(pct)}%` : ''}
              </div>
            )
          })}
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {cobSegments.map((s) => (
            <div key={s.key} className="flex items-center gap-2 text-xs">
              <span className="h-3 w-3 flex-none rounded-sm" style={{ background: s.color }} />
              <span className="text-[var(--ink-2)]">{s.label}</span>
              <span className="ml-auto font-mono tabular-nums text-[var(--ink)]">{agrupar(s.n)}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 border-t border-[var(--line)] pt-2.5 text-[11px] leading-relaxed text-[var(--ink-3)]">
          <b>Con pedido asociado</b>: reclamo atado a un pedido real — es lo que usa todo el dashboard.{' '}
          <b>Ruido</b>: correos que no se pudieron atar a un pedido (número ausente o no reconocido, o
          remitentes automáticos) — no cuentan como reclamo. Todo se recalcula según el rango de fechas elegido.
        </p>
      </div>

      {/* Clasificación: correos vs conversaciones vs baldes (global) */}
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
        <div className="mb-1 flex flex-wrap items-baseline justify-between gap-3">
          <h3 className="text-sm font-semibold text-[var(--ink)]">
            Reclamos reales · correos vs conversaciones
          </h3>
          <div className="flex gap-5 text-right">
            <div>
              <div className="font-serif text-2xl font-semibold text-[var(--ink)] tabular-nums">
                {agrupar(totalCorreos)}
              </div>
              <div className="text-[10px] uppercase tracking-wide text-[var(--ink-3)]">correos</div>
            </div>
            <div>
              <div className="font-serif text-2xl font-semibold text-[var(--accent)] tabular-nums">
                {agrupar(totalConversaciones)}
              </div>
              <div className="text-[10px] uppercase tracking-wide text-[var(--ink-3)]">conversaciones</div>
            </div>
          </div>
        </div>
        <p className="mb-3 text-xs text-[var(--ink-3)]">
          Un correo = un mensaje; una conversación = un hilo (varios correos del mismo caso). Así se reparten
          por tipo (según la fecha del reclamo en el rango elegido):
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] border-collapse text-[13px]">
            <thead>
              <tr>
                {['Tipo', 'Conversaciones', 'Correos'].map((h, i) => (
                  <th
                    key={h}
                    className={`border-b border-[var(--line)] px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-3)] ${i === 0 ? 'text-left' : 'text-right'}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clasifSorted.map((c) => {
                const meta = CLASIF_META[c.clasificacion] || { label: c.clasificacion, color: 'var(--ink-3)' }
                return (
                  <tr key={c.clasificacion} className="border-b border-[var(--line)] last:border-0">
                    <td className="px-3 py-2">
                      <span className="flex items-center gap-2">
                        <span className="h-3 w-3 flex-none rounded-sm" style={{ background: meta.color }} />
                        <span className="text-[var(--ink)]">{meta.label}</span>
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums text-[var(--ink)]">
                      {agrupar(c.conversaciones)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums text-[var(--ink-2)]">
                      {agrupar(c.correos)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 border-t border-[var(--line)] pt-2.5 text-[11px] leading-relaxed text-[var(--ink-3)]">
          <b>Reclamo con pedido</b>: caso real atado a una orden. <b>Sin pedido identificable</b>: clienta real
          pero sin forma de atar el pedido. <b>No-reclamo / automático</b>: ruido (no cuenta como reclamo).
        </p>
      </div>

      {/* 01 Resumen */}
      <div id="resumen">
        <SectionTitle n="01" title="Resumen — la salud del negocio" />

        <div className="mb-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
            <p className="text-sm text-[var(--ink-2)]">Pedidos en el período</p>
            <div className="mt-1 font-serif text-4xl font-semibold text-[var(--ink)] tabular-nums">
              {agrupar(data.resumen.totalPedidos)}
            </div>
            <p className="mt-1 text-xs text-[var(--ink-3)]">según fecha del pedido</p>
          </div>
        </div>

        {/* Funnel: del universo de pedidos a los casos críticos */}
        <div className="mb-3 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
          <p className="mb-4 text-[12px] font-semibold uppercase tracking-wide text-[var(--ink-3)]">
            Embudo · del universo de pedidos al reclamo
          </p>
          <div className="flex flex-col gap-2.5">
            {funnel.map((f, idx) => {
              const pctUni = Math.round((f.n / uni) * 1000) / 10
              const prev = idx > 0 ? funnel[idx - 1].n : f.n
              const convDesdePrev = prev > 0 ? Math.round((f.n / prev) * 1000) / 10 : 0
              return (
                <div key={f.label} className="flex items-center gap-3">
                  <div className="w-44 flex-none text-right">
                    <div className="text-[13px] font-medium text-[var(--ink)]">{f.label}</div>
                    <div className="text-[10.5px] text-[var(--ink-3)]">{f.sub}</div>
                  </div>
                  <div className="relative h-11 flex-1">
                    <div
                      className="flex h-full items-center rounded-lg px-3 text-white transition-all"
                      style={{ width: `${Math.max(pctUni, 4)}%`, background: f.color, minWidth: 70 }}
                    >
                      <span className="font-serif text-xl font-semibold tabular-nums">{agrupar(f.n)}</span>
                    </div>
                  </div>
                  <div className="w-28 flex-none text-right">
                    <div className="font-mono text-[13px] tabular-nums text-[var(--ink)]">{pctUni}%</div>
                    <div className="text-[10px] text-[var(--ink-3)]">
                      {idx === 0 ? 'del total' : `${convDesdePrev}% del paso previo`}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          <p className="mt-4 border-t border-[var(--line)] pt-2.5 text-[11px] leading-relaxed text-[var(--ink-3)]">
            De cada {agrupar(data.resumen.totalPedidos)} pedidos del período, cuántos terminan escribiendo, cuántos
            son un reclamo real y cuántos escalan a crítico. Solo cuenta lo atado a un pedido (el ruido queda afuera).
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
            <p className="text-sm text-[var(--ink-2)]">Problema real</p>
            <div className="mt-1 font-serif text-5xl font-semibold text-[var(--crit)]">
              {data.resumen.pctProblema}
              <span className="text-2xl">%</span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-[var(--ink-3)]">
              de los pedidos del período generan un caso donde el cliente busca solución.
            </p>
            {data.resumen.deltaPct !== 0 && (
              <span
                className="mt-2.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-semibold"
                style={{
                  background: data.resumen.deltaPct > 0 ? 'var(--crit-bg)' : 'var(--ok-bg)',
                  color: data.resumen.deltaPct > 0 ? 'var(--crit)' : 'var(--ok)',
                }}
              >
                {data.resumen.deltaPct > 0 ? '▲' : '▼'} {Math.abs(data.resumen.deltaPct)}pp vs período anterior
              </span>
            )}
          </div>
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
            <p className="text-sm text-[var(--ink-2)]">Pérdida por SAC · en el período</p>
            <div className="mt-1 font-serif text-5xl font-semibold text-[var(--crit)]">
              {fmtCLP(data.resumen.perdidaTotal)}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-[var(--ink-3)]">
              reembolsos de pedidos del rango elegido (CLP).
            </p>
            {data.resumen.deltaPerdida !== 0 && (
              <span
                className="mt-2.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-semibold"
                style={{
                  background: data.resumen.deltaPerdida > 0 ? 'var(--crit-bg)' : 'var(--ok-bg)',
                  color: data.resumen.deltaPerdida > 0 ? 'var(--crit)' : 'var(--ok)',
                }}
              >
                {data.resumen.deltaPerdida > 0 ? '▲' : '▼'} {fmtCLP(Math.abs(data.resumen.deltaPerdida))} vs período anterior
              </span>
            )}
          </div>
        </div>

        <div className="mt-3 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
          <p className="mb-3 text-[13px] text-[var(--ink-2)]">
            De {totalCasos || 0} interacciones de pedidos del período, así se reparten por gravedad:
          </p>
          {totalCasos === 0 ? (
            <p className="text-xs text-[var(--ink-3)]">Sin interacciones enlazadas a pedidos en este rango.</p>
          ) : (
            <>
              <div className="flex flex-col gap-3">
                {severidadOrdenada.map((s) => {
                  const pct = totalCasos > 0 ? Math.round((s.n / totalCasos) * 1000) / 10 : 0
                  return (
                    <div key={s.balde} className="flex items-center gap-3">
                      <span className="mt-0.5 h-8 w-1.5 flex-none rounded" style={{ background: BALDE_COLOR[s.balde] }} />
                      <div className="w-56 flex-none">
                        <div className="text-[13.5px] font-semibold text-[var(--ink)]">{BALDE_LABEL[s.balde]}</div>
                        <div className="text-[11px] leading-tight text-[var(--ink-3)]">{BALDE_SUB[s.balde]}</div>
                      </div>
                      <span className="h-4 flex-1 overflow-hidden rounded-full bg-[var(--line)]">
                        <span className="block h-full rounded-full" style={{ width: `${pct}%`, background: BALDE_COLOR[s.balde] }} />
                      </span>
                      <span className="w-24 flex-none text-right font-mono text-[13px] tabular-nums">
                        <b className="text-[var(--ink)]">{pct}%</b>{' '}
                        <span className="text-[var(--ink-3)]">· {agrupar(s.n)}</span>
                      </span>
                    </div>
                  )
                })}
              </div>

              {data.matrizCausas.length > 0 && (
                <MatrizCausas
                  filas={data.matrizCausas}
                  totalPedidos={data.resumen.pedidosConReclamo}
                  perdidaGlobal={data.resumen.perdidaTotal}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* 02 Costo */}
      <div id="costo">
        <SectionTitle n="02" title="Costo — dónde se va la plata" />
        <CostoTabs productos={data.productos} />

        {/* Reembolsos hechos vs solicitados */}
        <div className="mt-3 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
            <h3 className="text-sm font-semibold text-[var(--ink)]">Reembolsos · hechos vs solicitados</h3>
            <span className="font-serif text-2xl font-semibold text-[var(--ok)] tabular-nums">
              {data.reembolso.pctCumplido}% <span className="text-sm font-normal text-[var(--ink-3)]">cumplidos</span>
            </span>
          </div>

          {(() => {
            const maxV = Math.max(data.reembolso.solicitados, data.reembolso.hechos, 1)
            const filas = [
              {
                label: 'Solicitados',
                sub: 'la clienta pidió reembolso',
                n: data.reembolso.solicitados,
                color: 'var(--warn)',
              },
              {
                label: 'Hechos',
                sub: 'reembolso efectivo en Shopify',
                n: data.reembolso.hechos,
                color: 'var(--crit)',
              },
              {
                label: 'Solicitados y cumplidos',
                sub: 'pidieron y se les reembolsó',
                n: data.reembolso.solicitadosCumplidos,
                color: 'var(--ok)',
              },
            ]
            return (
              <div className="flex flex-col gap-2.5">
                {filas.map((f) => (
                  <div key={f.label} className="flex items-center gap-3">
                    <div className="w-52 flex-none text-right">
                      <div className="text-[13px] font-medium text-[var(--ink)]">{f.label}</div>
                      <div className="text-[10.5px] text-[var(--ink-3)]">{f.sub}</div>
                    </div>
                    <div className="relative h-10 flex-1">
                      <div
                        className="flex h-full items-center rounded-lg px-3 text-white"
                        style={{ width: `${Math.max((f.n / maxV) * 100, 6)}%`, background: f.color, minWidth: 56 }}
                      >
                        <span className="font-serif text-lg font-semibold tabular-nums">{agrupar(f.n)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          })()}

          {/* Montos en $ */}
          <div className="mt-4 grid gap-3 border-t border-[var(--line)] pt-4 sm:grid-cols-3">
            <div className="rounded-xl border border-[var(--line)] bg-[var(--panel-2)] p-3.5">
              <p className="text-[11px] uppercase tracking-wide text-[var(--ink-3)]">$ Solicitado</p>
              <p className="mt-1 font-serif text-2xl font-semibold text-[var(--warn)] tabular-nums">
                {fmtCLP(data.reembolso.montoSolicitado)}
              </p>
              <p className="mt-0.5 text-[11px] text-[var(--ink-3)]">valor de los pedidos que pidieron reembolso</p>
            </div>
            <div className="rounded-xl border border-[var(--line)] bg-[var(--panel-2)] p-3.5">
              <p className="text-[11px] uppercase tracking-wide text-[var(--ink-3)]">$ Pagado</p>
              <p className="mt-1 font-serif text-2xl font-semibold text-[var(--ok)] tabular-nums">
                {fmtCLP(data.reembolso.montoPagado)}
              </p>
              <p className="mt-0.5 text-[11px] text-[var(--ink-3)]">
                reembolsado de verdad ({data.reembolso.pctMontoPagado}% de lo solicitado)
              </p>
            </div>
            <div className="rounded-xl border border-[var(--line)] bg-[var(--panel-2)] p-3.5">
              <p className="text-[11px] uppercase tracking-wide text-[var(--ink-3)]">$ Falta por pagar</p>
              <p className="mt-1 font-serif text-2xl font-semibold text-[var(--crit)] tabular-nums">
                {fmtCLP(data.reembolso.montoFalta)}
              </p>
              <p className="mt-0.5 text-[11px] text-[var(--ink-3)]">solicitado que aún no se reembolsó</p>
            </div>
          </div>

          <p className="mt-3 text-[11px] leading-relaxed text-[var(--ink-3)]">
            De {agrupar(data.reembolso.solicitados)} pedidos que pidieron reembolso se cumplieron{' '}
            {agrupar(data.reembolso.solicitadosCumplidos)} ({data.reembolso.pctCumplido}%). "$ Solicitado" =
            valor total de esos pedidos; "$ Pagado" = lo efectivamente reembolsado. Todo por pedido único,
            según el rango de fechas.
          </p>
        </div>
      </div>

      {/* 03 Productos */}
      <div id="productos">
        <SectionTitle n="03" title="Productos — impacto = ventas × reclamo" />
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
          <ProductScatter productos={data.productos} />
        </div>

        <p className="mt-3 mb-2 text-[12px] text-[var(--ink-3)]">
          Productos con volumen real (5+ pedidos). El estado{' '}
          <b className="text-[var(--crit)]">Apagar</b> / <b className="text-[var(--warn)]">Vigilar</b> solo se
          activa con suficientes pedidos y reclamos. <b>Clic en una columna para ordenar</b> (▲ asc / ▼ desc).
        </p>
        <ProductTable productos={tablaProductos} />
      </div>

      {/* 04 Operacion */}
      <div id="operacion">
        <SectionTitle n="04" title="Operación — el backlog y la cola de hoy" />
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
            <p className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-[var(--ink-3)]">El embudo</p>
            <div className="flex flex-col gap-2">
              {filasEmbudo.map((f) => (
                <div key={f.label} className="flex items-center gap-3">
                  <span
                    className="flex h-8 items-center rounded-lg px-3 font-mono text-[13.5px] font-semibold tabular-nums text-white"
                    style={{ width: `${Math.max((f.n / maxEmbudo) * 100, 12)}%`, background: f.color }}
                  >
                    {f.n}
                  </span>
                  <span className="text-[12.5px] text-[var(--ink-2)]">{f.label}</span>
                </div>
              ))}
            </div>
            <p className="mt-4 border-t border-[var(--line)] pt-3 text-[11.5px] leading-relaxed text-[var(--ink-3)]">
              Tiempo de 1ª respuesta y cierre promedio se activan cuando WF1 quede conectado en vivo.
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
            <p className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-[var(--ink-3)]">Cola priorizada</p>
            {data.cola.length === 0 ? (
              <p className="text-xs text-[var(--ink-3)]">Sin interacciones abiertas en pedidos de este rango.</p>
            ) : (
              <div className="flex flex-col">
                {data.cola.map((t) => {
                  const color = t.riesgo_legal
                    ? 'var(--crit-deep)'
                    : t.canal !== 'mail'
                      ? 'var(--crit)'
                      : (t.gravedad || 0) >= 2
                        ? 'var(--warn)'
                        : 'var(--ink-3)'
                  return (
                    <div key={t.id} className="flex gap-2.5 border-b border-[var(--line)] py-2.5 last:border-0">
                      <span className="w-1 flex-none self-stretch rounded" style={{ background: color }} />
                      <div className="min-w-0">
                        <div className="mb-0.5 flex flex-wrap gap-2 font-mono text-[10.5px] text-[var(--ink-3)]">
                          <span>{CANAL_LABEL[t.canal] || t.canal.toUpperCase()}</span>
                          {t.order_number && <span>#{t.order_number}</span>}
                          {t.producto_titulo && <span>{t.producto_titulo}</span>}
                          {t.riesgo_legal && <span className="text-[var(--crit-deep)]">legal</span>}
                        </div>
                        <p className="truncate text-[13px] text-[var(--ink)]">
                          {t.resumen || MOTIVO_LABEL[t.motivo || ''] || 'Sin resumen'}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 05 Aduana */}
      <div id="aduana">
        <SectionTitle n="05" title="Aduana / envío — la causa raíz externa" />
        <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
                <p className="text-xs text-[var(--ink-2)]">% Expired</p>
                <p className="mt-1.5 font-serif text-3xl font-semibold text-[var(--crit)] tabular-nums">
                  {data.kpis.pctExpired ?? '—'}
                  {data.kpis.pctExpired != null && <span className="text-base">%</span>}
                </p>
                <p className="mt-0.5 text-[11px] text-[var(--ink-3)]">muertos en tránsito</p>
              </div>
              <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
                <p className="text-xs text-[var(--ink-2)]">Tránsito</p>
                <p className="mt-1.5 font-serif text-3xl font-semibold text-[var(--warn)] tabular-nums">
                  {data.kpis.mediana != null ? Math.round(data.kpis.mediana) : '—'}
                  {data.kpis.mediana != null && <span className="text-base"> d</span>}
                </p>
                <p className="mt-0.5 text-[11px] text-[var(--ink-3)]">mediana días</p>
              </div>
              <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
                <p className="text-xs text-[var(--ink-2)]">Disputas</p>
                <p className="mt-1.5 font-serif text-3xl font-semibold tabular-nums">{data.kpis.disputasAbiertas}</p>
                <p className="mt-0.5 text-[11px] text-[var(--ink-3)]">abiertas</p>
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
              <p className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-[var(--ink-3)]">
                ¿Dónde se traban? · etapa del tracking
              </p>
              {etapasOrdenadas.length === 0 ? (
                <p className="text-xs text-[var(--ink-3)]">Sin datos de envío en este rango.</p>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {etapasOrdenadas.map((e) => (
                    <div key={e.etapa} className="flex items-center gap-3 text-sm">
                      <span className="w-40 flex-none truncate text-[var(--ink-2)]">
                        {ETAPA_LABEL[e.etapa] || e.etapa}
                      </span>
                      <span className="h-3.5 flex-1 overflow-hidden rounded-full bg-[var(--line)]">
                        <span
                          className="block h-full rounded-full"
                          style={{ width: `${(e.pct / maxEtapa) * 100}%`, background: e.etapa === 'aduana' ? 'var(--crit)' : 'var(--ink-3)' }}
                        />
                      </span>
                      <span className="w-14 flex-none text-right font-mono text-xs tabular-nums">{e.pct}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
            <p className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-[var(--ink-3)]">
              Reembolsos por mes · CLP
            </p>
            {data.reembolsosPorMes.length === 0 ? (
              <p className="text-xs text-[var(--ink-3)]">Sin reembolsos registrados en este rango.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {data.reembolsosPorMes.map((r) => (
                  <div key={r.mes} className="flex items-center gap-3 text-sm">
                    <span className="w-16 flex-none font-mono text-xs text-[var(--ink-3)]">{fmtMes(r.mes)}</span>
                    <span className="h-3.5 flex-1 overflow-hidden rounded-full bg-[var(--line)]">
                      <span
                        className="block h-full rounded-full"
                        style={{ width: `${(r.total / maxReembolsoMes) * 100}%`, background: 'var(--crit)' }}
                      />
                    </span>
                    <span className="w-24 flex-none text-right font-mono text-xs tabular-nums">{fmtCLP(r.total)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
