import { createClient } from '@supabase/supabase-js'

// Cliente con la service role key: SOLO se importa desde Server Components / Route
// Handlers. Nunca desde un archivo con "use client". Lee las tablas/vistas del negocio
// sin pasar por RLS (el acceso ya quedo controlado por el login de Supabase Auth en el
// middleware antes de que cualquier pagina protegida se renderice).
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}
