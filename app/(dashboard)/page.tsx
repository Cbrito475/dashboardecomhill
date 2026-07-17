import { getDashboardData } from '@/lib/supabase/queries'
import { getRangoActivo } from '@/lib/rango'
import DashboardShell from '@/components/DashboardShell'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string; tab?: string }>
}) {
  const sp = await searchParams
  const { rango, desde, hasta } = await getRangoActivo(sp)
  const data = await getDashboardData(desde, hasta)

  return <DashboardShell data={data} rango={rango} desde={desde} hasta={hasta} tabInicial={sp.tab} />
}
