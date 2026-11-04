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
  tipo: 'agendado' | 'reagendado' | 'cancelado'
  origem?: 'aluno' | 'painel'
  de?: { date: string; time_slot: string; instrutor: string | null; categoria: string | null }
  para?: { date: string; time_slot: string; instrutor: string | null; categoria: string | null }
  motivo?: string | null
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
      para_date: l.para?.date ?? null,
      para_time_slot: l.para?.time_slot ?? null,
      para_instrutor: l.para?.instrutor ?? null,
      para_categoria: l.para?.categoria ?? null,
      motivo: l.motivo ?? null,
      feito_por: l.feito_por,
    })
  } catch (err) {
    console.error('[atividadeAluno] falha ao registrar histórico da aula:', err)
  }
}

export function dataBR(yyyyMmDd: string) {
  return yyyyMmDd.split('-').reverse().join('/')
}

export interface AulaCancelada {
  id: string
  date: string
  time_slot: string
  instructor_name: string | null
  instructorCategory: string | null
  student_name: string | null
  cpf_cnh: string | null
  student_document: string | null
}

/**
 * Registro único de um cancelamento feito pela escola/instrutor: histórico da
 * aula, atividade do aluno (com `student_id`, que é o que a aba "Atividade"
 * filtra) e aviso para o aluno. Nunca derruba o cancelamento se algo falhar.
 */
export async function registrarCancelamentoAula(
  supabase: Supabase,
  autoescola_id: string,
  ag: AulaCancelada,
  opts: { feito_por: string; motivo?: string | null; creditoDevolvido?: boolean; bloqueou?: boolean }
) {
  try {
    const doc = ag.cpf_cnh ?? ag.student_document
    const { data: aluno } = doc
      ? await supabase.from('students').select('id, name').eq('autoescola_id', autoescola_id).eq('document_id', doc).maybeSingle()
      : { data: null }

    const quando = `${dataBR(ag.date)} às ${ag.time_slot}`
    const instrutor = ag.instructor_name ? ` com ${ag.instructor_name}` : ''
    const motivo = opts.motivo?.trim() || null

    await supabase.from('activity_logs_painel').insert({
      username: opts.feito_por,
      action_type: 'cancelamento',
      description: `Aula de ${aluno?.name ?? ag.student_name ?? 'aluno'} em ${quando}${instrutor} cancelada${opts.bloqueou ? ' e horário bloqueado' : ''}. Motivo: ${motivo ?? 'não informado'}.${opts.creditoDevolvido ? ' Crédito devolvido.' : ''}`,
      metadata: {
        ...(aluno ? { student_id: aluno.id } : {}),
        agendamento_id: ag.id,
        reason: motivo,
        blocked: !!opts.bloqueou,
      },
      autoescola_id,
    })

    if (!aluno) return

    await registrarHistoricoAgendamento(supabase, {
      autoescola_id,
      agendamento_id: ag.id,
      student_id: aluno.id,
      student_name: aluno.name ?? ag.student_name ?? '',
      tipo: 'cancelado',
      origem: 'painel',
      de: { date: ag.date, time_slot: ag.time_slot, instrutor: ag.instructor_name, categoria: ag.instructorCategory },
      motivo,
      feito_por: opts.feito_por,
    })

    await criarAvisoAluno(supabase, {
      autoescola_id,
      student_id: aluno.id,
      agendamento_id: ag.id,
      tipo: 'aula_cancelada',
      titulo: 'Aula desmarcada',
      mensagem: `Sua aula de ${quando}${instrutor} foi desmarcada.${motivo ? ` Motivo: ${motivo}.` : ''}${opts.creditoDevolvido ? ' O crédito foi devolvido para você agendar outra.' : ''}`,
    })
  } catch (err) {
    console.error('[atividadeAluno] falha ao registrar cancelamento:', err)
  }
}

export async function criarAvisoAluno(
  supabase: Supabase,
  a: {
    autoescola_id: string
    student_id: string
    agendamento_id?: string
    tipo: 'aula_cancelada' | 'aula_remarcada'
    titulo: string
    mensagem: string
  }
) {
  try {
    // Função do banco: junta rajadas (ex.: 20 aulas desmarcadas) em um único aviso/push
    const { error } = await supabase.rpc('registrar_aviso_aluno', {
      p_autoescola: a.autoescola_id,
      p_student: a.student_id,
      p_tipo: a.tipo,
      p_titulo: a.titulo,
      p_msg: a.mensagem,
      p_agend: a.agendamento_id ?? null,
      p_agrupar: true,
    })
    // Migration ainda não aplicada: grava direto, como antes
    if (error) await supabase.from('avisos_aluno').insert(a)
  } catch (err) {
    console.error('[atividadeAluno] falha ao criar aviso do aluno:', err)
  }
}
