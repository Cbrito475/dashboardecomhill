// ============================================================================
// TENANT — el concepto central de la plataforma multi-empresa.
// Jerarquía: Empresa → Tiendas → Datos. Ninguna operación del core existe sin
// su TenantContext: el tipo obliga a saber SIEMPRE para qué empresa/tienda se
// trabaja (la fuga de datos se previene en compilación, no en code review).
// ============================================================================

export type EmpresaId = string // uuid
export type StoreId = string // uuid

export type TenantContext = {
  empresaId: EmpresaId
  storeId: StoreId
}

export type Empresa = {
  id: EmpresaId
  nombre: string
  activa: boolean
}

export type Tienda = {
  id: StoreId
  empresaId: EmpresaId
  nombre: string
  timezone: string | null
  firma: string | null
  emailDominio: string | null
}

// Tenant cero: todo lo histórico del sistema pertenece a Lorentina (EcomHill).
// Los adapters lo usan como default mientras dura la migración estranguladora.
export const TIENDA_LORENTINA: StoreId = '8452699c-8681-45ef-b83f-05e60e2fcb2c'
