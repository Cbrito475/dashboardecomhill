import { getRangoDisponible } from '@/lib/supabase/queries'

function addDays(iso: string, days: number) {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

// Rango activo desde los query params (el shell SPA los mantiene al navegar). Sin
// params, el DEFAULT es la "cohorte madura": del 1 de enero del año más reciente
// hasta ~8 semanas antes del último pedido. Razón: el 90% de los reclamos llega
// dentro de los ~56 días del pedido (medido en la BD), así que mostrar pedidos más
// nuevos daría tasas de reclamo artificialmente bajas (todavía no reclamaron). El
// preset "Todo" siempre permite ver el histórico completo.
const DIAS_MADUREZ = 56

export async function getRangoActivo(
  sp: { desde?: string; hasta?: string }
): Promise<{ rango: { min: string; max: string }; desde: string; hasta: string }> {
  const rango = await getRangoDisponible()

  const anio = rango.max.slice(0, 4)
  let defDesde = `${anio}-01-01`
  if (defDesde < rango.min) defDesde = rango.min
  let defHasta = addDays(rango.max, -DIAS_MADUREZ)
  if (defHasta < defDesde) defHasta = rango.max // datos muy cortos: no recortar

  const desde = sp.desde || defDesde
  const hasta = sp.hasta || defHasta
  return { rango, desde, hasta }
}
