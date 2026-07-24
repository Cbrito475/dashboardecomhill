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
  // Una disputa no es un correo, pero el SAC la trabaja desde la misma cola: si la
  // clienta se saltó al SAC y fue al banco, tiene que aparecer donde el SAC mira.
  tipo: 'correo' | 'disputa'
}

// Buckets de la bandeja: agrupan los estados de sac_respuestas en 4 vistas operativas.
export type BandejaBucket = 'por_responder' | 'respondidos' | 'cerrados' | 'descartados'
export const BUCKETS: Record<BandejaBucket, string[]> = {
  por_responder: ['nuevo', 'esperando_humano'],
  respondidos: ['en_cola', 'enviado'],
  cerrados: ['cerrado'],
  descartados: ['no_responder'],
}

// Cola de la bandeja para un bucket (por defecto lo que falta responder).
export async function getBandeja(bucket: BandejaBucket = 'por_responder'): Promise<BandejaItem[]> {
  const supa = createAdminClient()
  const q = supa
    .from('sac_respuestas')
    .select('id, hilo_id, mensaje_id, order_number, motivo, gravedad, riesgo_legal, estado, puede_responder, origen_envio, editado_bool, created_at')
    .in('estado', BUCKETS[bucket])
    .order('gravedad', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(300)
  const { data: rows } = await q
  const lista = rows ?? []

  const mids = Array.from(new Set(lista.map((r) => r.mensaje_id).filter(Boolean))) as string[]
  const cmap = new Map<string, { remitente: string | null; asunto: string | null; fecha: string | null }>()
  if (mids.length) {
    const { data: correos } = await supa.from('correos').select('mensaje_id, remitente, asunto, fecha').in('mensaje_id', mids)
    for (const c of correos ?? []) cmap.set(c.mensaje_id, { remitente: c.remitente, asunto: c.asunto, fecha: c.fecha })
  }

  const correos: BandejaItem[] = lista.map((r) => {
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
      tipo: 'correo' as const,
    }
  })

  const disputas = await disputasEnBandeja(bucket)
  // Las disputas primero: son lo más grave que puede haber en la cola.
  return [...disputas, ...correos]
}

// Las disputas abiertas entran a la Bandeja como un caso más. Gravedad 4 siempre: la
// clienta ya escaló al banco, no hay nada más urgente.
async function disputasEnBandeja(bucket: BandejaBucket): Promise<BandejaItem[]> {
  const estados =
    bucket === 'por_responder'
      ? ['needs_response']
      : bucket === 'respondidos'
        ? ['under_review']
        : bucket === 'cerrados'
          ? ['won', 'lost', 'accepted', 'closed']
          : []
  if (!estados.length) return []

  const supa = createAdminClient()
  const { data } = await supa
    .from('disputas')
    .select('id, order_number, email_clienta, monto, moneda, motivo, estado, fecha_apertura, pasarela')
    .in('estado', estados)
    .order('fecha_limite', { ascending: true, nullsFirst: false })
    .limit(50)

  return (data ?? []).map((d) => ({
    id: d.id,
    hilo_id: '',
    mensaje_id: null,
    order_number: d.order_number,
    motivo: d.motivo,
    gravedad: 4,
    riesgo_legal: true,
    estado: d.estado,
    puede_responder: false,
    origen_envio: null,
    editado_bool: null,
    cliente: d.email_clienta,
    asunto: `Disputa en ${d.pasarela} por ${d.moneda?.toUpperCase() || ''} ${d.monto ?? ''}`.trim(),
    fecha: d.fecha_apertura,
    tipo: 'disputa' as const,
  }))
}

// Contadores por bucket para los chips de la bandeja (4 count-queries en paralelo).
export async function getBandejaCounts(): Promise<Record<BandejaBucket, number>> {
  const supa = createAdminClient()
  const buckets = Object.keys(BUCKETS) as BandejaBucket[]
  const DISPUTAS_POR_BUCKET: Partial<Record<BandejaBucket, string[]>> = {
    por_responder: ['needs_response'],
    respondidos: ['under_review'],
    cerrados: ['won', 'lost', 'accepted', 'closed'],
  }
  const counts = await Promise.all(
    buckets.map(async (b) => {
      const [correos, disputas] = await Promise.all([
        supa.from('sac_respuestas').select('id', { count: 'exact', head: true }).in('estado', BUCKETS[b]),
        DISPUTAS_POR_BUCKET[b]
          ? supa.from('disputas').select('id', { count: 'exact', head: true }).in('estado', DISPUTAS_POR_BUCKET[b]!)
          : Promise.resolve({ count: 0 }),
      ])
      return [b, (correos.count ?? 0) + (disputas.count ?? 0)] as const
    })
  )
  return Object.fromEntries(counts) as Record<BandejaBucket, number>
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
