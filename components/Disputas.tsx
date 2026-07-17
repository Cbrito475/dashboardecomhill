import { fmtCLP, agrupar } from '@/lib/format'

export type DatosDisputa = {
  n: number
  pct: number
  monto: number
  conReclamoPrevio: number
  sinReclamoPrevio: number
}

export default function Disputas({ d, totalPedidos }: { d: DatosDisputa; totalPedidos: number }) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
      <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--ink-3)]">
        Disputas · pedidos que escalaron al banco
      </p>
      <p className="mb-4 mt-1 text-[11px] text-[var(--ink-3)]">
        La clienta que abre una disputa se saltó al SAC y fue directo a la pasarela de pago. Es el peor
        desenlace posible: cuesta la plata, la comisión y reputación con el procesador.
      </p>

      {d.n === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--line)] p-4">
          <p className="text-sm text-[var(--ink-2)]">Sin disputas registradas en este período.</p>
          <p className="mt-1 text-[11px] leading-relaxed text-[var(--ink-3)]">
            Cero disputas sobre {agrupar(totalPedidos)} pedidos es un dato posible, pero también es lo que se
            vería si la carga desde Stripe todavía no corrió. Hasta confirmar que el workflow trajo datos, este
            panel no distingue &quot;no hay disputas&quot; de &quot;no las cargamos&quot;.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-[var(--line)] p-4">
              <p className="text-[11px] uppercase tracking-wide text-[var(--ink-3)]">Pedidos en disputa</p>
              <p className="mt-1 font-serif text-3xl font-semibold text-[var(--crit)] tabular-nums">
                {agrupar(d.n)}
              </p>
              <p className="mt-1 text-[11px] text-[var(--ink-3)]">{d.pct}% de los pedidos del período</p>
            </div>
            <div className="rounded-xl border border-[var(--line)] p-4">
              <p className="text-[11px] uppercase tracking-wide text-[var(--ink-3)]">Plata en disputa</p>
              <p className="mt-1 font-serif text-3xl font-semibold text-[var(--crit)] tabular-nums">
                {fmtCLP(d.monto)}
              </p>
              <p className="mt-1 text-[11px] text-[var(--ink-3)]">valor de los pedidos disputados</p>
            </div>
            <div className="rounded-xl border border-[var(--line)] p-4">
              <p className="text-[11px] uppercase tracking-wide text-[var(--ink-3)]">Nos avisaron antes</p>
              <p className="mt-1 font-serif text-3xl font-semibold text-[var(--ink)] tabular-nums">
                {d.n > 0 ? Math.round((d.conReclamoPrevio / d.n) * 100) : 0}%
              </p>
              <p className="mt-1 text-[11px] text-[var(--ink-3)]">
                {agrupar(d.conReclamoPrevio)} escribieron al SAC antes de disputar
              </p>
            </div>
          </div>

          {d.sinReclamoPrevio > 0 && (
            <p className="mt-3 rounded-lg border border-[var(--crit)]/40 bg-[var(--crit)]/10 p-2.5 text-[11px] leading-relaxed text-[var(--ink-2)]">
              <b>{agrupar(d.sinReclamoPrevio)} disputas llegaron sin aviso previo.</b> Esas clientas no
              escribieron nunca: fueron directo al banco. No son un problema de cómo responde el SAC — son un
              problema de que el SAC ni se enteró. Se atacan antes, no mejor.
            </p>
          )}
        </>
      )}
    </div>
  )
}
