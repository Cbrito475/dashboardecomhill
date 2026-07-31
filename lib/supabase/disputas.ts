import { createAdminClient } from '@/lib/supabase/admin'
import { BUCKETS_DISPUTA, type Disputa, type DisputaBucket } from '@/lib/core/disputas'

// FASE 2: el dominio puro de disputas vive en lib/core/disputas. Este módulo
// re-exporta (estrangulador) y queda solo con el acceso a datos.
export * from '@/lib/core/disputas'

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

export type ResumenDisputas = {
  abiertas: number
  montoAbierto: number
  ganadas: number
  montoGanado: number
  perdidas: number
  montoPerdido: number
  cerradas: number
}

// La pregunta que contesta la sección cuando no hay nada urgente: cuánta plata se
// pelea, cuánta se recuperó y cuánta se perdió.
export async function getDisputasResumen(): Promise<ResumenDisputas> {
  const supa = createAdminClient()
  const { data } = await supa.from('disputas').select('estado, monto')
  const filas = (data ?? []) as { estado: string; monto: number | null }[]
  const acc = { abiertas: 0, montoAbierto: 0, ganadas: 0, montoGanado: 0, perdidas: 0, montoPerdido: 0, cerradas: 0 }
  for (const f of filas) {
    const m = f.monto || 0
    if (f.estado === 'needs_response' || f.estado === 'under_review') {
      acc.abiertas += 1
      acc.montoAbierto += m
    } else if (f.estado === 'won') {
      acc.ganadas += 1
      acc.montoGanado += m
      acc.cerradas += 1
    } else {
      // perdidas, aceptadas y cerradas: plata que no volvió
      acc.perdidas += 1
      acc.montoPerdido += m
      acc.cerradas += 1
    }
  }
  return acc
}

export async function getDisputa(id: string): Promise<Disputa | null> {
  const supa = createAdminClient()
  const { data } = await supa.from('disputas').select('*').eq('id', id).maybeSingle()
  return (data as Disputa) ?? null
}
