import { createAdminClient } from '@/lib/supabase/admin'
import { TIENDA_LORENTINA } from '@/lib/core/tenant'

// ============================================================================
// Tiendas de la plataforma (H2): la lista que alimenta el selector del panel.
// Hoy hay una sola empresa (el holding) y por eso se listan todas sus tiendas;
// cuando entren empresas de terceros, esto filtra por la empresa del perfil.
// ============================================================================

export type TiendaSelector = {
  id: string
  empresa_id: string
  nombre: string
  empresa: string
  timezone: string | null
  // Una tienda "aprovisionada" tiene sus workflows generados y datos fluyendo.
  // Mientras no exista el registro tienda→workflows (siguiente bloque de H2),
  // la única aprovisionada es el tenant cero: Lorentina.
  aprovisionada: boolean
}

export async function getTiendas(): Promise<TiendaSelector[]> {
  const supa = createAdminClient()
  const { data } = await supa
    .from('stores')
    .select('id, empresa_id, nombre, timezone, empresas(nombre)')
    .order('nombre')
  const rows = (data ?? []) as unknown as {
    id: string
    empresa_id: string
    nombre: string
    timezone: string | null
    empresas: { nombre: string } | null
  }[]
  return rows.map((r) => ({
    id: r.id,
    empresa_id: r.empresa_id,
    nombre: r.nombre,
    empresa: r.empresas?.nombre ?? '',
    timezone: r.timezone,
    aprovisionada: r.id === TIENDA_LORENTINA,
  }))
}
