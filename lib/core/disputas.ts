// ============================================================================
// CORE · Disputas — entidad, buckets operativos y etiquetas de las pasarelas.
// Dominio puro, movido tal cual desde lib/supabase/disputas.ts (fase 2).
// ============================================================================

export type Disputa = {
  id: string
  pasarela: 'stripe' | 'airwallex'
  dispute_id: string
  order_number: string | null
  cargo_id: string | null
  email_clienta: string | null
  monto: number | null
  moneda: string | null
  motivo: string | null
  estado: string
  fecha_apertura: string | null
  fecha_limite: string | null
  evidencia_borrador: string | null
  evidencia_enviada: string | null
  accion_pendiente: string | null
  accion_estado: string | null
  accion_error: string | null
  created_at: string
  updated_at: string
}

// Los estados de las pasarelas se agrupan en 3 vistas operativas: lo que hay que
// contestar (con plazo), lo que ya se peleó y espera veredicto, y lo terminado.
export type DisputaBucket = 'por_responder' | 'en_revision' | 'cerradas'
export const BUCKETS_DISPUTA: Record<DisputaBucket, string[]> = {
  por_responder: ['needs_response'],
  en_revision: ['under_review'],
  cerradas: ['won', 'lost', 'accepted', 'closed'],
}

export const ESTADO_DISPUTA_LABEL: Record<string, string> = {
  needs_response: 'Hay que responder',
  under_review: 'En revisión de la pasarela',
  won: 'Ganada',
  lost: 'Perdida',
  accepted: 'Aceptada (se devolvió)',
  closed: 'Cerrada',
}

// Motivos que declaran las pasarelas, en castellano de negocio.
export const MOTIVO_DISPUTA_LABEL: Record<string, string> = {
  fraudulent: 'Desconoce la compra (fraude)',
  FRAUDULENT: 'Desconoce la compra (fraude)',
  product_not_received: 'Dice que no le llegó',
  PRODUCT_NOT_RECEIVED: 'Dice que no le llegó',
  product_unacceptable: 'Producto no era lo esperado',
  PRODUCT_UNACCEPTABLE: 'Producto no era lo esperado',
  duplicate: 'Cobro duplicado',
  DUPLICATE: 'Cobro duplicado',
  subscription_canceled: 'Suscripción cancelada',
  credit_not_processed: 'No se le hizo el reembolso',
  CREDIT_NOT_PROCESSED: 'No se le hizo el reembolso',
  unrecognized: 'No reconoce el cobro',
  general: 'General',
}

export type ResumenDisputas = {
  abiertas: number
  montoAbierto: number
  ganadas: number
  montoGanado: number
  perdidas: number
  montoPerdido: number
  cerradas: number
}

// Días que faltan para el vencimiento. Negativo = ya se pasó el plazo.
export function diasRestantes(fechaLimite: string | null): number | null {
  if (!fechaLimite) return null
  const ms = new Date(fechaLimite).getTime() - Date.now()
  return Math.ceil(ms / 86400000)
}
