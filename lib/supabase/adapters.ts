// ============================================================================
// ADAPTERS Supabase de los puertos del core (fase 3, estrangulador).
//
// Hoy solo existe el tenant cero (Lorentina): cada método valida el
// TenantContext con exigirTenant() y delega en las funciones ya probadas de
// este directorio (comportamiento idéntico, congelado por tests). Cuando la
// plataforma sirva más tiendas (H2), estos adapters pasan a filtrar por
// ctx.storeId y ninguna firma cambia.
// ============================================================================

import { TIENDA_LORENTINA, type TenantContext } from '@/lib/core/tenant'
import type { BandejaPort, CierrePort, DisputasPort, RedesPort } from '@/lib/core/ports'
import { getBandeja, getBandejaCounts } from './sac'
import { getRedesLista, getRedesHilo, getRedesCounts } from './redes'
import { getDisputas, getDisputasCounts, getDisputasResumen } from './disputas'
import { getCierreDia } from './cierre'

// Guardia de aislamiento de la migración: mientras el acceso a datos no filtre
// por tienda, servir a otro tenant sería devolverle datos de Lorentina. Antes
// que esa fuga silenciosa, se corta acá con un error explícito.
export function exigirTenant(ctx: TenantContext): void {
  if (!ctx || ctx.storeId !== TIENDA_LORENTINA) {
    throw new Error(
      `Tenant no soportado todavía (storeId=${ctx?.storeId}): durante la migración solo se sirve la tienda Lorentina`
    )
  }
}

export const bandejaAdapter: BandejaPort = {
  lista: (ctx, bucket) => {
    exigirTenant(ctx)
    return getBandeja(bucket)
  },
  counts: (ctx) => {
    exigirTenant(ctx)
    return getBandejaCounts()
  },
}

export const redesAdapter: RedesPort = {
  lista: (ctx) => {
    exigirTenant(ctx)
    return getRedesLista()
  },
  hilo: (ctx, conversacionId) => {
    exigirTenant(ctx)
    return getRedesHilo(conversacionId)
  },
  counts: (ctx) => {
    exigirTenant(ctx)
    return getRedesCounts()
  },
}

export const disputasAdapter: DisputasPort = {
  lista: (ctx, bucket) => {
    exigirTenant(ctx)
    return getDisputas(bucket)
  },
  counts: (ctx) => {
    exigirTenant(ctx)
    return getDisputasCounts()
  },
  resumen: (ctx) => {
    exigirTenant(ctx)
    return getDisputasResumen()
  },
}

export const cierreAdapter: CierrePort = {
  dia: (ctx) => {
    exigirTenant(ctx)
    return getCierreDia()
  },
}
