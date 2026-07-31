import { createAdminClient } from '@/lib/supabase/admin'

// Log unificado del sistema (vista actividad_sistema): acciones humanas (audit_log),
// del bot/IA y de los workflows de n8n, en una sola línea de tiempo.

export type EventoActividad = {
  fecha: string
  origen: 'humano' | 'bot' | 'n8n'
  actor: string
  accion: string
  entidad: string | null
  entidad_id: string | null
  detalle: string | null
}

export async function getActividad(limit = 300): Promise<EventoActividad[]> {
  const supa = createAdminClient()
  const { data } = await supa
    .from('actividad_sistema')
    .select('*')
    .order('fecha', { ascending: false })
    .limit(limit)
  return (data ?? []) as EventoActividad[]
}
