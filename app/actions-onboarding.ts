'use server'

// ============================================================================
// Onboarding de tiendas (H3): contratar servicios y aprovisionar workflows
// desde plantillas versionadas, vía la API de n8n. Solo supervisor+.
// Los secretos jamás se guardan acá: los slots OAuth se conectan pegando el id
// de una credencial creada en n8n; los slots de token (futuros) viajan directo
// a la API de n8n con crearCredencialN8n.
// ============================================================================

import { createAdminClient } from '@/lib/supabase/admin'
import { getPerfilActual } from '@/app/actions-sac'
import { puede } from '@/lib/auth/roles'
import { activarWorkflowN8n, borrarWorkflowN8n, crearCredencialN8n, crearWorkflowN8n, desactivarWorkflowN8n, n8nConfigurado } from '@/lib/n8n/api'
import { PLANTILLAS, SLOTS, instanciarPlantilla, type SlotCredencial } from '@/lib/plataforma/plantillas'

// Parámetros de plataforma compartidos por todas las tiendas del holding.
const SUPABASE_URL = 'https://exgcnhoqkbjljvandhgq.supabase.co'
const DRIVE_FOLDER_ID = '1_DMS3V2DIGkJ1gtkYgw3JG8BiD_7z71-'

export type ServicioOnboarding = {
  clave: string
  nombre: string
  descripcion: string | null
  contratado: string | null // estado en tienda_servicios, o null si no está
  plantillas: { plantilla: string; version: string }[]
  slots: SlotCredencial[]
  // Credenciales ya registradas para esta tienda (ids de n8n): el formulario
  // las precarga para que re-aprovisionar no obligue a buscarlas de nuevo.
  credencialesActuales: Record<string, string>
}

export type InfoOnboarding = {
  n8nListo: boolean
  servicios: ServicioOnboarding[]
  workflows: { servicio: string; plantilla: string; version: string; workflow_id: string; nombre: string | null; estado: string }[]
}

export async function accionOnboardingInfo(storeId: string): Promise<InfoOnboarding | null> {
  const perfil = await getPerfilActual()
  if (!perfil || !puede(perfil.rol, 'supervisor')) return null
  const admin = createAdminClient()
  const [{ data: cat }, { data: contratados }, { data: wfs }] = await Promise.all([
    admin.from('servicios_catalogo').select('clave, nombre, descripcion, orden').eq('activo', true).order('orden'),
    admin.from('tienda_servicios').select('servicio, estado, credencial_ids').eq('store_id', storeId),
    admin
      .from('tienda_workflows')
      .select('servicio, plantilla, version, workflow_id, nombre, estado')
      .eq('store_id', storeId)
      .order('servicio'),
  ])
  const filasContratadas = (contratados ?? []) as { servicio: string; estado: string; credencial_ids: Record<string, string> | null }[]
  const estadoDe = new Map(filasContratadas.map((c) => [c.servicio, c.estado]))
  const credsDe = new Map(filasContratadas.map((c) => [c.servicio, c.credencial_ids ?? {}]))
  const servicios = ((cat ?? []) as { clave: string; nombre: string; descripcion: string | null }[]).map((s) => {
    const defs = PLANTILLAS[s.clave] ?? []
    const slotSet = new Set(defs.flatMap((d) => d.slots))
    // Al navegador solo viajan los slots visibles: los de infraestructura
    // compartida (oculto) se resuelven en el servidor y sus ids no se exponen.
    const visibles = Array.from(slotSet).map((k) => SLOTS[k]).filter((d) => d && !d.oculto)
    const credsServicio = credsDe.get(s.clave) ?? {}
    return {
      clave: s.clave,
      nombre: s.nombre,
      descripcion: s.descripcion,
      contratado: estadoDe.get(s.clave) ?? null,
      plantillas: defs.map((d) => ({ plantilla: d.plantilla, version: d.version })),
      slots: visibles,
      credencialesActuales: Object.fromEntries(
        visibles.filter((d) => d.modo === 'id' && credsServicio[d.slot]).map((d) => [d.slot, credsServicio[d.slot]])
      ),
    }
  })
  return {
    n8nListo: n8nConfigurado(),
    servicios,
    workflows: (wfs ?? []) as InfoOnboarding['workflows'],
  }
}

type ResAprov = { ok: boolean; error?: string; creados?: { plantilla: string; workflow_id: string; nombre: string }[] }

// Activa en n8n un workflow aprovisionado (tras la prueba controlada) y lo
// refleja en el registro. Solo supervisor+.
export async function accionActivarWorkflow(storeId: string, workflowId: string): Promise<ResAprov> {
  const perfil = await getPerfilActual()
  if (!perfil) return { ok: false, error: 'No autenticado' }
  if (!puede(perfil.rol, 'supervisor')) return { ok: false, error: 'Sin permiso' }
  const admin = createAdminClient()
  const { data: fila } = await admin
    .from('tienda_workflows')
    .select('id, estado, servicio')
    .eq('store_id', storeId)
    .eq('workflow_id', workflowId)
    .maybeSingle()
  if (!fila) return { ok: false, error: 'Workflow no registrado para esta tienda' }
  const r = await activarWorkflowN8n(workflowId)
  if (!r.ok) return { ok: false, error: r.error }
  await admin
    .from('tienda_workflows')
    .update({ estado: 'activo', notas: 'Activado desde el panel.' })
    .eq('store_id', storeId)
    .eq('workflow_id', workflowId)
  await admin
    .from('tienda_servicios')
    .update({ estado: 'activo', updated_at: new Date().toISOString() })
    .eq('store_id', storeId)
    .eq('servicio', fila.servicio)
  await admin.from('audit_log').insert({
    actor_id: perfil.id,
    actor_tipo: 'humano',
    accion: 'activar_workflow',
    entidad: 'tienda_workflows',
    entidad_id: workflowId,
    store_id: storeId,
  })
  return { ok: true }
}

// Retira un workflow: lo desactiva y lo BORRA de n8n (pensado para duplicados
// o instancias descartadas). Las versiones legítimas reemplazadas se conservan
// como 'respaldo' vía re-aprovisión, no por acá. Solo supervisor+.
export async function accionRetirarWorkflow(storeId: string, workflowId: string): Promise<ResAprov> {
  const perfil = await getPerfilActual()
  if (!perfil) return { ok: false, error: 'No autenticado' }
  if (!puede(perfil.rol, 'supervisor')) return { ok: false, error: 'Sin permiso' }
  const admin = createAdminClient()
  const { data: fila } = await admin
    .from('tienda_workflows')
    .select('id')
    .eq('store_id', storeId)
    .eq('workflow_id', workflowId)
    .maybeSingle()
  if (!fila) return { ok: false, error: 'Workflow no registrado para esta tienda' }
  await desactivarWorkflowN8n(workflowId) // si ya estaba inactivo, no pasa nada
  const r = await borrarWorkflowN8n(workflowId)
  if (!r.ok) return { ok: false, error: r.error }
  await admin
    .from('tienda_workflows')
    .update({ estado: 'retirado', notas: 'Retirado y borrado de n8n desde el panel.' })
    .eq('store_id', storeId)
    .eq('workflow_id', workflowId)
  await admin.from('audit_log').insert({
    actor_id: perfil.id,
    actor_tipo: 'humano',
    accion: 'retirar_workflow',
    entidad: 'tienda_workflows',
    entidad_id: workflowId,
    store_id: storeId,
  })
  return { ok: true }
}

// Contrata un servicio sin plantillas todavía: queda 'pendiente' en el registro.
export async function accionContratarServicio(storeId: string, servicio: string): Promise<ResAprov> {
  const perfil = await getPerfilActual()
  if (!perfil) return { ok: false, error: 'No autenticado' }
  if (!puede(perfil.rol, 'supervisor')) return { ok: false, error: 'Sin permiso' }
  const admin = createAdminClient()
  const { error } = await admin
    .from('tienda_servicios')
    .upsert({ store_id: storeId, servicio, estado: 'pendiente', updated_at: new Date().toISOString() }, { onConflict: 'store_id,servicio' })
  if (error) return { ok: false, error: error.message }
  await admin.from('audit_log').insert({
    actor_id: perfil.id,
    actor_tipo: 'humano',
    accion: 'contratar_servicio',
    entidad: 'tienda_servicios',
    entidad_id: storeId,
    despues: { servicio },
  })
  return { ok: true }
}

// Aprovisiona un servicio: instancia sus plantillas con los parámetros de la
// tienda y las credenciales elegidas, crea los workflows en n8n (nacen
// DESACTIVADOS: la activación llega tras la prueba controlada) y los registra.
export async function accionAprovisionar(
  storeId: string,
  servicio: string,
  credencialIds: Record<string, string>
): Promise<ResAprov> {
  const perfil = await getPerfilActual()
  if (!perfil) return { ok: false, error: 'No autenticado' }
  if (!puede(perfil.rol, 'supervisor')) return { ok: false, error: 'Sin permiso' }

  const defs = PLANTILLAS[servicio] ?? []
  if (defs.length === 0) return { ok: false, error: 'Este servicio aún no tiene plantillas — se puede contratar como pendiente.' }

  const admin = createAdminClient()
  const { data: tienda } = await admin
    .from('stores')
    .select('id, nombre, empresas(nombre)')
    .eq('id', storeId)
    .maybeSingle()
  if (!tienda) return { ok: false, error: 'Tienda no encontrada' }
  const nombreTienda = (tienda as { nombre: string }).nombre
  const nombreEmpresa = (tienda as unknown as { empresas: { nombre: string } | null }).empresas?.nombre ?? 'ECOMHILL'

  // Slots OCULTOS (infraestructura compartida): se resuelven SOLO en el servidor
  // — lo registrado para la tienda o el default de plataforma. Nunca se acepta
  // un valor del navegador para estos.
  const { data: servicioPrevio } = await admin
    .from('tienda_servicios')
    .select('credencial_ids')
    .eq('store_id', storeId)
    .eq('servicio', servicio)
    .maybeSingle()
  const credsPrevias = ((servicioPrevio?.credencial_ids ?? {}) as Record<string, string>) || {}

  const slotsNecesarios = Array.from(new Set(defs.flatMap((d) => d.slots)))
  for (const s of slotsNecesarios) {
    const def = SLOTS[s]
    if (def?.oculto) {
      const resuelto = credsPrevias[s] || def.defaultId
      if (!resuelto) return { ok: false, error: `La plataforma no tiene credencial para "${def.nombre}"` }
      credencialIds[s] = resuelto
      continue
    }
    if (!credencialIds[s]?.trim()) return { ok: false, error: `Falta la credencial del slot "${def?.nombre ?? s}"` }
  }

  // Slots de TOKEN: el valor recibido es el secreto. Se prueba contra el servicio
  // real y, si sirve, viaja directo a la API de n8n (que crea la credencial).
  // A partir de acá solo circula el ID; el secreto no se guarda ni se loguea.
  const idsFinales: Record<string, string> = { ...credencialIds }
  for (const s of slotsNecesarios) {
    const def = SLOTS[s]
    if (def?.modo !== 'token') continue
    const secreto = credencialIds[s].trim()
    if (def.prueba) {
      try {
        const res = await fetch(def.prueba.url, {
          method: def.prueba.metodo,
          headers: { 'Content-Type': 'application/json', [def.prueba.header]: `${def.prueba.prefijo ?? ''}${secreto}` },
          body: def.prueba.body === undefined ? undefined : JSON.stringify(def.prueba.body),
          cache: 'no-store',
        })
        if (res.status === 401 || res.status === 403) {
          return { ok: false, error: `${def.nombre}: el servicio rechazó la key (HTTP ${res.status}). Revisá que sea la de esta tienda.` }
        }
      } catch (e) {
        return { ok: false, error: `${def.nombre}: no se pudo probar la key (${e instanceof Error ? e.message : 'error de red'})` }
      }
    }
    const cred = await crearCredencialN8n(
      `[${nombreTienda.toUpperCase()}] ${def.nombre}`,
      def.tipoN8n,
      def.campoN8n
        ? { [def.campoN8n]: secreto }
        : def.headerName
          ? { name: def.headerName, value: secreto }
          : { value: secreto }
    )
    if (!cred.ok) return { ok: false, error: `${def.nombre}: n8n no pudo crear la credencial — ${cred.error}` }
    idsFinales[s] = cred.data.id
  }

  const params = {
    EMPRESA_TIENDA: `${nombreEmpresa.toUpperCase()}/${nombreTienda.toUpperCase()}`,
    TIENDA_NOMBRE: nombreTienda,
    STORE_ID: storeId,
    SUPABASE_URL,
    DRIVE_FOLDER_ID,
    ...Object.fromEntries(slotsNecesarios.map((s) => [`CRED_${s.toUpperCase()}`, idsFinales[s].trim()])),
  } as Parameters<typeof instanciarPlantilla>[1]

  const creados: { plantilla: string; workflow_id: string; nombre: string }[] = []
  for (const def of defs) {
    // Azul/verde: si ya hay una instancia registrada de esta plantilla, no se pisa
    // — se crea la nueva y la vieja queda para marcar como respaldo al publicar.
    let wf
    try {
      wf = instanciarPlantilla(def, params)
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e), creados }
    }
    const r = await crearWorkflowN8n(wf)
    if (!r.ok) return { ok: false, error: `${def.plantilla}: ${r.error}`, creados }
    creados.push({ plantilla: def.plantilla, workflow_id: r.data.id, nombre: wf.name })
    await admin.from('tienda_workflows').insert({
      store_id: storeId,
      servicio,
      plantilla: def.plantilla,
      version: def.version,
      workflow_id: r.data.id,
      nombre: wf.name,
      estado: 'inactivo',
      notas: 'Aprovisionado desde plantilla. Esperando prueba controlada antes de activar.',
    })
  }

  await admin.from('tienda_servicios').upsert(
    {
      store_id: storeId,
      servicio,
      estado: 'aprovisionando',
      credencial_ids: idsFinales,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'store_id,servicio' }
  )
  await admin.from('audit_log').insert({
    actor_id: perfil.id,
    actor_tipo: 'humano',
    accion: 'aprovisionar_servicio',
    entidad: 'tienda_servicios',
    entidad_id: storeId,
    despues: { servicio, workflows: creados.map((c) => c.workflow_id) },
  })
  return { ok: true, creados }
}
