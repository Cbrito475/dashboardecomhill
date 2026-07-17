import { getRangoDisponible } from '@/lib/supabase/queries'

// Rango activo desde los query params de la URL (el shell SPA los mantiene al cambiar
// de sección). Sin params, usa el rango completo disponible.
export async function getRangoActivo(
  sp: { desde?: string; hasta?: string }
): Promise<{ rango: { min: string; max: string }; desde: string; hasta: string }> {
  const rango = await getRangoDisponible()
  const desde = sp.desde || rango.min
  const hasta = sp.hasta || rango.max
  return { rango, desde, hasta }
}
