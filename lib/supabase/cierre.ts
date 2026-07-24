import { createAdminClient } from '@/lib/supabase/admin'
import { MOTIVO_LABEL } from '@/lib/supabase/queries'

export type CierreDia = {
  fecha: string
  llegaron: number
  respondidos: number
  sin_responder_hoy: number
  backlog_total: number
  backlog_graves: number
  backlog_legales: number
  disputas_abiertas: number
  top_motivos: { motivo: string; n: number }[]
}

// Indicadores del día (día calendario de Chile). El cálculo vive en la función SQL
// sac_cierre_dia() para que sea una sola consulta y el criterio quede en un solo lugar.
export async function getCierreDia(): Promise<CierreDia | null> {
  const supa = createAdminClient()
  const { data, error } = await supa.rpc('sac_cierre_dia')
  if (error || !data) return null
  return data as CierreDia
}

function fmtFecha(iso: string) {
  const [y, m, d] = (iso || '').split('-')
  return d && m && y ? `${d}/${m}/${y}` : iso
}

// El texto que se ve en el panel es EXACTAMENTE el que llega a Telegram: n8n solo lo
// reenvía. Así nadie manda a ciegas algo distinto de lo que revisó.
export function textoCierre(c: CierreDia): string {
  const pctResp = c.llegaron > 0 ? Math.round((c.respondidos / c.llegaron) * 100) : 0
  const motivos = c.top_motivos.length
    ? c.top_motivos.map((m) => `• ${MOTIVO_LABEL[m.motivo] || m.motivo}: ${m.n}`).join('\n')
    : '• sin datos'

  const lineas = [
    `<b>Cierre del día · SAC Lorentina</b>`,
    `${fmtFecha(c.fecha)}`,
    ``,
    `📥 <b>Llegaron:</b> ${c.llegaron} correos`,
    `✅ <b>Respondidos:</b> ${c.respondidos} (${pctResp}%)`,
    `⏳ <b>Sin responder de hoy:</b> ${c.sin_responder_hoy}`,
    ``,
    `<b>Cola acumulada:</b> ${c.backlog_total} pendientes`,
    `   · graves (3-4): ${c.backlog_graves}`,
    `   · con riesgo legal: ${c.backlog_legales}`,
  ]
  if (c.disputas_abiertas > 0) {
    lineas.push(`⚠️ <b>Disputas por responder:</b> ${c.disputas_abiertas}`)
  }
  lineas.push(``, `<b>Motivos del día:</b>`, motivos)
  return lineas.join('\n')
}
