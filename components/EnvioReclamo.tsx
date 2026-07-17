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
  // 'sin_dato' no es un estado de envio, es ausencia de dato: va aparte para que no
  // contamine la comparacion entre estados reales.
  const reales = filas.filter((f) => f.status !== 'sin_dato' && f.status !== 'sin_tracking')
  const sinDato = filas.filter((f) => f.status === 'sin_dato' || f.status === 'sin_tracking')
  const nSinDato = sinDato.reduce((a, f) => a + f.n, 0)

  // La referencia es la tasa de reclamo de los pedidos que SI tienen envio conocido.
  const nReales = reales.reduce((a, f) => a + f.n, 0)
  const reclamoReales = reales.reduce((a, f) => a + f.reclamo, 0)
  const tasaBase = nReales > 0 ? (reclamoReales / nReales) * 100 : 0
  const maxPctReclamo = Math.max(...reales.map((f) => f.pctReclamo), 1)

  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
      <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--ink-3)]">
        Envío × reclamo · ¿el problema es la logística?
      </p>
      <p className="mb-4 mt-1 text-[11px] text-[var(--ink-3)]">
        Por cada estado de envío de ParcelPanel: cuántos pedidos hay y qué porcentaje terminó reclamando. La
        línea punteada es el promedio de los pedidos con envío conocido ({fmtDec(tasaBase)}%): lo que la pasa,
        reclama más de lo normal.
      </p>

      {cobertura < 90 && (
        <p className="mb-4 rounded-lg border border-[var(--warn)]/40 bg-[var(--warn)]/10 p-2.5 text-[11px] leading-relaxed text-[var(--ink-2)]">
          <b>Cobertura parcial: {cobertura}%.</b> Solo {agrupar(nReales)} de los {agrupar(totalPedidos)} pedidos
          tienen datos de envío; los otros {agrupar(nSinDato)} están sin consultar en ParcelPanel. Los
          porcentajes de esta tabla son sobre los que sí tienen dato — son válidos, pero todavía no representan
          al universo completo.
        </p>
      )}

      {reales.length === 0 ? (
        <p className="text-xs text-[var(--ink-3)]">
          Todavía no hay ningún pedido con datos de envío en este rango.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse">
            <thead>
              <tr className="border-b border-[var(--line)] text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-3)]">
                <th className="pb-2 text-left">Estado del envío</th>
                <th className="pb-2 text-right">Pedidos</th>
                <th className="pb-2 text-center">Días</th>
                <th className="pb-2 text-left">% que reclama</th>
                <th className="pb-2 text-right">Pide plata</th>
                <th className="pb-2 text-right">$ perdido</th>
              </tr>
            </thead>
            <tbody>
              {reales.map((f) => {
                const sobreBase = f.pctReclamo > tasaBase * 1.5 && f.n >= 20
                return (
                  <tr key={f.status} className="border-b border-[var(--line)] last:border-0">
                    <td className="py-2 pr-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-6 w-1 flex-none rounded-full"
                          style={{ background: ENVIO_COLOR[f.status] || 'var(--ink-3)' }}
                        />
                        <span>
                          <span className="block text-sm text-[var(--ink-2)]">
                            {ENVIO_LABEL[f.status] || f.status}
                          </span>
                          <span className="block text-[11px] text-[var(--ink-3)]">
                            {ENVIO_SUB[f.status] || ''}
                          </span>
                        </span>
                      </div>
                    </td>
                    <td className="py-2 text-right font-mono text-xs tabular-nums text-[var(--ink)]">
                      {agrupar(f.n)}
                      <span className="ml-1 text-[10px] text-[var(--ink-3)]">{f.pct}%</span>
                    </td>
                    <td className="py-2 text-center font-mono text-xs tabular-nums text-[var(--ink-3)]">
                      {f.diasMediana ?? '—'}
                    </td>
                    <td className="py-2 pl-3 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="relative h-3.5 w-32 flex-none overflow-hidden rounded-full bg-[var(--line)]">
                          <span
                            className="block h-full rounded-full"
                            style={{
                              width: `${(f.pctReclamo / maxPctReclamo) * 100}%`,
                              background: ENVIO_COLOR[f.status] || 'var(--ink-3)',
                            }}
                          />
                          <span
                            className="absolute inset-y-0 w-px bg-[var(--ink-2)] opacity-60"
                            style={{ left: `${(tasaBase / maxPctReclamo) * 100}%` }}
                            title={`promedio ${fmtDec(tasaBase)}%`}
                          />
                        </span>
                        <span className="font-mono text-xs tabular-nums text-[var(--ink)]">{f.pctReclamo}%</span>
                        {sobreBase && (
                          <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-[var(--crit)] ring-1 ring-[var(--crit)]/40">
                            {fmtDec(f.pctReclamo / (tasaBase || 1))}× el promedio
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 text-right font-mono text-xs tabular-nums text-[var(--ink-3)]">
                      {f.plata > 0 ? `${agrupar(f.plata)} · ${f.pctPlata}%` : '—'}
                    </td>
                    <td className="py-2 pl-3 text-right font-mono text-xs tabular-nums text-[var(--ink)]">
                      {f.reembolsado > 0 ? fmtCLP(f.reembolsado) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
