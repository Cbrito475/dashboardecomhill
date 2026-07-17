import { logout } from '@/app/actions'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardHeader() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-[var(--panel)]/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1560px] items-center justify-between px-4 py-2.5">
        <h1 className="text-[15px] font-semibold tracking-tight text-[var(--ink)]">
          Centro SAC · <span className="text-[var(--accent)]">Lorentina</span>
        </h1>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[var(--ink-3)]">{user?.email ?? 'sin sesión'}</span>
          <form action={logout}>
            <button
              type="submit"
              className="rounded-lg border border-[var(--line-2)] px-3 py-1.5 text-xs text-[var(--ink-2)] hover:bg-[var(--panel-2)]"
            >
              Salir
            </button>
          </form>
        </div>
      </div>
    </header>
  )
}
