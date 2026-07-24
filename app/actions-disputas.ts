'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getDisputas, getDisputasCounts, getDisputasResumen, type Disputa, type DisputaBucket, type ResumenDisputas } from '@/lib/supabase/disputas'
import { getPerfilActual } from '@/app/actions-sac'
import { puede } from '@/lib/auth/roles'

type Res = { ok: boolean; error?: string }

export async function accionDisputas(bucket: DisputaBucket = 'por_responder'): Promise<Disputa[]> {
  return getDisputas(bucket)
}

export async function accionDisputasCounts(): Promise<Record<DisputaBucket, number>> {
  return getDisputasCounts()
}

export async function accionDisputasResumen(): Promise<ResumenDisputas> {
  return getDisputasResumen()
}

// Guardar la evidencia editada sin mandarla a la pasarela.
export async function accionGuardarEvidencia(id: string, texto: string): Promise<Res> {
  const perfil = await getPerfilActual()
  if (!perfil) return { ok: false, error: 'No autenticado' }
  if (!puede(perfil.rol, 'agente')) return { ok: false, error: 'Sin permiso' }
  const admin = createAdminClient()
  const { error } = await admin
    .from('disputas')
    .update({ evidencia_borrador: texto, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { ok: false, error: error.message }
  await auditar(admin, perfil, 'guardar_evidencia', id, null)
  return { ok: true }
}

// IRREVERSIBLE. El panel solo declara la intención; WF-D5 la ejecuta contra la pasarela.
// La evidencia se envía UNA sola vez: no hay segunda oportunidad de corregirla.
export async function accionEnviarEvidencia(id: string, texto: string): Promise<Res> {
  return accionIrreversible(id, 'enviar_evidencia', texto)
}

// IRREVERSIBLE. Aceptar = renunciar a pelear: se devuelve la plata y se cierra.
export async function accionAceptarDisputa(id: string): Promise<Res> {
  return accionIrreversible(id, 'aceptar', null)
}

async function accionIrreversible(id: string, accion: 'enviar_evidencia' | 'aceptar', texto: string | null): Promise<Res> {
  const perfil = await getPerfilActual()
  if (!perfil) return { ok: false, error: 'No autenticado' }
  if (!puede(perfil.rol, 'agente')) return { ok: false, error: 'Sin permiso' }

  const admin = createAdminClient()
  const { data: d } = await admin.from('disputas').select('estado, accion_estado, evidencia_borrador').eq('id', id).maybeSingle()
  if (!d) return { ok: false, error: 'Disputa no encontrada' }
  if (d.accion_estado === 'en_cola') return { ok: false, error: 'Ya hay una acción en curso para esta disputa' }
  if (!['needs_response', 'under_review'].includes(d.estado)) {
    return { ok: false, error: 'Esta disputa ya está cerrada: no admite acciones' }
  }
  if (accion === 'enviar_evidencia' && !(texto || '').trim()) {
    return { ok: false, error: 'La evidencia está vacía' }
  }

  const { error } = await admin
    .from('disputas')
    .update({
      accion_pendiente: accion,
      accion_estado: 'en_cola',
      accion_error: null,
      accion_por: perfil.id,
      accion_at: new Date().toISOString(),
      evidencia_enviada: accion === 'enviar_evidencia' ? texto : null,
      evidencia_borrador: accion === 'enviar_evidencia' ? texto : d.evidencia_borrador,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
  if (error) return { ok: false, error: error.message }

  await auditar(admin, perfil, accion, id, { estado_previo: d.estado })
  return { ok: true }
}

async function auditar(
  admin: ReturnType<typeof createAdminClient>,
  perfil: NonNullable<Awaited<ReturnType<typeof getPerfilActual>>>,
  accion: string,
  id: string,
  extra: Record<string, unknown> | null
) {
  await admin.from('audit_log').insert({
    actor_id: perfil.id,
    actor_tipo: 'humano',
    accion,
    entidad: 'disputas',
    entidad_id: id,
    despues: extra,
  })
}
