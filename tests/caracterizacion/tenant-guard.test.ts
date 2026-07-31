// La garantía central de la fase 3: ninguna operación de datos se sirve a un
// tenant que no sea el soportado. Mientras dura la migración estranguladora,
// el adapter corta con error explícito antes de devolver datos de otra tienda.
import { describe, it, expect } from 'vitest'
import { exigirTenant } from '@/lib/supabase/adapters'
import { TIENDA_LORENTINA, type TenantContext } from '@/lib/core/tenant'

const EMPRESA = 'e0000000-0000-0000-0000-000000000001'

describe('guardia de tenant (adapters)', () => {
  it('acepta el tenant cero (Lorentina)', () => {
    const ctx: TenantContext = { empresaId: EMPRESA, storeId: TIENDA_LORENTINA }
    expect(() => exigirTenant(ctx)).not.toThrow()
  })

  it('rechaza cualquier otra tienda con error explícito', () => {
    const ctx: TenantContext = { empresaId: EMPRESA, storeId: '11111111-2222-3333-4444-555555555555' }
    expect(() => exigirTenant(ctx)).toThrow(/solo se sirve la tienda Lorentina/)
  })

  it('rechaza un contexto ausente (nunca datos sin tenant declarado)', () => {
    expect(() => exigirTenant(undefined as unknown as TenantContext)).toThrow()
  })
})
