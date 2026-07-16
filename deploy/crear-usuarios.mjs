// Crea los usuarios del equipo SAC en Supabase Auth usando la service role key.
// Uso:
//   SUPABASE_URL=https://xxxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=xxx node crear-usuarios.mjs
//
// Editá la lista USUARIOS con los emails reales. Las claves son temporales:
// cada persona debería cambiarla en el primer ingreso (o generá una random y compartila).

import { createClient } from '@supabase/supabase-js'

const URL = process.env.SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL || !KEY) {
  console.error('Faltan SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY en el entorno.')
  process.exit(1)
}

const USUARIOS = [
  { email: 'karla@ejemplo.com', password: 'CambiaEsto123!' },
  { email: 'bruno@ejemplo.com', password: 'CambiaEsto123!' },
  { email: 'martin@ejemplo.com', password: 'CambiaEsto123!' },
  { email: 'carlos@ejemplo.com', password: 'CambiaEsto123!' },
]

const supa = createClient(URL, KEY, { auth: { persistSession: false } })

for (const u of USUARIOS) {
  const { data, error } = await supa.auth.admin.createUser({
    email: u.email,
    password: u.password,
    email_confirm: true, // sin necesidad de confirmar por mail
  })
  if (error) console.error(`✗ ${u.email}: ${error.message}`)
  else console.log(`✓ ${u.email} creado (${data.user?.id})`)
}
console.log('Listo.')
