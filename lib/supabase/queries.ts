import { createAdminClient } from './admin'

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

export const ESTADO_COLOR: Record<EstadoPedido, string> = {
  sin_contacto: 'var(--ok)',
  consulta: 'var(--ink-3)',
  reclamo_esperando: 'var(--ink-3)',
  reclamo_sin_pedir: 'var(--ink-2)',
  reclamo_cambio: 'var(--warn)',
  reclamo_plata: 'var(--crit)',
}

const CRIT_MOTIVOS = new Set(['calidad_material', 'roto_costura', 'foto_distinta'])

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

export type ProblemaProducto = { motivo: string; n: number; pct: number; grav: number }

export type ProductoFila = {
  product_id: string
  producto_titulo: string
  proveedor: string | null
  pedidos: number
  reclamos: number
  pct_reclamo: number
  // Desglose de desenlace sobre los reclamos del producto (en el rango): cuántos
  // no pidieron nada, cuántos cambio y cuántos reembolso.
  desenlace: { sin_peticion: number; cambio: number; reembolso: number }
  total_ventas: number
  precio_unitario: number
  monto_reembolsado: number
  monto_solicitado: number
  ordenes_expired: number
  motivo_dominante: string | null
  pct_aduana: number
  pct_calidad: number
  // Problemas del producto ordenados por gravedad (no por frecuencia): el [0] es
  // el más grave que se repite, el resto salen en el hover de la tabla.
  problemas: ProblemaProducto[]
  estado_playbook: 'ok' | 'vigilar' | 'apagar'
}

export type MotivoFila = { motivo: string; n: number; pct: number }

type OrdenRow = {
  order_number: string
  fecha_orden: string | null
  email_clienta: string | null
  monto_clp: number | null
  estado_financiero: string | null
  monto_reembolsado: number | null
  carrier: string | null
  status_envio: string | null
  dias_transito: number | null
  etapa_actual: string | null
  reclamo: boolean
  disputa_stripe: boolean
}

type ItemRow = {
  order_number: string
  shopify_product_id: string | null
  producto_titulo: string | null
  proveedor: string | null
  cantidad: number | null
  precio: number | null
  monto_reembolsado_item: number | null
}

type InteraccionRow = {
  id: string
  fecha: string
  order_number: string | null
  canal: string
  email_clienta: string | null
  motivo: string | null
  resolucion: string | null
  gravedad: number | null
  resumen: string | null
  producto_titulo: string | null
  estado: string
  riesgo_legal: boolean
  clasificacion: string | null
}

export type ClasificacionFila = {
  clasificacion: string
  correos: number
  conversaciones: number
  reclamos_unicos: number
}

// Clasificación de interacciones (correos) y conversaciones (hilos) en 3 baldes,
// filtrada por la fecha del reclamo dentro del rango pedido.
export async function getClasificacion(desde: string, hasta: string): Promise<ClasificacionFila[]> {
  const supa = createAdminClient()
  const { data } = await supa.rpc('clasificacion_periodo', { p_desde: desde, p_hasta: hasta })
  return (data as ClasificacionFila[]) ?? []
}

export type CoberturaEnlace = {
  total: number
  con_pedido: number
  nro_sin_pedido: number
  sin_nro: number
  pct_con_pedido: number
}

// Cobertura del enlace reclamo->pedido, filtrada por la fecha del reclamo en el rango pedido.
export async function getCoberturaEnlace(desde: string, hasta: string): Promise<CoberturaEnlace> {
  const supa = createAdminClient()
  const { data } = await supa.rpc('cobertura_enlace', { p_desde: desde, p_hasta: hasta })
  const row = Array.isArray(data) ? data[0] : data
  return (
    (row as CoberturaEnlace) ?? {
      total: 0,
      con_pedido: 0,
      nro_sin_pedido: 0,
      sin_nro: 0,
      pct_con_pedido: 0,
    }
  )
}

export async function getRangoDisponible(): Promise<{ min: string; max: string }> {
  const supa = createAdminClient()
  const { data } = await supa
    .from('ordenes')
    .select('fecha_orden')
    .not('fecha_orden', 'is', null)
    .order('fecha_orden', { ascending: true })
    .limit(1)
  const { data: maxData } = await supa
    .from('ordenes')
    .select('fecha_orden')
    .not('fecha_orden', 'is', null)
    .order('fecha_orden', { ascending: false })
    .limit(1)
  return {
    min: data?.[0]?.fecha_orden ?? '2026-02-01',
    max: maxData?.[0]?.fecha_orden ?? new Date().toISOString().slice(0, 10),
  }
}


async function getUmbrales() {
  const supa = createAdminClient()
  const { data } = await supa
    .from('app_config')
    .select('clave, valor')
    .in('clave', ['UMBRAL_RECLAMO_VIGILAR_PCT', 'UMBRAL_RECLAMO_APAGAR_PCT'])
  const map = new Map((data ?? []).map((r) => [r.clave, Number(r.valor)]))
  return {
    vigilar: map.get('UMBRAL_RECLAMO_VIGILAR_PCT') ?? 12,
    apagar: map.get('UMBRAL_RECLAMO_APAGAR_PCT') ?? 20,
  }
}

// Trae TODO lo necesario para el dashboard, scopeado a pedidos con fecha_orden en [desde, hasta].
// Todo se arma en memoria a partir de las ordenes del rango — nada se filtra por fecha del reclamo.
export async function getDashboardData(desde: string, hasta: string) {
  const supa = createAdminClient()

  // Supabase/PostgREST corta en 1000 filas por request -> paginar con .range()
  const fetchAllOrdenes = async () => {
    const cols =
      'order_number, fecha_orden, email_clienta, monto_clp, estado_financiero, monto_reembolsado, carrier, status_envio, dias_transito, etapa_actual, reclamo, disputa_stripe'
    const page = 1000
    const acc: OrdenRow[] = []
    for (let from = 0; ; from += page) {
      const { data, error } = await supa
        .from('ordenes')
        .select(cols)
        .gte('fecha_orden', desde)
        .lte('fecha_orden', hasta)
        .order('order_number', { ascending: true })
        .range(from, from + page - 1)
      if (error) throw error
      const batch = (data ?? []) as OrdenRow[]
      acc.push(...batch)
      if (batch.length < page) break
    }
    return acc
  }

  const [ordenes, umbrales] = await Promise.all([fetchAllOrdenes(), getUmbrales()])
  const orderNumbers = ordenes.map((o) => o.order_number)

  const chunk = <T,>(arr: T[], size: number) => {
    const out: T[][] = []
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
    return out
  }

  // Trae todas las filas de una tabla filtradas por order_number, paginando el .in()
  // en lotes de order_numbers y con .range() dentro de cada lote (tope 1000/req de PostgREST).
  const fetchByOrders = async <T,>(table: string, cols: string): Promise<T[]> => {
    if (!orderNumbers.length) return []
    const acc: T[] = []
    for (const batch of chunk(orderNumbers, 300)) {
      const page = 1000
      for (let from = 0; ; from += page) {
        const { data, error } = await supa
          .from(table)
          .select(cols)
          .in('order_number', batch)
          .range(from, from + page - 1)
        if (error) throw error
        const rows = (data ?? []) as T[]
        acc.push(...rows)
        if (rows.length < page) break
      }
    }
    return acc
  }

  const [items, interacciones] = await Promise.all([
    fetchByOrders<ItemRow>(
      'orden_items',
      'order_number, shopify_product_id, producto_titulo, proveedor, cantidad, precio, monto_reembolsado_item'
    ),
    fetchByOrders<InteraccionRow>(
      'interacciones',
      'id, fecha, order_number, canal, email_clienta, motivo, resolucion, gravedad, resumen, producto_titulo, estado, riesgo_legal, clasificacion'
    ),
  ])

  // Solo las interacciones que son reclamo real (con pedido) alimentan las métricas
  // de reclamo; el ruido (no_reclamo) queda afuera de todo cálculo.
  const reclamos = interacciones.filter((i) => i.clasificacion === 'reclamo_con_pedido')

  // ---------- 01 Resumen ----------
  // Se derivan de las interacciones reales (NO de la bandera ordenes.reclamo, que
  // WF-A puede haber pisado al recargar Shopify). Distinguimos:
  //  - reclamo real  = el pedido tuvo >=1 interaccion con motivo != consulta_estado
  //  - solo consulta = el pedido solo tuvo interacciones de motivo consulta_estado
  const motivosPorOrden = new Map<string, Set<string>>()
  for (const i of reclamos) {
    if (!i.order_number) continue
    if (!motivosPorOrden.has(i.order_number)) motivosPorOrden.set(i.order_number, new Set())
    motivosPorOrden.get(i.order_number)!.add(i.motivo || 'otro')
  }
  const ordenesReclamoReal = new Set<string>()
  const ordenesSoloConsulta = new Set<string>()
  for (const [on, ms] of motivosPorOrden) {
    if ([...ms].some((m) => m !== 'consulta_estado')) ordenesReclamoReal.add(on)
    else ordenesSoloConsulta.add(on)
  }

  const totalPedidos = ordenes.length
  const pedidosConReclamo = ordenes.filter((o) => ordenesReclamoReal.has(o.order_number)).length
  const pedidosSoloConsulta = ordenes.filter((o) => ordenesSoloConsulta.has(o.order_number)).length
  const pctProblema = totalPedidos > 0 ? Math.round((pedidosConReclamo / totalPedidos) * 1000) / 10 : 0
  const perdidaTotal = ordenes.reduce((a, o) => a + (o.monto_reembolsado || 0), 0)

  // Promedio de reclamos (interacciones de reclamo real) por pedido con reclamo, en el rango.
  const ordenesEnRango = new Set(ordenes.map((o) => o.order_number))
  const interaccionesReclamoReal = reclamos.filter(
    (i) => i.order_number && ordenesEnRango.has(i.order_number) && (i.motivo || 'otro') !== 'consulta_estado'
  ).length
  const reclamosPorPedido = pedidosConReclamo > 0 ? interaccionesReclamoReal / pedidosConReclamo : 0

  // Funnel: universo -> con contacto -> con reclamo -> critico
  const pedidosConContacto = pedidosConReclamo + pedidosSoloConsulta
  const ordenesCriticas = new Set<string>()
  for (const it of reclamos) {
    if (it.order_number && ordenesEnRango.has(it.order_number) && (it.riesgo_legal || it.canal !== 'mail')) {
      ordenesCriticas.add(it.order_number)
    }
  }
  const pedidosCriticos = ordenesCriticas.size

  // Reembolsos: solicitados (por SAC) vs hechos (efectivos en Shopify)
  const solicitadosSet = new Set(
    reclamos
      .filter((i) => i.resolucion === 'reembolso' && i.order_number && ordenesEnRango.has(i.order_number))
      .map((i) => i.order_number as string)
  )
  const reembSolicitados = solicitadosSet.size
  const reembHechos = ordenes.filter((o) => (o.monto_reembolsado || 0) > 0).length
  const reembSolicitadosCumplidos = ordenes.filter(
    (o) => solicitadosSet.has(o.order_number) && (o.monto_reembolsado || 0) > 0
  ).length
  // Montos en $: solicitado (valor de los pedidos que pidieron), pagado (reembolsado), falta
  const ordenesSolicitadas = ordenes.filter((o) => solicitadosSet.has(o.order_number))
  const montoSolicitado = ordenesSolicitadas.reduce((a, o) => a + (o.monto_clp || 0), 0)
  const montoPagado = ordenesSolicitadas.reduce((a, o) => a + (o.monto_reembolsado || 0), 0)
  const montoFalta = Math.max(0, montoSolicitado - montoPagado)

  // periodo anterior de igual duracion, para los deltas
  const dIni = new Date(desde)
  const dFin = new Date(hasta)
  const dias = Math.max(1, Math.round((dFin.getTime() - dIni.getTime()) / 86400000))
  const prevHasta = new Date(dIni.getTime() - 86400000)
  const prevDesde = new Date(prevHasta.getTime() - dias * 86400000)
  const prevDesdeStr = prevDesde.toISOString().slice(0, 10)
  const prevHastaStr = prevHasta.toISOString().slice(0, 10)
  const [{ count: prevTotal }, { count: prevConReclamo }, { data: prevReemb }] = await Promise.all([
    supa
      .from('ordenes')
      .select('*', { count: 'exact', head: true })
      .gte('fecha_orden', prevDesdeStr)
      .lte('fecha_orden', prevHastaStr),
    supa
      .from('ordenes')
      .select('*', { count: 'exact', head: true })
      .eq('reclamo', true)
      .gte('fecha_orden', prevDesdeStr)
      .lte('fecha_orden', prevHastaStr),
    supa
      .from('ordenes')
      .select('monto_reembolsado')
      .gt('monto_reembolsado', 0)
      .gte('fecha_orden', prevDesdeStr)
      .lte('fecha_orden', prevHastaStr),
  ])
  const prevPct = (prevTotal ?? 0) > 0 ? Math.round(((prevConReclamo ?? 0) / (prevTotal ?? 1)) * 1000) / 10 : 0
  const prevPerdida = (prevReemb ?? []).reduce((a: number, o) => a + (o.monto_reembolsado || 0), 0)

  const severidad = { no_grave: 0, grave: 0, critico: 0 }
  for (const it of reclamos) {
    if (it.riesgo_legal || it.canal !== 'mail') severidad.critico++
    else if ((it.resolucion === 'reembolso' || it.resolucion === 'reenvio') || (it.gravedad || 0) >= 2)
      severidad.grave++
    else severidad.no_grave++
  }

  // ---------- 02/03 Productos ----------
  const porProducto = new Map<
    string,
    {
      product_id: string
      producto_titulo: string
      proveedor: string | null
      pedidos: Set<string>
      pedidosReclamo: Set<string>
      ventas: number
      unidades: number
      reembolsado: number
      solicitado: number
      expired: number
      // motivo -> pedidos DISTINTOS con ese motivo (no interacciones, para que
      // el conteo cuadre con el % reclamo que también cuenta pedidos).
      motivos: Map<string, Set<string>>
    }
  >()

  const ordenById = new Map(ordenes.map((o) => [o.order_number, o]))

  for (const it of items) {
    const pid = it.shopify_product_id || `sin-id-${it.producto_titulo}`
    if (!porProducto.has(pid)) {
      porProducto.set(pid, {
        product_id: pid,
        producto_titulo: it.producto_titulo || pid,
        proveedor: it.proveedor,
        pedidos: new Set(),
        pedidosReclamo: new Set(),
        ventas: 0,
        unidades: 0,
        reembolsado: 0,
        solicitado: 0,
        expired: 0,
        motivos: new Map(),
      })
    }
    const p = porProducto.get(pid)!
    const orden = ordenById.get(it.order_number)
    p.pedidos.add(it.order_number)
    if (ordenesReclamoReal.has(it.order_number)) p.pedidosReclamo.add(it.order_number)
    p.ventas += (it.precio || 0) * (it.cantidad || 1)
    p.unidades += it.cantidad || 1
    p.reembolsado += it.monto_reembolsado_item || 0
    // Valor solicitado para reembolso: el valor de este producto en pedidos que pidieron plata.
    if (solicitadosSet.has(it.order_number)) p.solicitado += (it.precio || 0) * (it.cantidad || 1)
    if (orden?.status_envio === 'expired') p.expired++
  }
  // motivo dominante por producto: mirar interacciones de las ordenes de ese producto
  const ordenAProductos = new Map<string, string[]>()
  for (const it of items) {
    const pid = it.shopify_product_id || `sin-id-${it.producto_titulo}`
    if (!ordenAProductos.has(it.order_number)) ordenAProductos.set(it.order_number, [])
    ordenAProductos.get(it.order_number)!.push(pid)
  }
  const NO_CAUSA = new Set(['consulta_estado', 'reembolso_solicitado', 'cambio_solicitado'])
  for (const inter of reclamos) {
    if (!inter.motivo || !inter.order_number) continue
    if (NO_CAUSA.has(inter.motivo)) continue // el motivo dominante debe ser un problema real
    const pids = ordenAProductos.get(inter.order_number) || []
    for (const pid of pids) {
      const p = porProducto.get(pid)
      if (!p) continue
      let setMot = p.motivos.get(inter.motivo)
      if (!setMot) {
        setMot = new Set()
        p.motivos.set(inter.motivo, setMot)
      }
      setMot.add(inter.order_number)
    }
  }

  // Desenlace por pedido (qué terminó pidiendo) = la ÚLTIMA petición del cliente.
  // Se usa para desglosar, por producto, cuántos de sus reclamos terminaron en cada uno.
  const desenlacePorOrden = new Map<string, 'sin_peticion' | 'cambio' | 'reembolso'>()
  {
    const itsPorOrd = new Map<string, typeof reclamos>()
    for (const i of reclamos) {
      if (!i.order_number) continue
      if (!ordenesReclamoReal.has(i.order_number)) continue
      let s = itsPorOrd.get(i.order_number)
      if (!s) {
        s = []
        itsPorOrd.set(i.order_number, s)
      }
      s.push(i)
    }
    for (const [on, its] of itsPorOrd) {
      const d = desenlaceDe(its)
      desenlacePorOrden.set(on, d === 'reembolso' ? 'reembolso' : d === 'cambio' ? 'cambio' : 'sin_peticion')
    }
  }

  const productos = Array.from(porProducto.values()).map((p) => {
    const pedidos = p.pedidos.size
    let nAduana = 0
    let nCalidad = 0
    for (const [m, set] of p.motivos) {
      if (m === 'no_llego_aduana') nAduana += set.size
      if (CRIT_MOTIVOS.has(m)) nCalidad += set.size
    }
    const totalMotivo = nAduana + nCalidad
    // En Productos solo cuentan los reclamos de CARACTERÍSTICAS del producto (talla,
    // foto distinta). Fábrica, aduana y gestión se excluyen: un producto se deja de
    // vender por su diseño/atributos, no por un defecto de fábrica (eso va al
    // proveedor). Ranking por gravedad, desempate por frecuencia.
    // Solo reclamos de tienda (lo arreglo yo) o producto (proveedora); no envío
    // ni gestión. Cada problema con su tasa propia: pedidos con ESE reclamo /
    // pedidos del producto. Se ordena por frecuencia (el más común primero).
    const problemas: ProblemaProducto[] = Array.from(p.motivos.entries())
      .filter(([m]) => esGrupoProducto(m))
      .map(([m, set]) => ({
        motivo: m,
        n: set.size,
        pct: pedidos > 0 ? Math.round((set.size / pedidos) * 1000) / 10 : 0,
        grav: MOTIVO_GRAVEDAD[m] ?? 1,
      }))
      .sort((a, b) => b.n - a.n || b.grav - a.grav)
    const motivoDominante: string | null = problemas[0]?.motivo ?? null
    // % reclamo de la sección Productos = pedidos con el reclamo de característica
    // MÁS COMÚN del producto / pedidos. Así el %, el "X de Y" y el conteo del
    // problema son el mismo número y siempre reconcilian.
    const reclamos = problemas[0]?.n ?? 0
    const pctReclamo = problemas[0]?.pct ?? 0
    // Desglose de desenlace sobre los MISMOS reclamos que muestra la fila (los de la
    // razón dominante), para que nada+cambio+plata sume exactamente `reclamos`.
    let dSin = 0
    let dCambio = 0
    let dReemb = 0
    const ordenesDominante = motivoDominante ? p.motivos.get(motivoDominante) : null
    if (ordenesDominante) {
      for (const on of ordenesDominante) {
        const d = desenlacePorOrden.get(on) || 'sin_peticion'
        if (d === 'reembolso') dReemb++
        else if (d === 'cambio') dCambio++
        else dSin++
      }
    }
    // Estado solo si hay volumen suficiente (>=5 pedidos y >=3 reclamos de producto);
    // sin eso, 1 de 1 = 100% no es señal -> 'ok' (datos insuficientes).
    const conVolumen = pedidos >= 5 && reclamos >= 3
    const estado = !conVolumen
      ? 'ok'
      : pctReclamo >= umbrales.apagar
        ? 'apagar'
        : pctReclamo >= umbrales.vigilar
          ? 'vigilar'
          : 'ok'
    return {
      product_id: p.product_id,
      producto_titulo: p.producto_titulo,
      proveedor: p.proveedor,
      pedidos,
      reclamos,
      pct_reclamo: pctReclamo,
      desenlace: { sin_peticion: dSin, cambio: dCambio, reembolso: dReemb },
      total_ventas: p.ventas,
      precio_unitario: p.unidades > 0 ? Math.round(p.ventas / p.unidades) : 0,
      monto_reembolsado: p.reembolsado,
      monto_solicitado: p.solicitado,
      ordenes_expired: p.expired,
      motivo_dominante: motivoDominante,
      pct_aduana: totalMotivo > 0 ? Math.round((nAduana / totalMotivo) * 100) : 0,
      pct_calidad: totalMotivo > 0 ? Math.round((nCalidad / totalMotivo) * 100) : 0,
      problemas,
      estado_playbook: estado as 'ok' | 'vigilar' | 'apagar',
    }
  })

  // ---------- motivo (costo por motivo) ----------
  const motivoCounts = new Map<string, number>()
  for (const it of reclamos) {
    if (!it.motivo || it.motivo === 'consulta_estado') continue
    motivoCounts.set(it.motivo, (motivoCounts.get(it.motivo) || 0) + 1)
  }
  const totalMotivoCount = Array.from(motivoCounts.values()).reduce((a, b) => a + b, 0)
  const motivos = Array.from(motivoCounts.entries())
    .map(([motivo, n]) => ({
      motivo,
      n,
      pct: totalMotivoCount > 0 ? Math.round((n / totalMotivoCount) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.n - a.n)

  // ---------- causa raiz vs desenlace (1 pedido = 1 causa + 1 desenlace) ----------
  // Contar por interaccion duplica: el pedido que no llego y por eso pide reembolso
  // suma en 'no_llego_aduana' Y en 'reembolso_solicitado'. Aca cada pedido con reclamo
  // real aporta exactamente 1 causa (POR QUE reclamo) y 1 desenlace (QUE pidio), asi
  // que las causas suman pedidosConReclamo y son comparables contra el universo.
  const DESENLACE_MOTIVOS = new Set(['reembolso_solicitado', 'cambio_solicitado'])
  const itsPorOrden = new Map<string, typeof reclamos>()
  for (const i of reclamos) {
    if (!i.order_number) continue
    if (!ordenesEnRango.has(i.order_number) || !ordenesReclamoReal.has(i.order_number)) continue
    if (!itsPorOrden.has(i.order_number)) itsPorOrden.set(i.order_number, [])
    itsPorOrden.get(i.order_number)!.push(i)
  }

  // Días desde el pedido hasta el PRIMER reclamo (mediana) — la ventana de reacción
  // de la clienta. Sirve además como base de la "cohorte madura" del filtro de fecha.
  const lags: number[] = []
  for (const [on, its] of itsPorOrden) {
    const o = ordenById.get(on)
    if (!o?.fecha_orden) continue
    let primera = its[0].fecha
    for (const it of its) if (it.fecha < primera) primera = it.fecha
    const d = (new Date(primera).getTime() - new Date(o.fecha_orden + 'T00:00:00Z').getTime()) / 86400000
    if (d >= 0 && d <= 400) lags.push(d)
  }
  lags.sort((a, b) => a - b)
  const diasHastaReclamo = lags.length ? Math.round(lags[Math.floor(lags.length / 2)]) : null

  const causaCounts = new Map<string, number>()
  const desenlaceCounts = new Map<string, number>()
  // Matriz: por causa, cuantos pedidos terminaron en cada desenlace + la plata que costo.
  type CeldaCausa = { esperando: number; sin_exigir: number; cambio: number; reembolso: number; total: number; perdida: number; valor: number }
  const matriz = new Map<string, CeldaCausa>()
  for (const [on, its] of itsPorOrden) {
    // CAUSA = la última causa real declarada (regla única del dashboard).
    const causaFinal = causaRaizDe(its)
    causaCounts.set(causaFinal, (causaCounts.get(causaFinal) || 0) + 1)

    // DESENLACE = la última petición del cliente (misma función que todo el resto).
    const des = desenlaceDe(its)
    desenlaceCounts.set(des, (desenlaceCounts.get(des) || 0) + 1)

    // Cruce causa x desenlace: cada pedido cae en UNA celda, nunca en dos.
    if (!matriz.has(causaFinal)) {
      matriz.set(causaFinal, { esperando: 0, sin_exigir: 0, cambio: 0, reembolso: 0, total: 0, perdida: 0, valor: 0 })
    }
    const celda = matriz.get(causaFinal)!
    celda[des] += 1
    celda.total += 1
    const o = ordenById.get(on)
    celda.perdida += o?.monto_reembolsado || 0
    celda.valor += o?.monto_clp || 0
  }

  // ---------- ESTADO FINAL DEL PEDIDO (la unidad principal del dashboard) ----------
  // REGLA: cada pedido cae en EXACTAMENTE un estado, segun la ULTIMA peticion del
  // cliente (si primero pidio plata y despues cambio, queda en cambio). Estados:
  //   reclamo_plata -> su ultima peticion fue reembolso
  //   reclamo_cambio -> su ultima peticion fue cambio/reenvio
  //   reclamo_sin_pedir -> reclamo sin pedir nada concreto
  // Asi los estados suman totalPedidos y ninguno se cuenta dos veces.
  const gravedadEstado = (its: typeof reclamos): EstadoPedido => {
    const d = desenlaceDe(its)
    if (d === 'reembolso') return 'reclamo_plata'
    if (d === 'cambio') return 'reclamo_cambio'
    if (d === 'esperando') return 'reclamo_esperando'
    return 'reclamo_sin_pedir'
  }
  const estadoPorOrden = new Map<string, EstadoPedido>()
  for (const o of ordenes) {
    const its = itsPorOrden.get(o.order_number)
    if (!its) {
      // Nunca escribio, o solo consulto (ordenesSoloConsulta no entra en itsPorOrden).
      estadoPorOrden.set(o.order_number, ordenesSoloConsulta.has(o.order_number) ? 'consulta' : 'sin_contacto')
      continue
    }
    estadoPorOrden.set(o.order_number, gravedadEstado(its))
  }

  const estadoAcc = new Map<EstadoPedido, { n: number; ventas: number; reembolsado: number }>()
  for (const o of ordenes) {
    const e = estadoPorOrden.get(o.order_number) || 'sin_contacto'
    if (!estadoAcc.has(e)) estadoAcc.set(e, { n: 0, ventas: 0, reembolsado: 0 })
    const a = estadoAcc.get(e)!
    a.n += 1
    a.ventas += o.monto_clp || 0
    a.reembolsado += o.monto_reembolsado || 0
  }
  const estadoPedidos = ORDEN_ESTADOS.map((estado) => {
    const a = estadoAcc.get(estado) || { n: 0, ventas: 0, reembolsado: 0 }
    return {
      estado,
      n: a.n,
      pct: totalPedidos > 0 ? Math.round((a.n / totalPedidos) * 1000) / 10 : 0,
      ventas: a.ventas,
      reembolsado: a.reembolsado,
    }
  })

  // ---------- ENVIO (ParcelPanel) x RECLAMO ----------
  // La pregunta que contesta: los pedidos que se demoran o se pierden, cuanto mas
  // reclaman? Se cuenta por pedido. 'sin_dato' es honesto: ParcelPanel no cubre todo.
  const esReclamoEstado = (e: EstadoPedido | undefined) =>
    e === 'reclamo_plata' || e === 'reclamo_cambio' || e === 'reclamo_sin_pedir' || e === 'reclamo_esperando'

  const envioAcc = new Map<
    string,
    { n: number; reclamo: number; plata: number; reembolsado: number; ventas: number; dias: number[] }
  >()
  for (const o of ordenes) {
    const st = o.status_envio || 'sin_dato'
    if (!envioAcc.has(st)) envioAcc.set(st, { n: 0, reclamo: 0, plata: 0, reembolsado: 0, ventas: 0, dias: [] })
    const a = envioAcc.get(st)!
    const e = estadoPorOrden.get(o.order_number)
    a.n += 1
    if (esReclamoEstado(e)) a.reclamo += 1
    if (e === 'reclamo_plata') a.plata += 1
    a.reembolsado += o.monto_reembolsado || 0
    a.ventas += o.monto_clp || 0
    if (o.dias_transito != null) a.dias.push(o.dias_transito)
  }
  const envio = Array.from(envioAcc.entries())
    .map(([status, a]) => {
      const dias = [...a.dias].sort((x, y) => x - y)
      return {
        status,
        n: a.n,
        pct: totalPedidos > 0 ? Math.round((a.n / totalPedidos) * 1000) / 10 : 0,
        reclamo: a.reclamo,
        pctReclamo: a.n > 0 ? Math.round((a.reclamo / a.n) * 1000) / 10 : 0,
        plata: a.plata,
        pctPlata: a.n > 0 ? Math.round((a.plata / a.n) * 1000) / 10 : 0,
        reembolsado: a.reembolsado,
        ventas: a.ventas,
        diasMediana: dias.length > 0 ? dias[Math.floor(dias.length / 2)] : null,
      }
    })
    .sort((a, b) => b.n - a.n)

  const pedidosConEnvio = ordenes.filter((o) => o.status_envio).length
  const coberturaEnvio = totalPedidos > 0 ? Math.round((pedidosConEnvio / totalPedidos) * 1000) / 10 : 0

  // ---------- DISPUTAS (Stripe) ----------
  // Un pedido escala a disputa cuando la clienta va al banco/pasarela en vez del SAC.
  // Interesa saber si antes reclamo por mail: si no lo hizo, el SAC ni se entero.
  const ordenesDisputa = new Set<string>()
  for (const o of ordenes) if (o.disputa_stripe) ordenesDisputa.add(o.order_number)
  for (const i of interacciones) {
    if (i.canal && i.canal !== 'mail' && i.order_number && ordenesEnRango.has(i.order_number)) {
      ordenesDisputa.add(i.order_number)
    }
  }
  let disputaConReclamoPrevio = 0
  let disputaMonto = 0
  for (const on of ordenesDisputa) {
    if (itsPorOrden.has(on) || ordenesSoloConsulta.has(on)) disputaConReclamoPrevio++
    disputaMonto += ordenById.get(on)?.monto_clp || 0
  }
  const disputas = {
    n: ordenesDisputa.size,
    pct: totalPedidos > 0 ? Math.round((ordenesDisputa.size / totalPedidos) * 10000) / 100 : 0,
    monto: disputaMonto,
    conReclamoPrevio: disputaConReclamoPrevio,
    sinReclamoPrevio: ordenesDisputa.size - disputaConReclamoPrevio,
  }

  const totalCausas = Array.from(causaCounts.values()).reduce((a, b) => a + b, 0)

  // Ordenada por VALOR (lo que valen esos pedidos), no por lo reembolsado.
  const matrizCausas = Array.from(matriz.entries())
    .map(([motivo, c]) => ({
      motivo,
      esperando: c.esperando,
      sin_exigir: c.sin_exigir,
      cambio: c.cambio,
      reembolso: c.reembolso,
      total: c.total,
      perdida: c.perdida,
      valor: c.valor,
      pct: totalCausas > 0 ? Math.round((c.total / totalCausas) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.valor - a.valor || b.total - a.total)
  const causas = Array.from(causaCounts.entries())
    .map(([motivo, n]) => ({
      motivo,
      n,
      pct: totalCausas > 0 ? Math.round((n / totalCausas) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.n - a.n)

  const desenlaces = Array.from(desenlaceCounts.entries())
    .map(([tipo, n]) => ({
      tipo,
      n,
      pct: totalCausas > 0 ? Math.round((n / totalCausas) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.n - a.n)

  // ---------- 04 Operacion ----------
  const abiertas = reclamos.filter((i) => i.estado === 'abierto')
  const criticas = abiertas.filter((i) => i.riesgo_legal || i.canal !== 'mail')
  const cola = [...abiertas]
    .sort((a, b) => (b.gravedad || 0) - (a.gravedad || 0) || (b.fecha > a.fecha ? 1 : -1))
    .slice(0, 15)

  // ---------- 05 Aduana ----------
  const conEnvio = ordenes.filter((o) => o.status_envio)
  const expired = conEnvio.filter((o) => o.status_envio === 'expired').length
  const pctExpired = conEnvio.length > 0 ? Math.round((expired / conEnvio.length) * 1000) / 10 : null
  const diasTransitoVals = ordenes.map((o) => o.dias_transito).filter((d): d is number => d != null).sort((a, b) => a - b)
  const mediana =
    diasTransitoVals.length > 0 ? diasTransitoVals[Math.floor(diasTransitoVals.length / 2)] : null
  const disputasAbiertas = abiertas.filter((i) => i.canal !== 'mail').length

  const etapaCounts = new Map<string, number>()
  for (const o of conEnvio) {
    if (o.status_envio === 'delivered') continue
    const etapa = o.etapa_actual || 'sin_dato'
    etapaCounts.set(etapa, (etapaCounts.get(etapa) || 0) + 1)
  }
  const totalEtapas = Array.from(etapaCounts.values()).reduce((a, b) => a + b, 0)
  const etapas = Array.from(etapaCounts.entries()).map(([etapa, n]) => ({
    etapa,
    n,
    pct: totalEtapas > 0 ? Math.round((n / totalEtapas) * 1000) / 10 : 0,
  }))

  // Tendencia por etapa a lo largo del rango consultado: pedidos NO entregados
  // agrupados por semana de su fecha_orden y su etapa actual. Deja ver si el
  // atasco en una etapa viene creciendo (reciente) o ya pasó (semanas viejas).
  const lunesDe = (fechaISO: string): string => {
    const d = new Date(fechaISO + 'T00:00:00Z')
    const dow = (d.getUTCDay() + 6) % 7 // 0 = lunes
    d.setUTCDate(d.getUTCDate() - dow)
    return d.toISOString().slice(0, 10)
  }
  const semMap = new Map<string, Map<string, number>>()
  for (const o of conEnvio) {
    if (o.status_envio === 'delivered' || !o.fecha_orden) continue
    const sem = lunesDe(o.fecha_orden)
    const etapa = o.etapa_actual || 'sin_dato'
    let m = semMap.get(sem)
    if (!m) {
      m = new Map()
      semMap.set(sem, m)
    }
    m.set(etapa, (m.get(etapa) || 0) + 1)
  }
  const semanas = Array.from(semMap.keys()).sort()
  const ETAPAS_ORDEN = ['origen', 'aduana', 'ultima_milla', 'transito_nacional', 'sin_dato']
  const etapasTendencia = {
    semanas,
    series: ETAPAS_ORDEN.filter((e) => semanas.some((s) => (semMap.get(s)?.get(e) || 0) > 0)).map((etapa) => ({
      etapa,
      valores: semanas.map((s) => semMap.get(s)?.get(etapa) || 0),
    })),
  }

  const porMes = new Map<string, number>()
  for (const o of ordenes) {
    if (!o.fecha_orden || !o.monto_reembolsado) continue
    const mes = o.fecha_orden.slice(0, 7)
    porMes.set(mes, (porMes.get(mes) || 0) + o.monto_reembolsado)
  }
  const reembolsosPorMes = Array.from(porMes.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, total]) => ({ mes, total }))

  // ---------- KPIs v2 (analítica) ----------
  const totalVentas = ordenes.reduce((a, o) => a + (o.monto_clp || 0), 0)
  const costoPorPedido = totalPedidos > 0 ? Math.round(perdidaTotal / totalPedidos) : 0
  // Devoluciones medidas por SOLICITUD (no por reembolso efectivo, que es solo ~7%)
  const tasaDevolucionSolicitada = totalVentas > 0 ? Math.round((montoSolicitado / totalVentas) * 1000) / 10 : 0
  const pctPidenDevolucion = totalPedidos > 0 ? Math.round((reembSolicitados / totalPedidos) * 1000) / 10 : 0
  const ticketPromedio = totalPedidos > 0 ? Math.round(totalVentas / totalPedidos) : 0
  const pedidosSanos = totalPedidos - pedidosConReclamo - pedidosSoloConsulta
  const pctSanos = totalPedidos > 0 ? Math.round((pedidosSanos / totalPedidos) * 1000) / 10 : 0
  // Pareto de DEVOLUCIONES SOLICITADAS por producto: cuántos productos concentran el 80%
  const solicPorProd = new Map<string, number>()
  for (const [on, pids] of ordenAProductos) {
    if (!solicitadosSet.has(on)) continue
    for (const pid of new Set(pids)) solicPorProd.set(pid, (solicPorProd.get(pid) || 0) + 1)
  }
  const solicVals = Array.from(solicPorProd.values()).sort((x, y) => y - x)
  const totalSolicProd = solicVals.reduce((s, v) => s + v, 0)
  let cum = 0
  let paretoProductos = 0
  for (const v of solicVals) {
    cum += v
    paretoProductos++
    if (cum >= 0.8 * totalSolicProd) break
  }
  const paretoTotalProductos = solicVals.length
  const paretoPctProductos =
    paretoTotalProductos > 0 ? Math.round((paretoProductos / paretoTotalProductos) * 1000) / 10 : 0
  // % de la severidad que es crítica
  const totalSev = severidad.no_grave + severidad.grave + severidad.critico
  const pctCritico = totalSev > 0 ? Math.round((severidad.critico / totalSev) * 1000) / 10 : 0

  return {
    rango: { desde, hasta },
    analitica: {
      totalVentas,
      costoPorPedido,
      tasaDevolucionSolicitada,
      pctPidenDevolucion,
      ticketPromedio,
      pctSanos,
      pedidosSanos,
      paretoProductos,
      paretoTotalProductos,
      paretoPctProductos,
      pctCritico,
    },
    resumen: {
      totalPedidos,
      pedidosConReclamo,
      pedidosSoloConsulta,
      pedidosConContacto,
      pedidosCriticos,
      reclamosPorPedido,
      interaccionesReclamoReal,
      pctProblema,
      perdidaTotal,
      deltaPct: Math.round((pctProblema - prevPct) * 10) / 10,
      deltaPerdida: perdidaTotal - prevPerdida,
    },
    severidad,
    estadoPedidos,
    envio,
    coberturaEnvio,
    disputas,
    productos: productos.sort((a, b) => b.total_ventas - a.total_ventas),
    motivos,
    causas,
    desenlaces,
    matrizCausas,
    reembolso: {
      solicitados: reembSolicitados,
      hechos: reembHechos,
      solicitadosCumplidos: reembSolicitadosCumplidos,
      montoSolicitado,
      montoPagado,
      montoFalta,
      montoTotal: perdidaTotal,
      pctCumplido: reembSolicitados > 0 ? Math.round((reembSolicitadosCumplidos / reembSolicitados) * 1000) / 10 : 0,
      pctMontoPagado: montoSolicitado > 0 ? Math.round((montoPagado / montoSolicitado) * 1000) / 10 : 0,
    },
    embudo: { total: reclamos.length, abiertas: abiertas.length, criticas: criticas.length },
    cola,
    kpis: { pctExpired, mediana, disputasAbiertas, ticketsAbiertos: abiertas.length, diasHastaReclamo },
    etapas,
    etapasTendencia,
    reembolsosPorMes,
    sinOrdenExcluidas: null as number | null, // se completa aparte si hace falta
  }
}

// Tipo de la data del dashboard, para pasarla tipada del server a los componentes
// cliente (las secciones). Import type-only en el cliente: no arrastra codigo server.
export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>

export async function getDecisiones() {
  const supa = createAdminClient()
  const { data, error } = await supa
    .from('decisiones_semana')
    .select('*')
    .eq('resuelta', false)
    .order('urgencia', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(10)
  if (error) return []
  return data ?? []
}

// ---------- Trazabilidad 360° por pedido ----------
// Todo el historial de un pedido en un lugar: datos del pedido, items, línea de
// tiempo de ParcelPanel, reclamos clasificados y la conversación completa de
// correos (recibidos de la clienta + enviados por el SAC), unida por hilo.
const SAC_DOMINIO = /lorentina/i

export async function getPedido360(orderNumberRaw: string) {
  const supa = createAdminClient()
  const on = (orderNumberRaw || '').trim().replace(/^#/, '')
  if (!on) return null

  const { data: orden } = await supa.from('ordenes').select('*').eq('order_number', on).maybeSingle()
  if (!orden) return null

  const [itemsRes, trackingRes, reclamosRes] = await Promise.all([
    supa.from('orden_items').select('shopify_product_id, producto_titulo, sku, cantidad, precio, monto_reembolsado_item, proveedor').eq('order_number', on),
    supa
      .from('tracking_eventos')
      .select('etapa, fecha_checkpoint, descripcion, checkpoint_status, track_number, carrier')
      .eq('order_number', on)
      .order('fecha_checkpoint', { ascending: true }),
    supa
      .from('interacciones')
      .select('fecha, motivo, gravedad, resolucion, resumen, riesgo_legal, hilo_id, mensaje_id, estado, canal')
      .eq('order_number', on)
      .order('fecha', { ascending: true }),
  ])

  const reclamos = reclamosRes.data ?? []
  const hilos = Array.from(new Set(reclamos.map((r) => r.hilo_id).filter(Boolean))) as string[]

  let conversacion: {
    fecha: string | null
    direccion: 'enviado' | 'recibido'
    remitente: string | null
    para: string | null
    asunto: string | null
    cuerpo: string | null
  }[] = []
  if (hilos.length) {
    const { data: correos } = await supa
      .from('correos')
      .select('fecha, remitente, para, asunto, cuerpo')
      .in('hilo_id', hilos)
      .order('fecha', { ascending: true })
    conversacion = (correos ?? []).map((c) => ({
      fecha: c.fecha,
      direccion: SAC_DOMINIO.test(c.remitente || '') ? ('enviado' as const) : ('recibido' as const),
      remitente: c.remitente,
      para: c.para,
      asunto: c.asunto,
      cuerpo: (c.cuerpo || '').slice(0, 6000),
    }))
  }

  return {
    orden,
    items: itemsRes.data ?? [],
    tracking: trackingRes.data ?? [],
    reclamos,
    conversacion,
  }
}

export type Pedido360 = NonNullable<Awaited<ReturnType<typeof getPedido360>>>

// ---------- Lista de pedidos de una causa raíz (drill-down desde la matriz) ----------
export type PedidoLista = {
  order_number: string
  fecha_orden: string | null
  email_clienta: string | null
  monto_clp: number | null
  status_envio: string | null
  desenlace: Desenlace
  gravedad: number
  resumen: string | null
}

// Filtra pedidos por causa raíz y/o desenlace (drill-down desde la matriz).
export async function getPedidosFiltro(
  causa: string | null,
  desenlace: string | null,
  desde: string,
  hasta: string
): Promise<PedidoLista[]> {
  const supa = createAdminClient()
  type OrdMin = { order_number: string; fecha_orden: string | null; email_clienta: string | null; monto_clp: number | null; status_envio: string | null }
  type IntMin = { order_number: string | null; motivo: string | null; fecha: string | null; gravedad: number | null; resumen: string | null; canal: string | null; resolucion: string | null }

  const ordenes: OrdMin[] = []
  for (let from = 0; ; from += 1000) {
    const { data } = await supa
      .from('ordenes')
      .select('order_number, fecha_orden, email_clienta, monto_clp, status_envio')
      .gte('fecha_orden', desde)
      .lte('fecha_orden', hasta)
      .order('order_number', { ascending: true })
      .range(from, from + 999)
    const b = (data ?? []) as OrdMin[]
    ordenes.push(...b)
    if (b.length < 1000) break
  }
  const ordById = new Map(ordenes.map((o) => [o.order_number, o]))
  const orderNumbers = ordenes.map((o) => o.order_number)
  if (!orderNumbers.length) return []

  const inter: IntMin[] = []
  for (let i = 0; i < orderNumbers.length; i += 300) {
    const batch = orderNumbers.slice(i, i + 300)
    for (let from = 0; ; from += 1000) {
      const { data } = await supa
        .from('interacciones')
        .select('order_number, motivo, fecha, gravedad, resumen, canal, resolucion')
        .in('order_number', batch)
        .range(from, from + 999)
      const b = (data ?? []) as IntMin[]
      inter.push(...b)
      if (b.length < 1000) break
    }
  }

  const byOrder = new Map<string, IntMin[]>()
  for (const it of inter) {
    if (it.canal !== 'mail' || !it.order_number || !ordById.has(it.order_number)) continue
    let a = byOrder.get(it.order_number)
    if (!a) {
      a = []
      byOrder.set(it.order_number, a)
    }
    a.push(it)
  }

  const out: PedidoLista[] = []
  for (const [on, its] of byOrder) {
    const cRaiz = causaRaizDe(its)
    const des = desenlaceDe(its)
    if (causa && cRaiz !== causa) continue
    if (desenlace && des !== desenlace) continue
    const o = ordById.get(on)!
    // resumen: preferí el del mensaje de la causa; si no, el último con texto.
    const conTexto = its.filter((i) => i.resumen).sort((a, b) => ((a.fecha || '') < (b.fecha || '') ? 1 : -1))
    const delaCausa = conTexto.find((i) => i.motivo === (causa || cRaiz))
    out.push({
      order_number: on,
      fecha_orden: o.fecha_orden,
      email_clienta: o.email_clienta,
      monto_clp: o.monto_clp,
      status_envio: o.status_envio,
      desenlace: des,
      gravedad: Math.max(0, ...its.map((i) => i.gravedad || 0)),
      resumen: (delaCausa || conTexto[0])?.resumen ?? null,
    })
  }
  out.sort((a, b) => b.gravedad - a.gravedad || ((a.fecha_orden || '') < (b.fecha_orden || '') ? 1 : -1))
  return out
}
