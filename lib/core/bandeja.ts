// ============================================================================
// CORE · Bandeja — la unidad de trabajo del SAC y sus buckets operativos.
// Dominio puro, movido tal cual desde lib/supabase/sac.ts (fase 2).
// ============================================================================

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
  borrador: string | null // adelanto del borrador de la IA, para triar sin abrir
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
