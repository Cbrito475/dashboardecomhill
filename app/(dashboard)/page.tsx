import { getDashboardData } from '@/lib/supabase/queries'
import { getRangoActivo } from '@/lib/rango'
import { createClient } from '@/lib/supabase/server'
import { getPerfilActual } from '@/app/actions-sac'
import DashboardShell from '@/components/DashboardShell'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string; tab?: string }>
}) {
  const sp = await searchParams
  const { rango, desde, hasta } = await getRangoActivo(sp)
  const data = await getDashboardData(desde, hasta)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const perfil = await getPerfilActual()

  return (
    <DashboardShell
      data={data}
      rango={rango}
      desde={desde}
      hasta={hasta}
      tabInicial={sp.tab}
      userEmail={user?.email}
      rol={perfil?.rol ?? null}
    />
  )
}
