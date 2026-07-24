'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getCierreDia, textoCierre, type CierreDia } from '@/lib/supabase/cierre'
import { getPerfilActual } from '@/app/actions-sac'
import { puede } from '@/lib/auth/roles'

export type PreviewCierre = { ok: boolean; error?: string; datos?: CierreDia; texto?: string }

// Previsualización: el SAC ve los números antes de mandar nada al grupo.
export async function accionPreviewCierre(): Promise<PreviewCierre> {
  const perfil = await getPerfilActual()
  if (!perfil) return { ok: false, error: 'No autenticado' }
  if (!puede(perfil.rol, 'agente')) return { ok: false, error: 'Sin permiso' }
  const datos = await getCierreDia()
  if (!datos) return { ok: false, error: 'No se pudieron calcular los indicadores' }
  return { ok: true, datos, texto: textoCierre(datos) }
}

// Envía el reporte al grupo de Telegram a través de n8n (las credenciales de Telegram
// viven solo en n8n; el panel únicamente dispara la intención, igual que con los correos).
export async function accionEnviarCierre(): Promise<{ ok: boolean; error?: string }> {
  const perfil = await getPerfilActual()
  if (!perfil) return { ok: false, error: 'No autenticado' }
  if (!puede(perfil.rol, 'agente')) return { ok: false, error: 'Sin permiso' }

  const url = process.env.N8N_CIERRE_URL
  const secreto = process.env.N8N_CIERRE_SECRET
  if (!url || !secreto) return { ok: false, error: 'Falta configurar N8N_CIERRE_URL / N8N_CIERRE_SECRET' }

  const datos = await getCierreDia()
  if (!datos) return { ok: false, error: 'No se pudieron calcular los indicadores' }
  const texto = textoCierre(datos)

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secreto, texto, enviado_por: perfil.email }),
    })
    if (!res.ok) return { ok: false, error: `n8n respondió ${res.status}` }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'No se pudo contactar a n8n' }
  }

  const admin = createAdminClient()
  await admin.from('audit_log').insert({
    actor_id: perfil.id,
    actor_tipo: 'humano',
    accion: 'cierre_dia',
    entidad: 'reporte',
    entidad_id: datos.fecha,
    despues: datos as unknown as Record<string, unknown>,
  })

  return { ok: true }
}
