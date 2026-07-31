'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { Bot, FileText, Gavel, Mail, MessageCircle, Paperclip, RefreshCw, Search, Send, Settings, Tag, User, Workflow, type LucideIcon } from 'lucide-react'
import type { EventoActividad } from '@/lib/supabase/actividad'
import { accionActividad } from '@/app/actions-actividad'
import { MOTIVO_LABEL } from '@/lib/supabase/queries'

// ============================================================================
// Actividad — el log del sistema en lenguaje humano: quién hizo qué, sobre qué
// clienta/caso, agrupado por día y con el pedido a un clic.
// ============================================================================

// Cómo se cuenta cada acción: frase natural + ícono + color propios.
const ACCIONES: Record<string, { frase: string; Ico: LucideIcon; color: string; bg: string }> = {
  // n8n
  clasifico_correo: { frase: 'Correo clasificado', Ico: Tag, color: 'var(--ink-2)', bg: 'var(--panel-2)' },
  creo_borrador: { frase: 'Borrador listo', Ico: FileText, color: 'var(--accent)', bg: 'var(--accent-soft)' },
  ingreso_dm: { frase: 'Nuevo mensaje directo', Ico: MessageCircle, color: '#c02a6c', bg: 'color-mix(in srgb, #c02a6c 12%, var(--panel))' },
  ingreso_comentario: { frase: 'Nuevo comentario', Ico: MessageCircle, color: '#1864d4', bg: 'color-mix(in srgb, #1864d4 12%, var(--panel))' },
  guardo_adjunto: { frase: 'Imagen guardada', Ico: Paperclip, color: 'var(--ink-2)', bg: 'var(--panel-2)' },
  ingreso_disputa: { frase: 'Disputa registrada', Ico: Gavel, color: 'var(--crit)', bg: 'var(--crit-bg)' },
  // humanas / bot (audit_log)
  enviar: { frase: 'Aprobó y envió la respuesta', Ico: Send, color: 'var(--ok)', bg: 'var(--ok-bg)' },
  auto_enviar: { frase: 'Respuesta enviada automáticamente', Ico: Bot, color: 'var(--ok)', bg: 'var(--ok-bg)' },
  auto_aprobar: { frase: 'Respuesta auto-aprobada por reglas', Ico: Bot, color: 'var(--ok)', bg: 'var(--ok-bg)' },
  cerrar: { frase: 'Cerró el caso', Ico: Mail, color: 'var(--ink-2)', bg: 'var(--panel-2)' },
  no_responder: { frase: 'Marcó como no responder', Ico: Mail, color: 'var(--ink-3)', bg: 'var(--panel-2)' },
  guardar_borrador: { frase: 'Guardó el borrador', Ico: FileText, color: 'var(--ink-2)', bg: 'var(--panel-2)' },
  cambiar_config: { frase: 'Cambió la configuración', Ico: Settings, color: 'var(--warn)', bg: 'var(--warn-bg)' },
  cambiar_politica: { frase: 'Cambió una política de autonomía', Ico: Settings, color: 'var(--warn)', bg: 'var(--warn-bg)' },
  corregir_reclamo: { frase: 'Corrigió la clasificación', Ico: Tag, color: 'var(--ink-2)', bg: 'var(--panel-2)' },
  asignar_pedido: { frase: 'Asignó el pedido al correo', Ico: Mail, color: 'var(--accent)', bg: 'var(--accent-soft)' },
  ocultar_adjunto: { frase: 'Ocultó un adjunto', Ico: Paperclip, color: 'var(--ink-3)', bg: 'var(--panel-2)' },
  cierre_dia: { frase: 'Envió el cierre de día a Telegram', Ico: Send, color: 'var(--accent)', bg: 'var(--accent-soft)' },
  guardar_evidencia: { frase: 'Editó la evidencia de la disputa', Ico: Gavel, color: 'var(--warn)', bg: 'var(--warn-bg)' },
  enviar_evidencia: { frase: 'Pidió enviar la evidencia de la disputa', Ico: Gavel, color: 'var(--crit)', bg: 'var(--crit-bg)' },
  aceptar_disputa: { frase: 'Pidió aceptar la disputa', Ico: Gavel, color: 'var(--crit)', bg: 'var(--crit-bg)' },
  responder_desde_gmail: { frase: 'Respondió desde Gmail (conciliado)', Ico: Send, color: 'var(--ok)', bg: 'var(--ok-bg)' },
  redes_marcar_resuelto: { frase: 'Resolvió la conversación de redes', Ico: MessageCircle, color: 'var(--ok)', bg: 'var(--ok-bg)' },
  redes_no_responder: { frase: 'Marcó la conversación como no responder', Ico: MessageCircle, color: 'var(--ink-3)', bg: 'var(--panel-2)' },
}
const ACCION_DEFAULT = { frase: '', Ico: Workflow, color: 'var(--ink-2)', bg: 'var(--panel-2)' }

function nombreCliente(e: EventoActividad): string | null {
  if (!e.cliente) return null
  // "Nombre <mail@x>" o "mail@x" → mostrar lo más humano posible
  const m = e.cliente.match(/^"?([^"<]+)"?\s*</)
  if (m) return m[1].trim()
  return e.cliente.split('@')[0].replace(/[._]/g, ' ')
}

function fmtDia(iso: string): string {
  const d = new Date(iso)
  const hoy = new Date()
  const ayer = new Date(hoy)
  ayer.setDate(hoy.getDate() - 1)
  const mismo = (a: Date, b: Date) => a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()
  if (mismo(d, hoy)) return 'Hoy'
  if (mismo(d, ayer)) return 'Ayer'
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
  return `${d.getDate()} de ${MESES[d.getMonth()]}`
}

function fmtHora(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
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
      return `${e.actor} ${e.accion} ${e.cliente ?? ''} ${e.contexto ?? ''} ${e.motivo ?? ''} ${e.order_number ?? ''}`.toLowerCase().includes(q)
    })
  }, [eventos, filtro, busca])

  // Agrupar por día conservando el orden (ya viene desc)
  const grupos = useMemo(() => {
    const out: { dia: string; evs: EventoActividad[] }[] = []
    for (const e of items) {
      const dia = fmtDia(e.fecha)
      const ultimo = out[out.length - 1]
      if (ultimo && ultimo.dia === dia) ultimo.evs.push(e)
      else out.push({ dia, evs: [e] })
    }
    return out
  }, [items])

  const FILTROS: { key: typeof filtro; label: string }[] = [
    { key: 'todos', label: 'Todo' },
    { key: 'humano', label: 'Equipo' },
    { key: 'bot', label: 'IA / Bot' },
    { key: 'n8n', label: 'Automático' },
  ]

  return (
    <div className="mx-auto flex h-full min-h-0 max-w-4xl flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-[18px] font-bold text-[var(--ink)]">Actividad</h1>
        <span className="text-[12px] text-[var(--ink-3)]">todo lo que hace el equipo, la IA y el sistema</span>
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
            placeholder="Clienta, pedido, acción…"
            className="w-60 rounded-lg border border-[var(--line-2)] bg-[var(--panel)] py-1.5 pl-8 pr-3 text-[13px] text-[var(--ink)] outline-none focus:border-[var(--accent)]"
          />
        </div>
      </div>

      <div className={`min-h-0 flex-1 overflow-y-auto transition ${cargando ? 'opacity-60' : ''}`}>
        {grupos.length === 0 && (
          <p className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-8 text-center text-[13px] text-[var(--ink-3)]">
            Sin actividad con este filtro.
          </p>
        )}
        {grupos.map((g) => (
          <div key={g.dia} className="mb-4">
            <p className="sticky top-0 z-10 mb-1.5 bg-[var(--bg)] px-1 py-1 text-[11px] font-bold uppercase tracking-widest text-[var(--ink-3)]">
              {g.dia}
            </p>
            <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--panel)]">
              {g.evs.map((e, i) => {
                const a = ACCIONES[e.accion] ?? ACCION_DEFAULT
                const cliente = nombreCliente(e)
                const esHumano = e.origen === 'humano'
                return (
                  <div key={i} className="flex items-start gap-3 border-b border-[var(--line)] px-4 py-3 last:border-0 hover:bg-[var(--panel-2)]">
                    <span className="mt-0.5 grid h-8 w-8 flex-none place-items-center rounded-full" style={{ background: a.bg, color: a.color }}>
                      <a.Ico size={15} strokeWidth={2} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13.5px] leading-snug text-[var(--ink)]">
                        {esHumano ? (
                          <>
                            <span className="font-bold">{e.actor}</span>{' '}
                            <span>{(a.frase || e.accion).toLowerCase()}</span>
                          </>
                        ) : (
                          <span className="font-bold">{a.frase || e.accion}</span>
                        )}
                        {cliente && (
                          <>
                            {' '}<span className="text-[var(--ink-2)]">de</span>{' '}
                            <span className="font-semibold" title={e.cliente ?? undefined}>{cliente}</span>
                          </>
                        )}
                      </p>
                      {(e.contexto || e.motivo || e.legal || e.order_number) && (
                        <p className="mt-1 flex flex-wrap items-center gap-1.5">
                          {e.motivo && (
                            <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[10.5px] font-bold text-[var(--accent)]">
                              {MOTIVO_LABEL[e.motivo] ?? e.motivo}
                            </span>
                          )}
                          {e.legal && (
                            <span className="rounded-full bg-[var(--crit-bg)] px-2 py-0.5 text-[10.5px] font-bold text-[var(--crit)]">Legal</span>
                          )}
                          {e.order_number && (
                            <button
                              onClick={() => onVerPedido?.(e.order_number as string)}
                              className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[10.5px] font-bold text-[var(--accent)] transition hover:opacity-80"
                              title="Abrir el pedido 360"
                            >
                              Pedido #{e.order_number}
                            </button>
                          )}
                          {e.contexto && (
                            <span className="truncate text-[12px] italic text-[var(--ink-3)]" title={e.contexto}>
                              “{e.contexto}”
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                    <span className="mt-0.5 flex-none font-mono text-[11.5px] tabular-nums text-[var(--ink-3)]">{fmtHora(e.fecha)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
