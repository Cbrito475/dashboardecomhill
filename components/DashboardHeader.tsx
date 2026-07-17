import { logout } from '@/app/actions'
import { createClient } from '@/lib/supabase/server'

const NAV = [
  { href: '/', label: 'Ejecutivo' },
  { href: '/detalle#resumen', label: 'Resumen' },
  { href: '/detalle#costo', label: 'Costo' },
  { href: '/detalle#productos', label: 'Productos' },
  { href: '/detalle#operacion', label: 'Operación' },
  { href: '/detalle#aduana', label: 'Aduana' },
]

export default async function DashboardHeader() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <header className="sticky top-0 z-10 border-b border-[var(--line)] bg-[var(--panel)]/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
        <h1 className="text-[15px] font-semibold tracking-tight text-[var(--ink)]">
          Centro SAC · Lorentina
        </h1>
        <nav className="flex items-center gap-1">
          <a
            href="/mando"
            className="mr-1 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-[13px] font-semibold text-white transition hover:opacity-90"
          >
            🎯 Mando
          </a>
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-1.5 text-[13px] text-[var(--ink-2)] transition hover:bg-[var(--panel-2)]"
            >
              {item.label}
            </a>
          ))}
        </nav>
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
