'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getBandeja, getConfigSac, type BandejaItem } from '@/lib/supabase/sac'
import { getCasoPedido360 } from '@/lib/supabase/queries'
import { puede, type Rol } from '@/lib/auth/roles'

// Cola de la Bandeja: TODOS los correos que esperan respuesta (con y sin pedido
// asignado). Los que no tienen pedido, el SAC se los puede asignar a mano.
export async function accionBandeja(): Promise<BandejaItem[]> {
  return getBandeja('abiertos')
}

// Abre un correo SIN pedido: la vista 360 armada desde su hilo (para ver el contexto).
export async function accionCaso(id: string) {
  return getCasoPedido360(id)
}

// El SAC asigna manualmente un pedido a un hilo que la IA no pudo mapear. Linkea
// también las interacciones del hilo para que la vista 360 encuentre la respuesta.
export async function accionAsignarPedido(id: string, order: string): Promise<Res> {
  const perfil = await getPerfilActual()
  if (!perfil) return { ok: false, error: 'No autenticado' }
  if (!puede(perfil.rol, 'agente')) return { ok: false, error: 'Sin permiso' }
  const on = (order || '').trim().replace(/^#/, '')
  if (!on) return { ok: false, error: 'Número de pedido vacío' }
  const admin = createAdminClient()
  const { data: caso } = await admin.from('sac_respuestas').select('hilo_id').eq('id', id).maybeSingle()
  if (!caso) return { ok: false, error: 'Caso no encontrado' }
  const { error } = await admin.from('sac_respuestas').update({ order_number: on, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) return { ok: false, error: error.message }
  await admin.from('interacciones').update({ order_number: on }).eq('hilo_id', caso.hilo_id)
  await auditar(admin, perfil, 'asignar_pedido', id, caso.hilo_id, { order_number: on })
  return { ok: true }
}

export type Perfil = { id: string; email: string | null; nombre: string | null; rol: Rol } | null

// Perfil del usuario autenticado (server-side, fuente de verdad de permisos).
export async function getPerfilActual(): Promise<Perfil> {
  const supa = await createClient()
  const {
    data: { user },
  } = await supa.auth.getUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data } = await admin.from('perfiles').select('id, email, nombre, rol').eq('id', user.id).maybeSingle()
  if (!data) return null
  return data as NonNullable<Perfil>
}

type Res = { ok: boolean; error?: string; estado?: string; origen_envio?: string }

async function cargarCaso(id: string) {
  const admin = createAdminClient()
  const { data } = await admin.from('sac_respuestas').select('id, estado, riesgo_legal, hilo_id').eq('id', id).maybeSingle()
  return data
}

async function auditar(admin: ReturnType<typeof createAdminClient>, perfil: NonNullable<Perfil>, accion: string, id: string, hilo_id: string | null, extra?: Record<string, unknown>) {
  await admin.from('audit_log').insert({
    actor_id: perfil.id,
    actor_tipo: 'humano',
    accion,
    entidad: 'sac_respuestas',
    entidad_id: id,
    hilo_id,
    despues: extra ?? null,
  })
}

// Aprobar y enviar: deja la respuesta en la cola (WF-R2 la envía por Gmail).
// origen_envio: 'borrador_sin_editar' si se aprobó el borrador IA tal cual, 'humano' si se editó/escribió.
export async function accionAprobarEnviar(id: string, texto: string, editado: boolean): Promise<Res> {
  const perfil = await getPerfilActual()
  if (!perfil) return { ok: false, error: 'No autenticado' }
  if (!puede(perfil.rol, 'agente')) return { ok: false, error: 'Sin permiso para enviar' }
  const caso = await cargarCaso(id)
  if (!caso) return { ok: false, error: 'Caso no encontrado' }
  if (!['nuevo', 'esperando_humano'].includes(caso.estado)) return { ok: false, error: 'Este caso ya no está pendiente' }
  // Guardarraíl: los casos legales solo los envía un supervisor+.
  if (caso.riesgo_legal && !puede(perfil.rol, 'supervisor')) return { ok: false, error: 'Caso legal: requiere un supervisor' }
  if (!texto || !texto.trim()) return { ok: false, error: 'La respuesta está vacía' }

  const admin = createAdminClient()
  const origen_envio = editado ? 'humano' : 'borrador_sin_editar'
  const { error } = await admin
    .from('sac_respuestas')
    .update({ estado: 'en_cola', texto_enviado: texto, origen_envio, editado_bool: editado, enviado_por: perfil.id, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { ok: false, error: error.message }
  await auditar(admin, perfil, 'aprobar', id, caso.hilo_id, { origen_envio })
  return { ok: true, estado: 'en_cola', origen_envio }
}

// Guardar edición del borrador sin enviar aún.
export async function accionGuardarBorrador(id: string, texto: string): Promise<Res> {
  const perfil = await getPerfilActual()
  if (!perfil) return { ok: false, error: 'No autenticado' }
  if (!puede(perfil.rol, 'agente')) return { ok: false, error: 'Sin permiso' }
  const caso = await cargarCaso(id)
  if (!caso) return { ok: false, error: 'Caso no encontrado' }
  const admin = createAdminClient()
  const { error } = await admin
    .from('sac_respuestas')
    .update({ texto_enviado: texto, editado_bool: true, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { ok: false, error: error.message }
  await auditar(admin, perfil, 'editar_borrador', id, caso.hilo_id)
  return { ok: true }
}

async function cambiarEstado(id: string, nuevo: string, accion: string): Promise<Res> {
  const perfil = await getPerfilActual()
  if (!perfil) return { ok: false, error: 'No autenticado' }
  if (!puede(perfil.rol, 'agente')) return { ok: false, error: 'Sin permiso' }
  const caso = await cargarCaso(id)
  if (!caso) return { ok: false, error: 'Caso no encontrado' }
  const admin = createAdminClient()
  const { error } = await admin.from('sac_respuestas').update({ estado: nuevo, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) return { ok: false, error: error.message }
  await auditar(admin, perfil, accion, id, caso.hilo_id)
  return { ok: true, estado: nuevo }
}

export async function accionCerrar(id: string): Promise<Res> {
  return cambiarEstado(id, 'cerrado', 'cerrar')
}

export async function accionNoResponder(id: string): Promise<Res> {
  return cambiarEstado(id, 'no_responder', 'no_responder')
}

// ---------- Configuración (solo supervisor/admin) ----------
const CLAVES_CONFIG = new Set([
  'SAC_MODO_GLOBAL',
  'SAC_CADENCIA_MODO',
  'SAC_CADENCIA_LOTE_MIN',
  'SAC_UMBRAL_CONFIANZA',
  'HORARIO_ENVIO_DESDE',
  'HORARIO_ENVIO_HASTA',
  'SAC_LEGAL_KEYWORDS',
])

export async function accionGetConfig() {
  const perfil = await getPerfilActual()
  if (!perfil || !puede(perfil.rol, 'supervisor')) return null
  return getConfigSac()
}

export async function accionGuardarConfig(clave: string, valor: string): Promise<Res> {
  const perfil = await getPerfilActual()
  if (!perfil || !puede(perfil.rol, 'supervisor')) return { ok: false, error: 'Sin permiso' }
  if (!CLAVES_CONFIG.has(clave)) return { ok: false, error: 'Clave inválida' }
  const admin = createAdminClient()
  const { data: antes } = await admin.from('app_config').select('valor').eq('clave', clave).maybeSingle()
  const { error } = await admin.from('app_config').update({ valor, updated_at: new Date().toISOString() }).eq('clave', clave)
  if (error) return { ok: false, error: error.message }
  await admin.from('audit_log').insert({ actor_id: perfil.id, actor_tipo: 'humano', accion: 'cambiar_config', entidad: 'app_config', entidad_id: clave, antes: antes ?? null, despues: { valor } })
  return { ok: true }
}

export async function accionGuardarPolitica(motivo: string, autonomia: string, umbral: number | null): Promise<Res> {
  const perfil = await getPerfilActual()
  if (!perfil || !puede(perfil.rol, 'supervisor')) return { ok: false, error: 'Sin permiso' }
  if (!['auto_enviar', 'solo_borrador', 'solo_humano'].includes(autonomia)) return { ok: false, error: 'Valor inválido' }
  const admin = createAdminClient()
  const { data: antes } = await admin.from('sac_policies').select('autonomia, umbral_confianza').eq('motivo', motivo).maybeSingle()
  const { error } = await admin.from('sac_policies').update({ autonomia, umbral_confianza: umbral, updated_by: perfil.id, updated_at: new Date().toISOString() }).eq('motivo', motivo)
  if (error) return { ok: false, error: error.message }
  await admin.from('audit_log').insert({ actor_id: perfil.id, actor_tipo: 'humano', accion: 'cambiar_politica', entidad: 'sac_policies', entidad_id: motivo, antes: antes ?? null, despues: { autonomia, umbral } })
  return { ok: true }
}
