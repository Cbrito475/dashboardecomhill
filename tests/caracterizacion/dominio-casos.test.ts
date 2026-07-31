import { describe, it, expect } from 'vitest'
import {
  MOTIVO_LABEL,
  GRUPO_MOTIVO,
  GRUPO_LABEL,
  nivelMotivo,
  grupoMotivo,
  esGrupoProducto,
  causaRaizDe,
  desenlaceDe,
} from '@/lib/supabase/queries'

// ============================================================================
// TESTS DE CARACTERIZACIÓN — congelan el comportamiento ACTUAL del dominio.
// Son la red de seguridad del plan multi-empresa: si un refactor cambia
// cualquiera de estos resultados, el test lo grita antes del deploy.
// NO "arreglan" nada: documentan lo que el sistema hace hoy.
// ============================================================================

describe('MOTIVO_LABEL / GRUPO_MOTIVO (taxonomía congelada)', () => {
  it('todo motivo del grupo tiene etiqueta', () => {
    for (const motivo of Object.keys(GRUPO_MOTIVO)) {
      expect(MOTIVO_LABEL[motivo], `falta etiqueta para ${motivo}`).toBeTruthy()
    }
  })

  it('asignación de dueños de la solución (regla de negocio del diagnóstico)', () => {
    expect(GRUPO_MOTIVO.talla).toBe('tienda')
    expect(GRUPO_MOTIVO.correccion_datos).toBe('tienda')
    expect(GRUPO_MOTIVO.foto_distinta).toBe('producto')
    expect(GRUPO_MOTIVO.calidad_material).toBe('producto')
    expect(GRUPO_MOTIVO.roto_costura).toBe('producto')
    expect(GRUPO_MOTIVO.producto_equivocado).toBe('producto')
    expect(GRUPO_MOTIVO.no_llego_aduana).toBe('envio')
    expect(GRUPO_MOTIVO.insatisfaccion_estafa).toBe('gestion')
  })

  it('los 4 grupos tienen etiqueta', () => {
    expect(Object.keys(GRUPO_LABEL).sort()).toEqual(['envio', 'gestion', 'producto', 'tienda'])
  })
})

describe('grupoMotivo / esGrupoProducto', () => {
  it('motivo desconocido cae en gestion', () => {
    expect(grupoMotivo('algo_inventado')).toBe('gestion')
  })

  it('esGrupoProducto = tienda o producto (lo que evalúa la sección Productos)', () => {
    expect(esGrupoProducto('talla')).toBe(true)
    expect(esGrupoProducto('calidad_material')).toBe(true)
    expect(esGrupoProducto('no_llego_aduana')).toBe(false)
    expect(esGrupoProducto('insatisfaccion_estafa')).toBe(false)
  })
})

describe('nivelMotivo (color del chip por gravedad)', () => {
  it('desconocido = leve', () => {
    expect(nivelMotivo('inventado')).toBe('leve')
  })
  it('sin_respuesta y cancelacion según tabla actual', () => {
    expect(nivelMotivo('sin_respuesta')).toBe('warn') // gravedad 3
    expect(nivelMotivo('cancelacion')).toBe('leve') // gravedad 2
    expect(nivelMotivo('correccion_datos')).toBe('leve') // gravedad 1
  })
})

describe('causaRaizDe (la regla única de causa raíz del dashboard)', () => {
  const it_ = (motivo: string | null, fecha: string | null, gravedad: number | null) => ({ motivo, fecha, gravedad })

  it('sin interacciones reales → sin_causa_declarada', () => {
    expect(causaRaizDe([])).toBe('sin_causa_declarada')
    expect(causaRaizDe([it_('consulta_estado', '2026-07-01', 1)])).toBe('sin_causa_declarada')
    expect(causaRaizDe([it_('reembolso_solicitado', '2026-07-01', 3)])).toBe('sin_causa_declarada')
  })

  it('gana la ÚLTIMA causa real por fecha', () => {
    expect(
      causaRaizDe([it_('talla', '2026-07-01', 2), it_('calidad_material', '2026-07-05', 2)])
    ).toBe('calidad_material')
  })

  it('misma fecha → gana la más grave', () => {
    expect(
      causaRaizDe([it_('talla', '2026-07-01', 4), it_('otro', '2026-07-01', 1)])
    ).toBe('talla')
  })

  it('ignora consultas de estado aunque sean lo último', () => {
    expect(
      causaRaizDe([it_('roto_costura', '2026-07-01', 2), it_('consulta_estado', '2026-07-09', 1)])
    ).toBe('roto_costura')
  })
})

describe('desenlaceDe (qué pidió la clienta — última petición)', () => {
  const it_ = (motivo: string | null, fecha: string | null, gravedad: number | null, resolucion?: string | null) => ({
    motivo,
    fecha,
    gravedad,
    resolucion,
  })

  it('petición por motivo puro', () => {
    expect(desenlaceDe([it_('reembolso_solicitado', '2026-07-01', 3)])).toBe('reembolso')
    expect(desenlaceDe([it_('cambio_solicitado', '2026-07-01', 2)])).toBe('cambio')
  })

  it('petición por resolucion (problema + petición en el mismo correo)', () => {
    expect(desenlaceDe([it_('calidad_material', '2026-07-01', 2, 'reembolso')])).toBe('reembolso')
    expect(desenlaceDe([it_('talla', '2026-07-01', 2, 'reenvio')])).toBe('cambio')
    expect(desenlaceDe([it_('talla', '2026-07-01', 2, 'cambio')])).toBe('cambio')
  })

  it('gana la petición MÁS RECIENTE (>= en empate favorece a la última del array)', () => {
    expect(
      desenlaceDe([it_('reembolso_solicitado', '2026-07-01', 3), it_('cambio_solicitado', '2026-07-05', 2)])
    ).toBe('cambio')
    // empate exacto de fecha: la última en el array gana (comportamiento actual con >=)
    expect(
      desenlaceDe([it_('reembolso_solicitado', '2026-07-01', 3), it_('cambio_solicitado', '2026-07-01', 2)])
    ).toBe('cambio')
  })

  it('sin petición + causa de envío → esperando', () => {
    expect(desenlaceDe([it_('no_llego_aduana', '2026-07-01', 2)])).toBe('esperando')
    expect(desenlaceDe([it_('consulta_estado', '2026-07-01', 1)])).toBe('esperando') // causa = sin_causa_declarada
  })

  it('sin petición + problema de producto → sin_exigir', () => {
    expect(desenlaceDe([it_('calidad_material', '2026-07-01', 2)])).toBe('sin_exigir')
    expect(desenlaceDe([it_('talla', '2026-07-01', 2)])).toBe('sin_exigir')
  })
})
