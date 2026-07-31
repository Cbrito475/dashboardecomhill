import { createAdminClient } from '@/lib/supabase/admin'
import { agruparRedes, type RedCaso, type RedFila, type RedMensaje, type RedesCounts } from '@/lib/core/redes'

// ============================================================================
// Redes (Facebook + Instagram) — lectura de social_mensajes para la sección
// Redes del panel. La ingesta la hace WF-S1 (n8n) cada 5 min, solo lectura.
// FASE 2: la regla de agrupación en conversaciones y los tipos viven en
// lib/core/redes; acá queda solo el acceso a datos (estrangulador).
// ============================================================================
export * from '@/lib/core/redes'

type Fila = RedFila

async function filas(): Promise<Fila[]> {
  const supa = createAdminClient()
  const { data } = await supa
    .from('social_mensajes')
    .select('id, conversacion_id, plataforma, tipo, external_id, autor_nombre, texto, fecha, estado, contexto_post, ventana_expira_at, borrador_ia, motivo, gravedad, riesgo_legal, puede_responder')
    .order('fecha', { ascending: false })
    .limit(1000)
  return (data ?? []) as Fila[]
}

export async function getRedesLista(): Promise<RedCaso[]> {
  return agruparRedes(await filas())
}

export async function getRedesHilo(conversacionId: string): Promise<RedMensaje[]> {
  const supa = createAdminClient()
  const { data } = await supa
    .from('social_mensajes')
    .select('id, external_id, autor_nombre, texto, fecha, estado')
    .or(`conversacion_id.eq.${conversacionId},external_id.eq.${conversacionId}`)
    .order('fecha', { ascending: true })
    .limit(200)
  return (data ?? []) as RedMensaje[]
}

export async function getRedesCounts(): Promise<RedesCounts> {
  const casos = agruparRedes(await filas())
  return {
    pendientes: casos.filter((c) => c.pendientes > 0).length,
    vencidos: casos.filter((c) => c.vencido).length,
    resueltos: casos.filter((c) => c.pendientes === 0).length,
  }
}
