// ============================================================================
// PUERTOS del core hexagonal (fase 3 del plan multi-empresa).
//
// Cada puerto es la interfaz por la que el dominio pide datos, y NINGUNA
// operación existe sin TenantContext: el compilador obliga a declarar para qué
// empresa/tienda se trabaja. La fuga de datos entre empresas se previene en
// compilación, no en code review.
//
// Los adapters (lib/supabase/adapters.ts) implementan estos puertos. Durante la
// migración estranguladora solo existe el tenant cero (Lorentina): el adapter
// valida el TenantContext y delega en las funciones ya probadas. Cuando entren
// Giuliani/Alegres (H2), el adapter pasa a filtrar por ctx.storeId y las firmas
// no cambian — el panel ya habla este idioma.
// ============================================================================

import type { TenantContext } from './tenant'
import type { BandejaBucket, BandejaItem } from './bandeja'
import type { RedCaso, RedMensaje, RedesCounts } from './redes'
import type { Disputa, DisputaBucket, ResumenDisputas } from './disputas'
import type { CierreDia } from './cierre'

export interface BandejaPort {
  lista(ctx: TenantContext, bucket: BandejaBucket): Promise<BandejaItem[]>
  counts(ctx: TenantContext): Promise<Record<BandejaBucket, number>>
}

export interface RedesPort {
  lista(ctx: TenantContext): Promise<RedCaso[]>
  hilo(ctx: TenantContext, conversacionId: string): Promise<RedMensaje[]>
  counts(ctx: TenantContext): Promise<RedesCounts>
}

export interface DisputasPort {
  lista(ctx: TenantContext, bucket: DisputaBucket): Promise<Disputa[]>
  counts(ctx: TenantContext): Promise<Record<DisputaBucket, number>>
  resumen(ctx: TenantContext): Promise<ResumenDisputas>
}

export interface CierrePort {
  dia(ctx: TenantContext): Promise<CierreDia | null>
}
