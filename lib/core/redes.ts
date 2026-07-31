// ============================================================================
// CORE · Redes — la regla de agrupación de social_mensajes en CONVERSACIONES
// (la unidad de trabajo del SAC en Facebook/Instagram) y sus tipos.
// Dominio puro, movido tal cual desde lib/supabase/redes.ts (fase 2).
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
  borrador: string | null // borrador IA (WF-S2), para copiar/aprobar
  motivo: string | null
  gravedad: number | null
  riesgo_legal: boolean
  puede_responder: boolean | null
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

// La fila cruda de social_mensajes que necesita la regla de agrupación (la forma
// estructural mínima; el adapter de datos la satisface con su select).
export type RedFila = {
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
  borrador_ia: string | null
  motivo: string | null
  gravedad: number | null
  riesgo_legal: boolean | null
  puede_responder: boolean | null
}

export function agruparRedes(rows: RedFila[]): RedCaso[] {
  const porConv = new Map<string, RedFila[]>()
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
    const conBorrador = msgs.find((m) => m.borrador_ia)
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
      borrador: conBorrador?.borrador_ia ?? null,
      motivo: conBorrador?.motivo ?? null,
      gravedad: conBorrador?.gravedad ?? null,
      riesgo_legal: conBorrador?.riesgo_legal === true,
      puede_responder: conBorrador?.puede_responder ?? null,
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
