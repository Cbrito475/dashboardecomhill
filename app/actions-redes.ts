'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { puede } from '@/lib/auth/roles'
import { getPerfilActual } from '@/app/actions-sac'
import { getRedesLista, getRedesHilo, getRedesCounts, type RedCaso, type RedMensaje, type RedesCounts } from '@/lib/supabase/redes'

type Res = { ok: boolean; error?: string }

export async function accionRedesLista(): Promise<RedCaso[]> {
  return getRedesLista()
}

export async function accionRedesHilo(conversacionId: string): Promise<RedMensaje[]> {
  return getRedesHilo(conversacionId)
}

export async function accionRedesCounts(): Promise<RedesCounts> {
  return getRedesCounts()
}

// Marca toda la conversación como trabajada. Solo toca la base (no llama a Meta):
// sirve cuando el SAC ya respondió desde Messenger/Instagram o decide no responder.
async function cerrarConversacion(conversacionId: string, estado: 'cerrado' | 'no_responder', accion: string): Promise<Res> {
  const perfil = await getPerfilActual()
  if (!perfil) return { ok: false, error: 'No autenticado' }
  if (!puede(perfil.rol, 'agente')) return { ok: false, error: 'Sin permiso' }
  const admin = createAdminClient()
  const { error } = await admin
    .from('social_mensajes')
    .update({ estado, enviado_por: perfil.id, updated_at: new Date().toISOString() })
    .or(`conversacion_id.eq.${conversacionId},external_id.eq.${conversacionId}`)
    .in('estado', ['nuevo', 'esperando_humano'])
  if (error) return { ok: false, error: error.message }
  await admin.from('audit_log').insert({
    actor_id: perfil.id,
    actor_tipo: 'humano',
    accion,
    entidad: 'social_mensajes',
    entidad_id: conversacionId,
  })
  return { ok: true }
}

export async function accionRedesResolver(conversacionId: string): Promise<Res> {
  return cerrarConversacion(conversacionId, 'cerrado', 'redes_marcar_resuelto')
}

export async function accionRedesNoResponder(conversacionId: string): Promise<Res> {
  return cerrarConversacion(conversacionId, 'no_responder', 'redes_no_responder')
}
