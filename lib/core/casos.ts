// ============================================================================
// CORE · Casos — las DOS reglas maestras del dashboard (causa raíz y desenlace)
// y los estados del pedido. Dominio puro, movido tal cual desde
// lib/supabase/queries.ts (fase 2); comportamiento congelado por tests.
// ============================================================================

// Que termino pidiendo la clienta. Es el desenlace del caso, NO la causa: se cuenta
// aparte para que un mismo pedido no sume en dos barras.
export const DESENLACE_LABEL: Record<string, string> = {
  reembolso: 'Pidió que le devuelvan la plata',
  cambio: 'Pidió cambio o reenvío',
  esperando: 'Solo espera · ¿dónde está?',
  sin_exigir: 'Reclamó sin exigir nada',
  sin_peticion: 'Reclamó sin pedir nada concreto', // compat
}

// El pedido es la unidad del dashboard: cada uno termina en UNO de estos estados y
// los cinco suman el total de pedidos del periodo. No se cuentan correos.
export type EstadoPedido =
  | 'sin_contacto'
  | 'consulta'
  | 'reclamo_esperando'
  | 'reclamo_sin_pedir'
  | 'reclamo_cambio'
  | 'reclamo_plata'

export const ORDEN_ESTADOS: EstadoPedido[] = [
  'sin_contacto',
  'consulta',
  'reclamo_esperando',
  'reclamo_sin_pedir',
  'reclamo_cambio',
  'reclamo_plata',
]

export const ESTADO_LABEL: Record<EstadoPedido, string> = {
  sin_contacto: 'Sin contacto',
  consulta: 'Terminó en consulta',
  reclamo_esperando: 'Esperando · ¿dónde está?',
  reclamo_sin_pedir: 'Reclamó sin exigir nada',
  reclamo_cambio: 'Reclamo · pidió cambio o reenvío',
  reclamo_plata: 'Reclamo · pidió la plata de vuelta',
}

export const ESTADO_SUB: Record<EstadoPedido, string> = {
  sin_contacto: 'la clienta nunca escribió',
  consulta: 'solo preguntó "¿dónde está mi pedido?"',
  reclamo_esperando: 'espera el pedido / no llegó, sin exigir nada',
  reclamo_sin_pedir: 'problema del producto, pero no exigió solución',
  reclamo_cambio: 'quiere el producto: otra talla, otro modelo o reenvío',
  reclamo_plata: 'quiere que le devuelvan el dinero',
}

export const ESTADO_COLOR: Record<EstadoPedido, string> = {
  sin_contacto: 'var(--ok)',
  consulta: 'var(--ink-3)',
  reclamo_esperando: 'var(--ink-3)',
  reclamo_sin_pedir: 'var(--ink-2)',
  reclamo_cambio: 'var(--warn)',
  reclamo_plata: 'var(--crit)',
}

// ---------- CAUSA RAÍZ: una sola regla para TODO el dashboard ----------
// La usan la matriz de causas (Ejecutivo) y el panel del pedido, así nunca divergen.
// Cada pedido cae en UNA sola causa = la ÚLTIMA causa real que declaró el cliente
// (el reclamo evoluciona; lo más reciente es el problema actual). Se ignoran las
// consultas de estado y las peticiones de reembolso/cambio (eso es desenlace, no
// causa). Si dos causas caen en el mismo momento, gana la más grave.
const NO_CAUSA_MOTIVOS = new Set(['consulta_estado', 'reembolso_solicitado', 'cambio_solicitado'])
export function causaRaizDe(its: { motivo: string | null; fecha: string | null; gravedad: number | null }[]): string {
  const reales = its.filter((i) => i.motivo && !NO_CAUSA_MOTIVOS.has(i.motivo))
  if (reales.length === 0) return 'sin_causa_declarada'
  reales.sort((a, b) => {
    const fa = a.fecha || ''
    const fb = b.fecha || ''
    if (fa !== fb) return fa < fb ? -1 : 1
    return (a.gravedad || 0) - (b.gravedad || 0) // mismo momento -> la más grave queda al final
  })
  return reales[reales.length - 1].motivo as string
}

// DESENLACE (qué pidió el cliente): la ÚLTIMA petición, no un acumulado.
//  - reembolso / cambio: su última petición concreta.
//  - esperando: no pidió nada y su reclamo es solo de envío ("¿dónde está?" / no
//    llegó) → está esperando, no exigió nada.
//  - sin_exigir: no pidió nada pero SÍ tuvo un problema de producto/otro (se quejó
//    sin exigir solución).
// Misma función en todo el dashboard (matriz, estado, panel del pedido).
export type Desenlace = 'reembolso' | 'cambio' | 'esperando' | 'sin_exigir'
export function desenlaceDe(its: { motivo: string | null; fecha: string | null; gravedad: number | null; resolucion?: string | null }[]): Desenlace {
  // La última petición del cliente. Se detecta de dos formas equivalentes:
  //  - motivo reembolso_solicitado / cambio_solicitado (mensaje que es SOLO petición)
  //  - resolucion reembolso / cambio / reenvio (mensaje que trae problema Y petición)
  // Así un correo "mala calidad, quiero mi plata" cuenta como reembolso aunque su
  // motivo (la causa) sea calidad_material. Gana la más reciente.
  let ultima: { tipo: 'reembolso' | 'cambio'; fecha: string } | null = null
  for (const i of its) {
    let pet: 'reembolso' | 'cambio' | null = null
    if (i.motivo === 'reembolso_solicitado' || i.resolucion === 'reembolso') pet = 'reembolso'
    else if (i.motivo === 'cambio_solicitado' || i.resolucion === 'cambio' || i.resolucion === 'reenvio') pet = 'cambio'
    if (!pet) continue
    const f = i.fecha || ''
    if (!ultima || f >= ultima.fecha) ultima = { tipo: pet, fecha: f }
  }
  if (ultima) return ultima.tipo
  const causa = causaRaizDe(its)
  return causa === 'no_llego_aduana' || causa === 'sin_causa_declarada' ? 'esperando' : 'sin_exigir'
}
