import { createAdminClient } from '@/lib/supabase/admin'

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

// Días que faltan para el vencimiento. Negativo = ya se pasó el plazo.
export function diasRestantes(fechaLimite: string | null): number | null {
  if (!fechaLimite) return null
  const ms = new Date(fechaLimite).getTime() - Date.now()
  return Math.ceil(ms / 86400000)
}

export async function getDisputas(bucket: DisputaBucket = 'por_responder'): Promise<Disputa[]> {
  const supa = createAdminClient()
  const { data } = await supa
    .from('disputas')
    .select('id, pasarela, dispute_id, order_number, cargo_id, email_clienta, monto, moneda, motivo, estado, fecha_apertura, fecha_limite, evidencia_borrador, evidencia_enviada, accion_pendiente, accion_estado, accion_error, created_at, updated_at')
    .in('estado', BUCKETS_DISPUTA[bucket])
    // Lo más urgente primero: la que vence antes va arriba.
    .order('fecha_limite', { ascending: true, nullsFirst: false })
    .order('fecha_apertura', { ascending: false })
    .limit(300)
  return (data ?? []) as Disputa[]
}

export async function getDisputasCounts(): Promise<Record<DisputaBucket, number>> {
  const supa = createAdminClient()
  const buckets = Object.keys(BUCKETS_DISPUTA) as DisputaBucket[]
  const counts = await Promise.all(
    buckets.map(async (b) => {
      const { count } = await supa
        .from('disputas')
        .select('id', { count: 'exact', head: true })
        .in('estado', BUCKETS_DISPUTA[b])
      return [b, count ?? 0] as const
    })
  )
  return Object.fromEntries(counts) as Record<DisputaBucket, number>
}

export async function getDisputa(id: string): Promise<Disputa | null> {
  const supa = createAdminClient()
  const { data } = await supa.from('disputas').select('*').eq('id', id).maybeSingle()
  return (data as Disputa) ?? null
}
