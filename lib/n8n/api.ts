// ============================================================================
// Cliente mínimo de la API pública de n8n (aprovisionador H3).
//
// Los SECRETOS de las tiendas jamás tocan nuestra base: cuando el onboarding
// recibe un token, este cliente lo reenvía DIRECTO a n8n (que crea la
// credencial) y a nosotros solo nos queda el id. Requiere dos variables de
// entorno del servidor:
//   N8N_API_URL  → ej: https://vmi3310874.contaboserver.net/api/v1
//   N8N_API_KEY  → API key creada en n8n (Settings → n8n API)
// ============================================================================

type N8nRes<T> = { ok: true; data: T } | { ok: false; error: string }

function base(): { url: string; key: string } | null {
  const url = process.env.N8N_API_URL
  const key = process.env.N8N_API_KEY
  if (!url || !key) return null
  return { url: url.replace(/\/$/, ''), key }
}

export function n8nConfigurado(): boolean {
  return base() !== null
}

async function llamar<T>(metodo: string, ruta: string, body?: unknown): Promise<N8nRes<T>> {
  const cfg = base()
  if (!cfg) {
    return { ok: false, error: 'Falta configurar N8N_API_URL y N8N_API_KEY en el servidor (Settings → n8n API en n8n).' }
  }
  try {
    const res = await fetch(`${cfg.url}${ruta}`, {
      method: metodo,
      headers: { 'X-N8N-API-KEY': cfg.key, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
    })
    const texto = await res.text()
    if (!res.ok) return { ok: false, error: `n8n respondió ${res.status}: ${texto.slice(0, 300)}` }
    return { ok: true, data: (texto ? JSON.parse(texto) : {}) as T }
  } catch (e) {
    return { ok: false, error: `No se pudo hablar con n8n: ${e instanceof Error ? e.message : String(e)}` }
  }
}

// Crea una credencial en n8n con el secreto recibido y devuelve SOLO su id.
// El secreto muere acá: no se loguea, no se guarda, no se devuelve.
export async function crearCredencialN8n(nombre: string, tipo: string, data: Record<string, string>): Promise<N8nRes<{ id: string }>> {
  const r = await llamar<{ id: string }>('POST', '/credentials', { name: nombre, type: tipo, data })
  return r.ok ? { ok: true, data: { id: r.data.id } } : r
}

// Activa un workflow ya creado (el paso posterior a la prueba controlada).
export async function activarWorkflowN8n(id: string): Promise<N8nRes<{ id: string }>> {
  return llamar<{ id: string }>('POST', `/workflows/${id}/activate`)
}

// Desactiva un workflow (azul/verde: el viejo se apaga cuando se publica el nuevo).
export async function desactivarWorkflowN8n(id: string): Promise<N8nRes<{ id: string }>> {
  return llamar<{ id: string }>('POST', `/workflows/${id}/deactivate`)
}

// Borra un workflow de n8n (solo para duplicados/retirados; las versiones
// legítimas anteriores se conservan desactivadas como respaldo).
export async function borrarWorkflowN8n(id: string): Promise<N8nRes<Record<string, never>>> {
  return llamar<Record<string, never>>('DELETE', `/workflows/${id}`)
}

// Crea un workflow (nace DESACTIVADO: la activación es un paso aparte, después
// de la prueba controlada — regla del proyecto para todo lo que ejecuta solo).
export async function crearWorkflowN8n(wf: {
  name: string
  nodes: unknown[]
  connections: Record<string, unknown>
  settings?: Record<string, unknown>
}): Promise<N8nRes<{ id: string; name: string }>> {
  return llamar<{ id: string; name: string }>('POST', '/workflows', {
    name: wf.name,
    nodes: wf.nodes,
    connections: wf.connections,
    settings: wf.settings ?? { executionOrder: 'v1' },
  })
}
