import 'server-only'

import { headers } from 'next/headers'
import type { createServiceClient } from '@/lib/supabase/server'

type Supabase = ReturnType<typeof createServiceClient>

export interface AlunoAtor {
  id: string
  name: string
  document_id: string
}

async function origemDaRequisicao() {
  const h = await headers()
  const ip = (h.get('x-forwarded-for')?.split(',')[0] ?? h.get('x-real-ip') ?? '').trim() || null
  const user_agent = h.get('user-agent')?.slice(0, 300) ?? null
  return { ip, user_agent }
}

/**
 * Registra na Auditoria uma ação feita pelo PRÓPRIO aluno no app (o usuário do
 * log é o nome dele). `metadata.student_id` é o que liga o log à aba
 * "Atividade" do aluno. Nunca derruba a ação principal se o log falhar.
 */
export async function registrarAtividadeAluno(
  supabase: Supabase,
  autoescola_id: string,
  aluno: AlunoAtor,
  action_type: string,
  descricao: string,
  metadata: Record<string, unknown> = {}
) {
  try {
    const origem = await origemDaRequisicao()
    await supabase.from('activity_logs_painel').insert({
      username: aluno.name,
      action_type,
      description: descricao,
      metadata: { student_id: aluno.id, student_document: aluno.document_id, ...origem, ...metadata },
      autoescola_id,
    })
  } catch (err) {
    console.error('[atividadeAluno] falha ao registrar log:', err)
  }
}

export interface LinhaHistoricoAgendamento {
  autoescola_id: string
  agendamento_id: string
  student_id: string
  student_name: string
  tipo: 'agendado' | 'reagendado'
  origem?: 'aluno' | 'painel'
  de?: { date: string; time_slot: string; instrutor: string | null; categoria: string | null }
  para: { date: string; time_slot: string; instrutor: string | null; categoria: string | null }
  feito_por: string
}

export async function registrarHistoricoAgendamento(supabase: Supabase, l: LinhaHistoricoAgendamento) {
  try {
    await supabase.from('agendamento_historico').insert({
      autoescola_id: l.autoescola_id,
      agendamento_id: l.agendamento_id,
      student_id: l.student_id,
      student_name: l.student_name,
      tipo: l.tipo,
      origem: l.origem ?? 'aluno',
      de_date: l.de?.date ?? null,
      de_time_slot: l.de?.time_slot ?? null,
      de_instrutor: l.de?.instrutor ?? null,
      de_categoria: l.de?.categoria ?? null,
      para_date: l.para.date,
      para_time_slot: l.para.time_slot,
      para_instrutor: l.para.instrutor,
      para_categoria: l.para.categoria,
      feito_por: l.feito_por,
    })
  } catch (err) {
    console.error('[atividadeAluno] falha ao registrar histórico da aula:', err)
  }
}

export function dataBR(yyyyMmDd: string) {
  return yyyyMmDd.split('-').reverse().join('/')
}
