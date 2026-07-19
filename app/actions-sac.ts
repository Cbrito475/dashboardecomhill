'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getBandeja } from '@/lib/supabase/sac'
import type { PedidoLista } from '@/lib/supabase/queries'
import { puede, type Rol } from '@/lib/auth/roles'

// Cola de la Bandeja: pedidos que esperan respuesta. Se devuelve con la forma
// PedidoLista para reusar el master-detail de SecPedido (clic → abre el pedido 360
// con el borrador de respuesta ya adentro).
export async function accionBandeja(): Promise<PedidoLista[]> {
  const items = await getBandeja('abiertos')
  return items
    .filter((i) => i.order_number)
    .map((i) => ({
      order_number: i.order_number as string,
      fecha_orden: i.fecha ? i.fecha.slice(0, 10) : null,
      email_clienta: i.cliente,
      monto_clp: null,
      status_envio: null,
      desenlace: 'esperando' as const,
      gravedad: i.gravedad ?? 0,
      resumen: i.asunto ?? i.motivo,
    }))
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
