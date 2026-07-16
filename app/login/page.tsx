import { login } from './actions'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-xl font-semibold tracking-tight text-[var(--ink)]">
            Centro SAC · Lorentina
          </h1>
          <p className="mt-1 text-sm text-[var(--ink-3)]">Acceso del equipo</p>
        </div>

        <form
          action={login}
          className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-6 shadow-sm"
        >
          <div className="flex flex-col gap-4">
            <div>
              <label htmlFor="email" className="mb-1 block text-xs font-medium text-[var(--ink-2)]">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="w-full rounded-lg border border-[var(--line-2)] bg-[var(--panel-2)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1 block text-xs font-medium text-[var(--ink-2)]">
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="w-full rounded-lg border border-[var(--line-2)] bg-[var(--panel-2)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]"
              />
            </div>

            {error && (
              <p className="rounded-lg bg-[var(--crit-bg)] px-3 py-2 text-xs text-[var(--crit)]">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="mt-2 rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white transition hover:opacity-90"
            >
              Entrar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
