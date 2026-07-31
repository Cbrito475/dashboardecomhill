import { createAdminClient } from '@/lib/supabase/admin'
import { type CierreDia } from '@/lib/core/cierre'

// FASE 2: los tipos, formateadores y el texto del cierre viven en lib/core/cierre.
// Este módulo re-exporta (estrangulador) y queda solo con el acceso a datos.
export * from '@/lib/core/cierre'

// Indicadores del día (día calendario de Chile). El cálculo vive en la función SQL
// sac_cierre_dia() para que sea una sola consulta y el criterio quede en un solo lugar.
export async function getCierreDia(): Promise<CierreDia | null> {
  const supa = createAdminClient()
  const { data, error } = await supa.rpc('sac_cierre_dia')
  if (error || !data) return null
  return data as CierreDia
}
