// ============================================================================
// Registro de plantillas disponibles + instanciador (aprovisionador H3).
//
// Cada plantilla vive como JSON versionado en /plantillas (ver su README, que
// es el contrato). Acá se declara cuáles existen por servicio, qué SLOTS de
// credenciales piden, y cómo se instancian: sustitución de {{PARAM}} sobre el
// JSON y limpieza del _manifest. El resultado se manda a la API de n8n.
// ============================================================================

import wfGmailLiveV1 from '@/plantillas/correo/wf-gmail-live.v1.json'
import wfParcelPanelV4 from '@/plantillas/tracking/wf-parcelpanel.v4.json'

export type SlotCredencial = {
  slot: string
  nombre: string
  tipoN8n: string
  // 'id': la credencial se crea en la UI de n8n (OAuth: Gmail, Drive) y acá se
  //       pega su id. 'token': el secreto se pega en el formulario y viaja
  //       DIRECTO a la API de n8n, que crea la credencial (nunca a nuestra BD).
  modo: 'id' | 'token'
  ayuda: string
  // Credenciales compartidas entre tiendas (la BD, la IA): id ya conocido que
  // el formulario ofrece como valor por defecto.
  defaultId?: string
  // Infraestructura compartida (BD, Drive del holding): el slot NO se muestra en
  // el formulario ni viaja al navegador — el servidor lo resuelve solo con
  // defaultId (o con lo ya registrado para la tienda). Ningún endpoint expone
  // ids de credenciales de la plataforma.
  oculto?: boolean
  // Solo modo 'token' con tipo httpHeaderAuth: nombre del header donde va la key.
  headerName?: string
  // Solo modo 'token': cómo PROBAR la key contra el servicio real antes de crear
  // la credencial en n8n. Si el servicio la rechaza (401/403), no se crea nada.
  prueba?: { metodo: 'GET' | 'POST'; url: string; body?: unknown }
}

export const SLOTS: Record<string, SlotCredencial> = {
  gmail: {
    slot: 'gmail',
    nombre: 'Gmail de la tienda',
    tipoN8n: 'gmailOAuth2',
    modo: 'id',
    ayuda: 'Creá la credencial OAuth en n8n (Credentials → Gmail) con el buzón del SAC de esta tienda y pegá acá su ID.',
  },
  supabase: {
    slot: 'supabase',
    nombre: 'Supabase (base compartida)',
    tipoN8n: 'supabaseApi',
    modo: 'id',
    ayuda: 'Infraestructura de la plataforma: se asigna sola.',
    defaultId: 'Mcn8dggRB2Etm3nz',
    oculto: true,
  },
  drive: {
    slot: 'drive',
    nombre: 'Google Drive (adjuntos)',
    tipoN8n: 'googleDriveOAuth2Api',
    modo: 'id',
    ayuda: 'Drive compartido del holding: se asigna solo. (Un Drive propio por tienda se define como override en la config de la tienda.)',
    defaultId: 'soYQBw2dd9stYXr3',
    oculto: true,
  },
  parcelpanel: {
    slot: 'parcelpanel',
    nombre: 'ParcelPanel API key',
    tipoN8n: 'httpHeaderAuth',
    modo: 'token',
    ayuda: 'Pegá la API key de ParcelPanel de esta tienda (app ParcelPanel → Settings → API). Va DIRECTO a n8n, que crea la credencial; antes se prueba contra ParcelPanel. Acá nunca se guarda.',
    headerName: 'PP-Api-Key',
    prueba: { metodo: 'POST', url: 'https://api.parcelpanel.com/api/v1/order/post', body: { order_name: '#PRUEBA-1' } },
  },
}

export type PlantillaDef = {
  plantilla: string
  version: string
  servicio: string
  slots: string[] // claves de SLOTS que exige
  json: unknown
}

// Qué plantillas existen HOY por servicio. Un servicio sin entradas se puede
// contratar igual (queda 'pendiente'), pero no se le aprovisiona nada todavía.
export const PLANTILLAS: Record<string, PlantillaDef[]> = {
  correo: [
    { plantilla: 'wf-gmail-live', version: 'v1', servicio: 'correo', slots: ['gmail', 'supabase', 'drive'], json: wfGmailLiveV1 },
  ],
  tracking: [
    { plantilla: 'wf-parcelpanel', version: 'v4', servicio: 'tracking', slots: ['parcelpanel', 'supabase'], json: wfParcelPanelV4 },
  ],
}

export type ParamsTienda = {
  EMPRESA_TIENDA: string // 'ECOMHILL/GIULIANI' → nombre del WF
  TIENDA_NOMBRE: string
  STORE_ID: string
  SUPABASE_URL: string
  DRIVE_FOLDER_ID: string
  // credenciales por slot: CRED_GMAIL, CRED_SUPABASE, CRED_DRIVE, …
  [k: `CRED_${string}`]: string
}

// Instancia una plantilla: sustituye todos los {{PARAM}} y descarta _manifest.
// Falla fuerte si queda un placeholder sin resolver: mejor no crear el workflow
// que crear uno a medio parametrizar.
export function instanciarPlantilla(def: PlantillaDef, params: ParamsTienda): {
  name: string
  nodes: unknown[]
  connections: Record<string, unknown>
  settings?: Record<string, unknown>
} {
  let texto = JSON.stringify(def.json)
  for (const [clave, valor] of Object.entries(params)) {
    texto = texto.split(`{{${clave}}}`).join(String(valor))
  }
  const sinResolver = texto.match(/\{\{[A-Z_]+\}\}/)
  if (sinResolver) {
    throw new Error(`Plantilla ${def.plantilla} ${def.version}: falta el parámetro ${sinResolver[0]}`)
  }
  const obj = JSON.parse(texto) as Record<string, unknown>
  delete obj._manifest
  // n8n exige un id por nodo; la plantilla no los trae (los ids son por instancia).
  const nodes = (obj.nodes as Record<string, unknown>[]).map((n, i) => ({ id: `nodo-${i + 1}`, ...n }))
  return {
    name: String(obj.name),
    nodes,
    connections: obj.connections as Record<string, unknown>,
    settings: obj.settings as Record<string, unknown> | undefined,
  }
}
