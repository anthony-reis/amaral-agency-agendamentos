'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { bloqueioArea } from '@/lib/permissoes.server'
import { getPainelAutoescolaId } from './authPainel'
import type { ActionResult } from '../types'

async function bloqueio(autoescola_id: string, area: 'cadastros' | 'agendamentos'): Promise<string | null> {
  const erro = await bloqueioArea(area, 'ver')
  if (erro) return erro
  if ((await getPainelAutoescolaId()) !== autoescola_id) return 'Sessão inválida.'
  return null
}

const dataBR = (d: string) => d.split('-').reverse().join('/')

// ─── Linha do tempo de UMA aula (Histórico) ──────────────────────────────────

export interface EventoAula {
  id: string
  quando: string
  titulo: string
  detalhe: string | null
  autor: string | null
}

export async function getLinhaDoTempoAula(autoescola_id: string, agendamento_id: string): Promise<ActionResult<EventoAula[]>> {
  const erro = await bloqueio(autoescola_id, 'agendamentos')
  if (erro) return { success: false, error: erro }

  const supabase = createServiceClient()
  const [{ data: aula }, { data: hist }] = await Promise.all([
    supabase.from('agendamentos').select('id, created_at, notes, date, time_slot, instructor_name, instructorCategory, student_name').eq('id', agendamento_id).eq('autoescola_id', autoescola_id).maybeSingle(),
    supabase.from('agendamento_historico').select('*').eq('agendamento_id', agendamento_id).eq('autoescola_id', autoescola_id).order('created_at', { ascending: true }),
  ])
  if (!aula) return { success: false, error: 'Aula não encontrada.' }

  const eventos: EventoAula[] = []
  const temRegistroDeAgendamento = (hist ?? []).some((h) => h.tipo === 'agendado')

  // Aulas anteriores ao rastreio: usa a data de criação da própria aula
  if (!temRegistroDeAgendamento) {
    const primeiraRemarcacao = (hist ?? []).find((h) => h.tipo === 'reagendado')
    eventos.push({
      id: 'criada',
      quando: aula.created_at,
      titulo: 'Aula agendada',
      detalhe: primeiraRemarcacao?.de_date
        ? `${dataBR(primeiraRemarcacao.de_date)} às ${primeiraRemarcacao.de_time_slot} · ${primeiraRemarcacao.de_instrutor ?? '—'}`
        : `${dataBR(aula.date)} às ${aula.time_slot} · ${aula.instructor_name ?? '—'}`,
      autor: /app do aluno/i.test(aula.notes ?? '') ? aula.student_name : null,
    })
  }

  for (const h of hist ?? []) {
    eventos.push({
      id: h.id,
      quando: h.created_at,
      titulo: h.tipo === 'agendado' ? 'Aula agendada pelo aluno' : 'Aula remarcada pelo aluno',
      detalhe: h.tipo === 'agendado'
        ? `${dataBR(h.para_date)} às ${h.para_time_slot} · ${h.para_instrutor ?? '—'} (${h.para_categoria ?? '—'})`
        : `de ${dataBR(h.de_date)} às ${h.de_time_slot} (${h.de_instrutor ?? '—'}) para ${dataBR(h.para_date)} às ${h.para_time_slot} (${h.para_instrutor ?? '—'})`,
      autor: h.feito_por,
    })
  }
  return { success: true, data: eventos.sort((a, b) => a.quando.localeCompare(b.quando)) }
}

// ─── Atividade de UM aluno (aba "Atividade") ─────────────────────────────────

export interface EventoAluno {
  id: string
  quando: string
  tipo: string
  texto: string
  autor: string | null
}

export async function listarAtividadeAluno(autoescola_id: string, student_id: string): Promise<ActionResult<EventoAluno[]>> {
  const erro = await bloqueio(autoescola_id, 'cadastros')
  if (erro) return { success: false, error: erro }

  const supabase = createServiceClient()
  const { data: aluno } = await supabase.from('students').select('name, document_id').eq('id', student_id).eq('autoescola_id', autoescola_id).maybeSingle()
  if (!aluno) return { success: false, error: 'Aluno não encontrado.' }

  const [{ data: logs }, { data: aulas }, { data: hist }] = await Promise.all([
    supabase.from('activity_logs_painel').select('id, created_at, action_type, description, username, metadata')
      .eq('autoescola_id', autoescola_id).contains('metadata', { student_id }).order('created_at', { ascending: false }).limit(100),
    supabase.from('agendamentos').select('id, created_at, date, time_slot, instructor_name, instructorCategory, notes')
      .eq('autoescola_id', autoescola_id).or(`student_document.eq.${aluno.document_id},cpf_cnh.eq.${aluno.document_id}`)
      .order('created_at', { ascending: false }).limit(60),
    supabase.from('agendamento_historico').select('agendamento_id, tipo').eq('autoescola_id', autoescola_id).eq('student_id', student_id),
  ])

  const eventos: EventoAluno[] = (logs ?? []).map((l) => ({
    id: l.id, quando: l.created_at, tipo: l.action_type, texto: l.description, autor: l.username,
  }))

  // Aulas anteriores ao rastreio (sem log de agendamento): mostra quando foram marcadas
  const comRegistro = new Set((hist ?? []).filter((h) => h.tipo === 'agendado').map((h) => h.agendamento_id))
  for (const a of aulas ?? []) {
    if (comRegistro.has(a.id)) continue
    eventos.push({
      id: `aula-${a.id}`,
      quando: a.created_at,
      tipo: 'agendamento',
      texto: `Aula agendada para ${dataBR(a.date)} às ${a.time_slot}${a.instructor_name ? ` com ${a.instructor_name}` : ''}${a.instructorCategory ? ` (${a.instructorCategory})` : ''}`,
      autor: /app do aluno/i.test(a.notes ?? '') ? aluno.name : null,
    })
  }

  return { success: true, data: eventos.sort((a, b) => b.quando.localeCompare(a.quando)).slice(0, 120) }
}
