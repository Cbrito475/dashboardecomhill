import { createAdminClient } from '@/lib/supabase/admin'

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
  // Una tienda "aprovisionada" tiene al menos un servicio activo en el registro
  // tienda_servicios (el resultado del onboarding + aprovisionador).
  aprovisionada: boolean
}

export async function getTiendas(): Promise<TiendaSelector[]> {
  const supa = createAdminClient()
  const [{ data }, { data: prov }] = await Promise.all([
    supa.from('stores').select('id, empresa_id, nombre, timezone, empresas(nombre)').order('nombre'),
    supa.from('tienda_servicios').select('store_id').eq('estado', 'activo'),
  ])
  const conServicios = new Set(((prov ?? []) as { store_id: string }[]).map((r) => r.store_id))
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
    aprovisionada: conServicios.has(r.id),
  }))
}
