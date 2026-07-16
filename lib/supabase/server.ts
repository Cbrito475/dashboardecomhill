import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Cliente SSR con la key publica: solo se usa para login/sesion (Supabase Auth).
// NUNCA se usa para leer datos del negocio (ver admin.ts para eso).
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll puede fallar en Server Components (solo lectura); el middleware
            // se encarga de refrescar la sesion en ese caso.
          }
        },
      },
    }
  )
}
