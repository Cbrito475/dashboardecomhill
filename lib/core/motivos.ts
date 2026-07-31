// ============================================================================
// CORE · Motivos — la taxonomía del SAC y sus reglas derivadas.
// Dominio puro: sin imports de infraestructura. Movido tal cual desde
// lib/supabase/queries.ts (fase 2 del plan multi-empresa); su comportamiento
// está congelado por tests/caracterizacion/dominio-casos.test.ts.
// ============================================================================

export const MOTIVO_LABEL: Record<string, string> = {
  no_llego_aduana: 'No llegó / aduana',
  calidad_material: 'Calidad / material',
  roto_costura: 'Roto / costura',
  foto_distinta: 'Foto distinta a lo recibido',
  producto_equivocado: 'Producto equivocado',
  talla: 'Talla',
  reembolso_solicitado: 'Reembolso solicitado',
  cambio_solicitado: 'Cambio solicitado',
  consulta_estado: 'Consulta de estado',
  correccion_datos: 'Corrección de datos (dirección/email)',
  problema_pago: 'Problema de pago / cobro',
  sin_respuesta: 'Sin respuesta del SAC',
  consulta_producto: 'Consulta de producto (pre-venta)',
  factura_boleta: 'Factura / boleta',
  cancelacion: 'Cancelación de compra',
  insatisfaccion_estafa: 'Insatisfacción / acusa estafa',
  otro: 'Otro',
  sin_causa_declarada: 'Pidió sin declarar causa',
}

// Descripción corta de cada causa (para el tooltip de la matriz de causas).
export const MOTIVO_DESC: Record<string, string> = {
  no_llego_aduana: 'El pedido no llegó: está trabado en aduana, en tránsito o perdido.',
  calidad_material: 'La tela o el material no cumple lo que esperaba la clienta.',
  roto_costura: 'Llegó roto, descosido o dañado.',
  foto_distinta: 'Lo que recibió no se parece a la foto de la publicación.',
  producto_equivocado: 'Le enviaron un producto distinto al que compró.',
  talla: 'La talla no le calza o no corresponde a la tabla.',
  correccion_datos: 'Pide corregir la dirección o el email del pedido.',
  problema_pago: 'Problema con el cobro o el pago.',
  cancelacion: 'Quiere cancelar la compra.',
  insatisfaccion_estafa: 'Está insatisfecha o acusa que es una estafa.',
  consulta_producto: 'Consulta previa a la compra sobre el producto.',
  factura_boleta: 'Pide factura o boleta.',
  sin_respuesta: 'Reclama que el SAC no le respondió.',
  otro: 'Otro motivo que no entra en las categorías.',
  sin_causa_declarada: 'Reclamó o pidió algo sin declarar una causa concreta.',
}

// Gravedad de negocio por motivo (5 = peor). Define qué problema mostrar primero
// en la tabla: no el más frecuente, sino el más grave que igual se repite.
export const MOTIVO_GRAVEDAD: Record<string, number> = {
  insatisfaccion_estafa: 5,
  no_llego_aduana: 5,
  producto_equivocado: 4,
  foto_distinta: 4,
  roto_costura: 3,
  calidad_material: 3,
  problema_pago: 3,
  sin_respuesta: 3,
  talla: 2,
  cancelacion: 2,
  correccion_datos: 1,
  factura_boleta: 1,
  otro: 1,
  sin_causa_declarada: 1,
}

// Nivel visual del chip según la gravedad: rojo (crítico) / ámbar (medio) / neutro.
export function nivelMotivo(motivo: string): 'crit' | 'warn' | 'leve' {
  const g = MOTIVO_GRAVEDAD[motivo] ?? 1
  return g >= 4 ? 'crit' : g === 3 ? 'warn' : 'leve'
}

// Categoría por DUEÑO DE LA SOLUCIÓN (dónde se arregla), no por tipo de problema.
// Cuatro grupos, cada uno = un lugar claro adónde ir:
//  - tienda:   lo arreglo yo editando la ficha en Shopify (barato, en tu control)
//  - producto: se resuelve con la proveedora (QC / apretar fábrica / apagar)
//  - envio:    se resuelve mejorando despacho o cambiando carrier
//  - gestion:  no tiene fix de raíz, solo se atiende bien y rápido
// Causas ambiguas (talla, no_llego_aduana): se asignan a su dueño por defecto
// según la regla práctica del diagnóstico (talla→tienda, aduana→envío).
export type GrupoCausa = 'tienda' | 'producto' | 'envio' | 'gestion'

export const GRUPO_MOTIVO: Record<string, GrupoCausa> = {
  // 1 · Lo arreglo yo (editar la tienda)
  talla: 'tienda',
  correccion_datos: 'tienda',
  // 2 · Producto (proveedora / fábrica)
  foto_distinta: 'producto',
  calidad_material: 'producto',
  roto_costura: 'producto',
  producto_equivocado: 'producto',
  // 3 · Envío (proveedora / courier)
  no_llego_aduana: 'envio',
  // 4 · Gestión del cliente (sin fix de raíz)
  cancelacion: 'gestion',
  sin_causa_declarada: 'gestion',
  consulta_producto: 'gestion',
  factura_boleta: 'gestion',
  insatisfaccion_estafa: 'gestion',
  problema_pago: 'gestion',
  sin_respuesta: 'gestion',
  otro: 'gestion',
}

export const GRUPO_LABEL: Record<GrupoCausa, string> = {
  tienda: 'Tienda · lo arreglo yo',
  producto: 'Producto · proveedora',
  envio: 'Envío · courier',
  gestion: 'Gestión del cliente',
}

export const GRUPO_ORDEN: Record<GrupoCausa, number> = {
  tienda: 0,
  producto: 1,
  envio: 2,
  gestion: 3,
}

export function grupoMotivo(m: string): GrupoCausa {
  return GRUPO_MOTIVO[m] ?? 'gestion'
}

// La sección Productos evalúa solo los reclamos cuyo arreglo depende de la tienda
// (lo arreglo yo: talla, datos) o del proveedor (producto: foto distinta, calidad,
// roto, equivocado). Excluye envío/courier y gestión del cliente, que no dicen
// nada de si el producto sirve o no.
export function esGrupoProducto(m: string): boolean {
  const g = grupoMotivo(m)
  return g === 'tienda' || g === 'producto'
}
