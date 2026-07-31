'use server'

import { getActividad, type EventoActividad } from '@/lib/supabase/actividad'

export async function accionActividad(): Promise<EventoActividad[]> {
  return getActividad(300)
}
