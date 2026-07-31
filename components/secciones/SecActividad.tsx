'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { Bot, RefreshCw, Search, User, Workflow } from 'lucide-react'
import type { EventoActividad } from '@/lib/supabase/actividad'
import { accionActividad } from '@/app/actions-actividad'

// ============================================================================
// Actividad — el log a la vista de TODO el sistema: cada acción humana, del
// bot/IA y de los workflows de n8n, en una sola línea de tiempo.
// ============================================================================

const ACCION_LABEL: Record<string, string> = {
  // humanas (audit_log)
  enviar: 'Aprobó y envió una respuesta',
  auto_enviar: 'Envió respuesta automática',
  auto_aprobar: 'Auto-aprobó respuesta (reglas)',
  cerrar: 'Cerró un caso',
  no_responder: 'Marcó como no responder',
  guardar_borrador: 'Guardó un borrador',
  cambiar_config: 'Cambió la configuración',
  cambiar_politica: 'Cambió una política de autonomía',
  corregir_reclamo: 'Corrigió la clasificación de un reclamo',
  asignar_pedido: 'Asignó un pedido a un correo',
  ocultar_adjunto: 'Ocultó un adjunto',
  cierre_dia: 'Envió el cierre de día',
  guardar_evidencia: 'Editó evidencia de disputa',
  enviar_evidencia: 'Pidió enviar evidencia de disputa',
  aceptar_disputa: 'Pidió aceptar una disputa',
  responder_desde_gmail: 'Respondió desde Gmail (conciliado)',
  redes_marcar_resuelto: 'Marcó conversación de redes como resuelta',
  redes_no_responder: 'Marcó conversación de redes como no responder',
  // n8n
  clasifico_correo: 'Clasificó un correo',
  creo_borrador: 'Creó un caso/borrador',
  ingreso_dm: 'Ingresó un DM',
  ingreso_comentario: 'Ingresó un comentario',
  guardo_adjunto: 'Guardó un adjunto',
  ingreso_disputa: 'Ingresó/actualizó una disputa',
}

const ORIGEN: Record<EventoActividad['origen'], { label: string; color: string; bg: string; Ico: typeof User }> = {
  humano: { label: 'Humano', color: 'var(--accent)', bg: 'var(--accent-soft)', Ico: User },
  bot: { label: 'IA / Bot', color: 'var(--ok)', bg: 'var(--ok-bg)', Ico: Bot },
  n8n: { label: 'n8n', color: 'var(--warn)', bg: 'var(--warn-bg)', Ico: Workflow },
}

function fmtHora(iso: string): string {
  const d = new Date(iso)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${dd}/${mm} ${hh}:${mi}`
}

export default function SecActividad({ onVerPedido }: { onVerPedido?: (order: string) => void }) {
  const [eventos, setEventos] = useState<EventoActividad[]>([])
  const [filtro, setFiltro] = useState<'todos' | 'humano' | 'bot' | 'n8n'>('todos')
  const [busca, setBusca] = useState('')
  const [cargando, startCarga] = useTransition()

  const cargar = () => startCarga(async () => setEventos(await accionActividad()))
  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const items = useMemo(() => {
    const q = busca.trim().toLowerCase()
    return eventos.filter((e) => {
      if (filtro !== 'todos' && e.origen !== filtro) return false
      if (!q) return true
      return `${e.actor} ${e.accion} ${e.detalle ?? ''} ${e.entidad_id ?? ''}`.toLowerCase().includes(q)
    })
  }, [eventos, filtro, busca])

  const FILTROS: { key: typeof filtro; label: string }[] = [
    { key: 'todos', label: 'Todo' },
    { key: 'humano', label: 'Humanos' },
    { key: 'bot', label: 'IA / Bot' },
    { key: 'n8n', label: 'n8n' },
  ]

  return (
    <div className="mx-auto flex h-full min-h-0 max-w-5xl flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-[18px] font-bold text-[var(--ink)]">Actividad del sistema</h1>
        <span className="text-[12px] text-[var(--ink-3)]">últimos {eventos.length} eventos</span>
        <button
          onClick={cargar}
          className="ml-auto flex items-center gap-1.5 rounded-lg border border-[var(--line-2)] bg-[var(--panel)] px-3 py-1.5 text-[12px] font-semibold text-[var(--ink-2)] transition hover:bg-[var(--panel-2)]"
        >
          <RefreshCw size={13} className={cargando ? 'animate-spin' : ''} /> Actualizar
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {FILTROS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFiltro(f.key)}
            className={`rounded-full border px-3 py-1 text-[12px] font-medium transition ${
              filtro === f.key
                ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                : 'border-[var(--line-2)] bg-[var(--panel-2)] text-[var(--ink-2)] hover:text-[var(--ink)]'
            }`}
          >
            {f.label}
          </button>
        ))}
        <div className="relative ml-auto">
          <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--ink-3)]" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar actor, acción, detalle…"
            className="w-64 rounded-lg border border-[var(--line-2)] bg-[var(--panel)] py-1.5 pl-8 pr-3 text-[13px] text-[var(--ink)] outline-none focus:border-[var(--accent)]"
          />
        </div>
      </div>

      <div className={`min-h-0 flex-1 overflow-y-auto rounded-2xl border border-[var(--line)] bg-[var(--panel)] transition ${cargando ? 'opacity-60' : ''}`}>
        {items.length === 0 && (
          <p className="p-8 text-center text-[13px] text-[var(--ink-3)]">Sin eventos con este filtro.</p>
        )}
        <ul>
          {items.map((e, i) => {
            const o = ORIGEN[e.origen]
            return (
              <li key={i} className="flex items-start gap-3 border-b border-[var(--line)] px-4 py-2.5 last:border-0 hover:bg-[var(--panel-2)]">
                <span className="mt-0.5 whitespace-nowrap font-mono text-[11.5px] tabular-nums text-[var(--ink-3)]">{fmtHora(e.fecha)}</span>
                <span
                  className="mt-0.5 flex flex-none items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-bold"
                  style={{ background: o.bg, color: o.color }}
                >
                  <o.Ico size={11} /> {o.label}
                </span>
                <span className="min-w-0 text-[13px] leading-snug text-[var(--ink)]">
                  <span className="font-semibold">{e.actor}</span>{' '}
                  <span className="text-[var(--ink-2)]">{ACCION_LABEL[e.accion] || e.accion}</span>
                  {e.detalle && <span className="text-[var(--ink-3)]"> — {e.detalle}</span>}
                  {!e.detalle && e.entidad_id && <span className="text-[var(--ink-3)]"> — {e.entidad}: {e.entidad_id.slice(0, 24)}</span>}
                  {e.order_number && (
                    <button
                      onClick={() => onVerPedido?.(e.order_number as string)}
                      className="ml-2 rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[11px] font-bold text-[var(--accent)] transition hover:opacity-80"
                      title="Abrir el pedido 360"
                    >
                      #{e.order_number}
                    </button>
                  )}
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
