import { createAdminClient } from '@/lib/supabase/admin'

const ES_TIENDA = /lorentina/i

export type BandejaItem = {
  id: string
  hilo_id: string
  mensaje_id: string | null
  order_number: string | null
  motivo: string | null
  gravedad: number | null
  riesgo_legal: boolean
  estado: string
  puede_responder: boolean | null
  origen_envio: string | null
  editado_bool: boolean | null
  cliente: string | null
  asunto: string | null
  fecha: string | null
}

const ESTADOS_ABIERTOS = ['nuevo', 'esperando_humano', 'en_cola']

// Cola de la bandeja: casos abiertos (o, si filtro='historial', los cerrados/enviados).
export async function getBandeja(filtro: 'abiertos' | 'historial' = 'abiertos'): Promise<BandejaItem[]> {
  const supa = createAdminClient()
  let q = supa
    .from('sac_respuestas')
    .select('id, hilo_id, mensaje_id, order_number, motivo, gravedad, riesgo_legal, estado, puede_responder, origen_envio, editado_bool, created_at')
    .order('gravedad', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(300)
  q = filtro === 'abiertos' ? q.in('estado', ESTADOS_ABIERTOS) : q.in('estado', ['enviado', 'cerrado', 'no_responder'])
  const { data: rows } = await q
  const lista = rows ?? []

  const mids = Array.from(new Set(lista.map((r) => r.mensaje_id).filter(Boolean))) as string[]
  const cmap = new Map<string, { remitente: string | null; asunto: string | null; fecha: string | null }>()
  if (mids.length) {
    const { data: correos } = await supa.from('correos').select('mensaje_id, remitente, asunto, fecha').in('mensaje_id', mids)
    for (const c of correos ?? []) cmap.set(c.mensaje_id, { remitente: c.remitente, asunto: c.asunto, fecha: c.fecha })
  }

  return lista.map((r) => {
    const c = r.mensaje_id ? cmap.get(r.mensaje_id) : undefined
    return {
      id: r.id,
      hilo_id: r.hilo_id,
      mensaje_id: r.mensaje_id,
      order_number: r.order_number,
      motivo: r.motivo,
      gravedad: r.gravedad,
      riesgo_legal: r.riesgo_legal,
      estado: r.estado,
      puede_responder: r.puede_responder,
      origen_envio: r.origen_envio,
      editado_bool: r.editado_bool,
      cliente: c?.remitente ?? null,
      asunto: c?.asunto ?? null,
      fecha: c?.fecha ?? null,
    }
  })
}

export type MensajeHilo = {
  mensaje_id: string
  direccion: 'enviado' | 'recibido'
  remitente: string | null
  fecha: string | null
  asunto: string | null
  cuerpo: string | null
}

export type CasoBandeja = {
  resp: {
    id: string
    hilo_id: string
    mensaje_id: string | null
    order_number: string | null
    motivo: string | null
    gravedad: number | null
    riesgo_legal: boolean
    estado: string
    borrador_ia: string | null
    texto_enviado: string | null
    puede_responder: boolean | null
    motivo_no: string | null
    origen_envio: string | null
    editado_bool: boolean | null
    gmail_reply_id: string | null
    created_at: string
  }
  cliente: string | null
  asunto: string | null
  hilo: MensajeHilo[]
  orden: Record<string, unknown> | null
}

export async function getCaso(id: string): Promise<CasoBandeja | null> {
  const supa = createAdminClient()
  const { data: resp } = await supa.from('sac_respuestas').select('*').eq('id', id).maybeSingle()
  if (!resp) return null

  const { data: correoDisp } = resp.mensaje_id
    ? await supa.from('correos').select('remitente, asunto').eq('mensaje_id', resp.mensaje_id).maybeSingle()
    : { data: null }

  const { data: hiloRows } = await supa
    .from('correos')
    .select('mensaje_id, remitente, para, asunto, cuerpo, fecha')
    .eq('hilo_id', resp.hilo_id)
    .order('fecha', { ascending: true })

  const hilo: MensajeHilo[] = (hiloRows ?? []).map((c) => ({
    mensaje_id: c.mensaje_id,
    direccion: ES_TIENDA.test(c.remitente || '') ? ('enviado' as const) : ('recibido' as const),
    remitente: c.remitente,
    fecha: c.fecha,
    asunto: c.asunto,
    cuerpo: c.cuerpo,
  }))

  let orden: Record<string, unknown> | null = null
  if (resp.order_number) {
    const { data } = await supa.from('ordenes').select('*').eq('order_number', resp.order_number).maybeSingle()
    orden = data ?? null
  }

  return {
    resp,
    cliente: correoDisp?.remitente ?? null,
    asunto: correoDisp?.asunto ?? null,
    hilo,
    orden,
  }
}

// ---------- Configuración del módulo (para la sección Config) ----------
export type ConfigSac = Record<string, string>
export type PoliticaMotivo = { motivo: string; autonomia: string; umbral_confianza: number | null }

export async function getConfigSac(): Promise<{ config: ConfigSac; politicas: PoliticaMotivo[] }> {
  const supa = createAdminClient()
  const { data: cfg } = await supa
    .from('app_config')
    .select('clave, valor')
    .like('clave', 'SAC\\_%')
  const config: ConfigSac = {}
  for (const r of cfg ?? []) config[r.clave] = r.valor
  // horario también (no lleva prefijo SAC_)
  const { data: hor } = await supa.from('app_config').select('clave, valor').in('clave', ['HORARIO_ENVIO_DESDE', 'HORARIO_ENVIO_HASTA'])
  for (const r of hor ?? []) config[r.clave] = r.valor

  const { data: pol } = await supa.from('sac_policies').select('motivo, autonomia, umbral_confianza').order('motivo')
  return { config, politicas: (pol ?? []) as PoliticaMotivo[] }
}
