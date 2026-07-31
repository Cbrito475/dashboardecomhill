import { createAdminClient } from '@/lib/supabase/admin'

// ============================================================================
// Redes (Facebook + Instagram) — lectura de social_mensajes para la sección
// Redes del panel. La ingesta la hace WF-S1 (n8n) cada 5 min, solo lectura.
// La unidad de trabajo del SAC es la CONVERSACIÓN (hilo de DM o post con
// comentarios), no el mensaje suelto.
// ============================================================================

export type RedCaso = {
  conversacion_id: string
  plataforma: 'facebook' | 'instagram'
  tipo: 'comentario' | 'dm'
  autor_nombre: string | null
  ultimo_texto: string | null
  ultima_fecha: string
  contexto_post: string | null
  pendientes: number // mensajes sin respuesta de la página
  total: number
  vencido: boolean // DM: la ventana de 24h del último mensaje pendiente ya pasó
}

export type RedMensaje = {
  id: string
  external_id: string
  autor_nombre: string | null
  texto: string | null
  fecha: string
  estado: string
}

export type RedesCounts = { pendientes: number; vencidos: number; resueltos: number }

type Fila = {
  id: string
  conversacion_id: string | null
  plataforma: 'facebook' | 'instagram'
  tipo: 'comentario' | 'dm'
  external_id: string
  autor_nombre: string | null
  texto: string | null
  fecha: string
  estado: string
  contexto_post: string | null
  ventana_expira_at: string | null
}

async function filas(): Promise<Fila[]> {
  const supa = createAdminClient()
  const { data } = await supa
    .from('social_mensajes')
    .select('id, conversacion_id, plataforma, tipo, external_id, autor_nombre, texto, fecha, estado, contexto_post, ventana_expira_at')
    .order('fecha', { ascending: false })
    .limit(1000)
  return (data ?? []) as Fila[]
}

function agrupar(rows: Fila[]): RedCaso[] {
  const porConv = new Map<string, Fila[]>()
  for (const r of rows) {
    const key = r.conversacion_id || r.external_id
    const arr = porConv.get(key)
    if (arr) arr.push(r)
    else porConv.set(key, [r])
  }
  const ahora = Date.now()
  const casos: RedCaso[] = []
  for (const [key, msgs] of porConv) {
    // msgs vienen ordenados desc por fecha
    const ultimo = msgs[0]
    const pendientes = msgs.filter((m) => m.estado === 'nuevo' || m.estado === 'esperando_humano').length
    const ultimoPendiente = msgs.find((m) => m.estado === 'nuevo' || m.estado === 'esperando_humano')
    const vencido =
      ultimo.tipo === 'dm' &&
      pendientes > 0 &&
      !!ultimoPendiente?.ventana_expira_at &&
      Date.parse(ultimoPendiente.ventana_expira_at) < ahora
    casos.push({
      conversacion_id: key,
      plataforma: ultimo.plataforma,
      tipo: ultimo.tipo,
      autor_nombre: ultimo.autor_nombre,
      ultimo_texto: ultimo.texto,
      ultima_fecha: ultimo.fecha,
      contexto_post: ultimo.contexto_post,
      pendientes,
      total: msgs.length,
      vencido,
    })
  }
  // Pendientes primero (vencidos arriba de todo), luego por fecha del último mensaje.
  casos.sort((a, b) => {
    if ((a.pendientes > 0) !== (b.pendientes > 0)) return a.pendientes > 0 ? -1 : 1
    if (a.vencido !== b.vencido) return a.vencido ? -1 : 1
    return Date.parse(b.ultima_fecha) - Date.parse(a.ultima_fecha)
  })
  return casos
}

export async function getRedesLista(): Promise<RedCaso[]> {
  return agrupar(await filas())
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
  const casos = agrupar(await filas())
  return {
    pendientes: casos.filter((c) => c.pendientes > 0).length,
    vencidos: casos.filter((c) => c.vencido).length,
    resueltos: casos.filter((c) => c.pendientes === 0).length,
  }
}
