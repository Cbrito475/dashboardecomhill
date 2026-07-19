'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPedidosFiltro, getPedido360 } from '@/lib/supabase/queries'

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

// Drill-down y búsqueda de pedidos: se llaman desde el cliente (sin parámetros en
// la URL), devuelven los datos y el estado vive en memoria del dashboard.
export async function accionPedidosFiltro(causa: string | null, desenlace: string | null, desde: string, hasta: string) {
  return getPedidosFiltro(causa, desenlace, desde, hasta)
}

export async function accionPedido360(order: string) {
  return getPedido360(order)
}
