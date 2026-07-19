// Roles del módulo SAC. La autorización real se hace SIEMPRE server-side (en las
// server actions), leyendo perfiles.rol del usuario autenticado. La UI solo usa esto
// para ocultar botones — nunca es la fuente de verdad de permisos.
export type Rol = 'admin' | 'supervisor' | 'agente' | 'lector'

const RANK: Record<Rol, number> = { lector: 0, agente: 1, supervisor: 2, admin: 3 }

// ¿El rol alcanza el mínimo pedido? (admin ≥ supervisor ≥ agente ≥ lector)
export function puede(rol: Rol | null | undefined, min: Rol): boolean {
  if (!rol) return false
  return (RANK[rol] ?? -1) >= RANK[min]
}

export const ROL_LABEL: Record<Rol, string> = {
  admin: 'Administrador',
  supervisor: 'Supervisor',
  agente: 'Agente',
  lector: 'Lector',
}
