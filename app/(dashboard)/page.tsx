import { getDashboardData, getPedido360 } from '@/lib/supabase/queries'
import { getRangoActivo } from '@/lib/rango'
import { createClient } from '@/lib/supabase/server'
import DashboardShell from '@/components/DashboardShell'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string; tab?: string; q?: string }>
}) {
  const sp = await searchParams
  const { rango, desde, hasta } = await getRangoActivo(sp)
  const data = await getDashboardData(desde, hasta)

  // Trazabilidad por pedido: solo se busca si estamos en esa pestaña con query.
  const q = sp.tab === 'pedido' ? (sp.q || '').trim() : ''
  const pedido = q ? await getPedido360(q) : null

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
    />
  )
}
