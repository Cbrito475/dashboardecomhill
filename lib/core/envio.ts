// ============================================================================
// CORE · Envío — etiquetas y semántica de los estados de ParcelPanel.
// Dominio puro, movido tal cual desde lib/supabase/queries.ts (fase 2).
// ============================================================================

// Estados de envio que devuelve ParcelPanel. 'sin_dato' es nuestro: el pedido no
// tiene tracking cargado (todavia), y se muestra aparte para no ensuciar los %.
export const ENVIO_LABEL: Record<string, string> = {
  delivered: 'Entregado',
  transit: 'En tránsito',
  info_received: 'Etiqueta creada',
  pending: 'Pendiente',
  pickup: 'Listo para retiro',
  exception: 'Excepción / problema',
  expired: 'Vencido (se perdió)',
  sin_tracking: 'Sin tracking en ParcelPanel',
  sin_dato: 'Sin dato de envío',
}

export const ENVIO_SUB: Record<string, string> = {
  delivered: 'llegó a destino',
  transit: 'viajando',
  info_received: 'el courier aún no lo recibió',
  pending: 'sin movimiento',
  pickup: 'esperando que lo retiren',
  exception: 'el courier reportó un problema',
  expired: 'el tracking murió sin entregar',
  sin_tracking: 'ParcelPanel no lo conoce',
  sin_dato: 'todavía no consultado',
}

// Rojo = el envio fallo. Ambar = en riesgo. Verde = ok. Gris = no sabemos.
export const ENVIO_COLOR: Record<string, string> = {
  delivered: 'var(--ok)',
  transit: 'var(--ink-3)',
  info_received: 'var(--warn)',
  pending: 'var(--warn)',
  pickup: 'var(--warn)',
  exception: 'var(--crit)',
  expired: 'var(--crit)',
  sin_tracking: 'var(--ink-3)',
  sin_dato: 'var(--ink-3)',
}
