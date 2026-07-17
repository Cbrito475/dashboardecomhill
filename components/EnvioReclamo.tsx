import { ENVIO_LABEL, ENVIO_SUB, ENVIO_COLOR } from '@/lib/supabase/queries'
import { fmtCLP, agrupar, fmtDec } from '@/lib/format'

export type FilaEnvio = {
  status: string
  n: number
  pct: number
  reclamo: number
  pctReclamo: number
  plata: number
  pctPlata: number
  reembolsado: number
  ventas: number
  diasMediana: number | null
}

export default function EnvioReclamo({
  filas,
  cobertura,
  totalPedidos,
}: {
  filas: FilaEnvio[]
  cobertura: number
  totalPedidos: number
}) {
  const reales = filas.filter((f) => f.status !== 'sin_dato' && f.status !== 'sin_tracking')
  const sinDato = filas.filter((f) => f.status === 'sin_dato' || f.status === 'sin_tracking')
  const nSinDato = sinDato.reduce((a, f) => a + f.n, 0)

  const nReales = reales.reduce((a, f) => a + f.n, 0)
  const reclamoReales = reales.reduce((a, f) => a + f.reclamo, 0)
  const tasaBase = nReales > 0 ? (reclamoReales / nReales) * 100 : 0
  const maxPctReclamo = Math.max(...reales.map((f) => f.pctReclamo), 1)

  const alignCls = { left: 'text-left', right: 'text-right', center: 'text-center' }
  const Th = ({ children, sub, align = 'right' }: { children: React.ReactNode; sub?: string; align?: 'left' | 'right' | 'center' }) => (
    <th className={`px-4 py-2.5 align-bottom ${alignCls[align]}`}>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-2)]">{children}</div>
      {sub && <div className="mt-0.5 text-[10px] font-normal normal-case text-[var(--ink-3)]">{sub}</div>}
    </th>
  )

  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
      <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--ink-3)]">
        Envío × reclamo · ¿el problema es la logística?
      </p>
      <p className="mb-4 mt-1 text-[12px] leading-relaxed text-[var(--ink-3)]">
        Cada fila es un estado de envío de ParcelPanel. La columna que importa es <b className="text-[var(--ink-2)]">% que reclamó</b>:
        los estados que superan el promedio ({fmtDec(tasaBase)}%) generan más reclamos que un pedido normal — ahí el
        problema es logístico.
      </p>

      {cobertura < 90 && (
        <p className="mb-4 rounded-lg border border-[var(--warn)]/40 bg-[var(--warn)]/10 p-2.5 text-[11px] leading-relaxed text-[var(--ink-2)]">
          <b>Cobertura parcial: {cobertura}%.</b> {agrupar(nReales)} de {agrupar(totalPedidos)} pedidos tienen dato
          de envío; los otros {agrupar(nSinDato)} aún no se consultaron en ParcelPanel. Los % son sobre los que sí
          tienen dato.
        </p>
      )}

      {reales.length === 0 ? (
        <p className="text-xs text-[var(--ink-3)]">Todavía no hay ningún pedido con datos de envío en este rango.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse">
            <thead>
              <tr className="border-b-2 border-[var(--line)]">
                <Th align="left">Estado del envío</Th>
                <Th sub="y % del total">Pedidos</Th>
                <Th sub="mediana" align="center">Días</Th>
                <Th sub={`promedio ${fmtDec(tasaBase)}%`} align="left">% que reclamó</Th>
                <Th sub="del estado">Piden reembolso</Th>
                <Th sub="reembolsos pagados">$ devuelto</Th>
              </tr>
            </thead>
            <tbody>
              {reales.map((f, i) => {
                const sobreBase = f.pctReclamo > tasaBase * 1.5 && f.n >= 20
                return (
                  <tr
                    key={f.status}
                    className={`border-b border-[var(--line)] last:border-0 ${i % 2 === 1 ? 'bg-[var(--panel-2)]' : ''}`}
                  >
                    {/* Estado */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="h-7 w-1.5 flex-none rounded-full"
                          style={{ background: ENVIO_COLOR[f.status] || 'var(--ink-3)' }}
                        />
                        <div>
                          <div className="text-[13px] font-medium text-[var(--ink)]">{ENVIO_LABEL[f.status] || f.status}</div>
                          <div className="text-[11px] text-[var(--ink-3)]">{ENVIO_SUB[f.status] || ''}</div>
                        </div>
                      </div>
                    </td>

                    {/* Pedidos */}
                    <td className="border-l border-[var(--line)] px-4 py-3 text-right">
                      <div className="font-mono text-sm font-semibold tabular-nums text-[var(--ink)]">{agrupar(f.n)}</div>
                      <div className="text-[10px] text-[var(--ink-3)]">{f.pct}% del total</div>
                    </td>

                    {/* Días */}
                    <td className="px-4 py-3 text-center font-mono text-sm tabular-nums text-[var(--ink-2)]">
                      {f.diasMediana ?? '—'}
                    </td>

                    {/* % que reclamó — la columna clave */}
                    <td className="border-l border-[var(--line)] px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="relative h-4 w-28 flex-none overflow-hidden rounded-full bg-[var(--line)]">
                          <span
                            className="block h-full rounded-full"
                            style={{
                              width: `${(f.pctReclamo / maxPctReclamo) * 100}%`,
                              background: ENVIO_COLOR[f.status] || 'var(--ink-3)',
                            }}
                          />
                          <span
                            className="absolute inset-y-0 w-0.5 bg-[var(--ink)] opacity-50"
                            style={{ left: `${(tasaBase / maxPctReclamo) * 100}%` }}
                            title={`promedio ${fmtDec(tasaBase)}%`}
                          />
                        </span>
                        <span className="font-mono text-sm font-semibold tabular-nums text-[var(--ink)]">
                          {fmtDec(f.pctReclamo)}%
                        </span>
                        {sobreBase && (
                          <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-[var(--crit)] ring-1 ring-[var(--crit)]/40">
                            {fmtDec(f.pctReclamo / (tasaBase || 1))}×
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Piden reembolso */}
                    <td className="border-l border-[var(--line)] px-4 py-3 text-right">
                      {f.plata > 0 ? (
                        <>
                          <div className="font-mono text-sm tabular-nums text-[var(--ink)]">{agrupar(f.plata)}</div>
                          <div className="text-[10px] text-[var(--ink-3)]">{fmtDec(f.pctPlata)}% del estado</div>
                        </>
                      ) : (
                        <span className="text-[var(--ink-3)]">—</span>
                      )}
                    </td>

                    {/* $ devuelto */}
                    <td className="px-4 py-3 text-right font-mono text-sm tabular-nums text-[var(--ink)]">
                      {f.reembolsado > 0 ? fmtCLP(f.reembolsado) : <span className="text-[var(--ink-3)]">—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-3 text-[11px] leading-relaxed text-[var(--ink-3)]">
        La rayita vertical en la barra de <b>% que reclamó</b> es el promedio ({fmtDec(tasaBase)}%). El badge{' '}
        <span className="rounded px-1 py-0.5 text-[10px] font-semibold text-[var(--crit)] ring-1 ring-[var(--crit)]/40">
          2,2×
        </span>{' '}
        marca los estados que reclaman más del doble que un pedido normal. <b>$ devuelto</b> incluye reembolsos por
        problemas de producto (no solo de envío), por eso &quot;Entregado&quot; puede tener monto alto: son muchos
        pedidos y el problema ahí es de calidad, no de logística.
      </p>
    </div>
  )
}
