import { getDashboardData, getPedido360, getPedidosFiltro } from '@/lib/supabase/queries'
import { getRangoActivo } from '@/lib/rango'
import { createClient } from '@/lib/supabase/server'
import DashboardShell from '@/components/DashboardShell'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string; tab?: string; q?: string; causa?: string; desenlace?: string }>
}) {
  const sp = await searchParams
  const { rango, desde, hasta } = await getRangoActivo(sp)
  const data = await getDashboardData(desde, hasta)

  // Trazabilidad por pedido: búsqueda directa (q) o drill-down por causa/desenlace.
  const enPedido = sp.tab === 'pedido'
  const q = enPedido ? (sp.q || '').trim() : ''
  const causa = enPedido ? (sp.causa || '').trim() : ''
  const desenlace = enPedido ? (sp.desenlace || '').trim() : ''
  const [pedido, listaCausa] = await Promise.all([
    q ? getPedido360(q) : Promise.resolve(null),
    causa || desenlace ? getPedidosFiltro(causa || null, desenlace || null, desde, hasta) : Promise.resolve(null),
  ])

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <DashboardShell
      data={data}
      rango={rango}
      desde={desde}
      hasta={hasta}
      tabInicial={sp.tab}
      userEmail={user?.email}
      pedido={pedido}
      pedidoQuery={q}
      lista={listaCausa}
      causa={causa}
      desenlace={desenlace}
    />
  )
}
