'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'
import { getCurrentUsername, getCurrentUserId } from './authPainel'
import { getDisponibilidadePorCodigo } from '@/lib/getDisponibilidadePorCodigo'
import { contarAulasConcluidasPorCategoria, getSituacaoCreditosCategoria } from './exameElegibilidade'
import { listarDatasExame } from './datasExame'
import { AULAS_MINIMAS_PARA_EXAME } from '@/lib/examConstants'
import type { CodigoCNH } from '@/features/admin/categorias-config'
import type { ActionResult } from '../types'
import type { SolicitacaoPendenteExame, InstrutorDisponivelExame, AtribuicaoExameMassa } from '../types-exame'

interface SolicitacaoRow {
  id: string
  student_id: string
  data_preferida: string | null
  observacao_aluno: string | null
}

export async function listarSolicitacoesPendentesParaData(
  autoescola_id: string,
  categoria_codigo: string
): Promise<SolicitacaoPendenteExame[]> {
  const supabase = createServiceClient()
  const { data: solicitacoes } = await supabase
    .from('solicitacoes')
    .select('id, student_id, data_preferida, observacao_aluno')
    .eq('autoescola_id', autoescola_id)
    .eq('tipo', 'exame')
    .eq('categoria', categoria_codigo)
    .in('status', ['pendente', 'em_analise'])
    .order('created_at', { ascending: true })

  const rows = (solicitacoes ?? []) as SolicitacaoRow[]
  if (rows.length === 0) return []

  const studentIds = Array.from(new Set(rows.map((r) => r.student_id)))
  const { data: students } = await supabase
    .from('students')
    .select('id, name, document_id')
    .in('id', studentIds)

  const studentMap = new Map((students ?? []).map((s) => [s.id, s]))

  return Promise.all(
    rows.map(async (r) => {
      const student = studentMap.get(r.student_id)
      const [aulasConcluidasCategoria, creditosCategoria] = await Promise.all([
        contarAulasConcluidasPorCategoria(autoescola_id, student?.document_id ?? '', categoria_codigo),
        getSituacaoCreditosCategoria(r.student_id, categoria_codigo),
      ])
      return {
        solicitacaoId: r.id,
        studentId: r.student_id,
        studentName: student?.name ?? 'Aluno não encontrado',
        studentDocument: student?.document_id ?? '',
        dataPreferida: r.data_preferida,
        aulasConcluidasCategoria,
        creditosCategoria,
        observacaoAluno: r.observacao_aluno,
      }
    })
  )
}

export async function buscarDisponibilidadeExameMassa(
  autoescola_id: string,
  categoria_codigo: string,
  examDate: string
): Promise<InstrutorDisponivelExame[]> {
  return getDisponibilidadePorCodigo(autoescola_id, examDate, categoria_codigo as CodigoCNH)
}

interface ConfirmarInput {
  autoescola_id: string
  categoria_codigo: string
  examDate: string
  atribuicoes: AtribuicaoExameMassa[]
  mensagemAdmin?: string | null
  escola: string
}

export async function confirmarAgendamentoExameMassa(
  data: ConfirmarInput
): Promise<ActionResult<{ criados: number }>> {
  const { autoescola_id, categoria_codigo, examDate, atribuicoes, mensagemAdmin, escola } = data

  if (atribuicoes.length === 0) {
    return { success: false, error: 'Selecione ao menos um aluno para agendar.' }
  }

  const supabase = createServiceClient()

  // Revalida conflito contra agendamentos reais (janela entre busca e confirmação).
  // Várias bancas PODEM compartilhar o mesmo instrutor+horário (turma indo junto
  // pro exame) — só bloqueia se o horário já estiver ocupado por uma AULA normal.
  const instructorNames = Array.from(new Set(atribuicoes.map((a) => a.instructorName)))
  const { data: existentes } = await supabase
    .from('agendamentos')
    .select('instructor_name, time_slot, tipo')
    .eq('autoescola_id', autoescola_id)
    .eq('date', examDate)
    .neq('status', 'cancelled')
    .neq('tipo', 'banca')
    .in('instructor_name', instructorNames)

  const ocupados = new Set((existentes ?? []).map((e) => `${e.instructor_name}__${e.time_slot}`))
  const conflitos = atribuicoes.filter((a) => ocupados.has(`${a.instructorName}__${a.timeSlot}`))
  if (conflitos.length > 0) {
    return {
      success: false,
      error: `Horário já ocupado com aula normal para: ${conflitos.map((c) => `${c.studentName} (${c.instructorName} ${c.timeSlot})`).join(', ')}. Ajuste e tente novamente.`,
    }
  }

  // Revalida que as solicitações ainda estão pendentes/em_analise dessa categoria
  const solicitacaoIds = atribuicoes.map((a) => a.solicitacaoId)
  const { data: solicitacoesAtuais } = await supabase
    .from('solicitacoes')
    .select('id, status, tipo, categoria')
    .eq('autoescola_id', autoescola_id)
    .in('id', solicitacaoIds)

  const invalidas = (solicitacoesAtuais ?? []).filter(
    (s) => s.tipo !== 'exame' || s.categoria !== categoria_codigo || !['pendente', 'em_analise'].includes(s.status)
  )
  if (invalidas.length > 0 || (solicitacoesAtuais ?? []).length !== solicitacaoIds.length) {
    return { success: false, error: 'Uma ou mais solicitações não estão mais disponíveis para agendamento. Atualize a lista e tente novamente.' }
  }

  // Instrutores envolvidos (pra pegar a categoria "de verdade" registrada neles)
  const { data: instrutoresRows } = await supabase
    .from('instructors')
    .select('name, category')
    .eq('autoescola_id', autoescola_id)
    .in('name', instructorNames)
  const categoriaPorInstrutor = new Map((instrutoresRows ?? []).map((i) => [i.name, i.category]))

  const rows = atribuicoes.map((a) => ({
    autoescola_id,
    date: examDate,
    time_slot: a.timeSlot,
    instructor_name: a.instructorName,
    instructorCategory: categoriaPorInstrutor.get(a.instructorName) ?? categoria_codigo,
    student_id: a.studentId,
    student_name: a.studentName,
    student_document: a.studentDocument,
    cpf_cnh: a.studentDocument,
    status: 'scheduled',
    tipo: 'banca',
    notes: 'Agendado via mutirão de exames',
  }))

  const { data: criados, error: insertError } = await supabase
    .from('agendamentos')
    .insert(rows)
    .select('id, instructor_name, time_slot, student_name')

  if (insertError || !criados) {
    return { success: false, error: 'Erro ao criar os agendamentos das bancas.' }
  }

  const username = await getCurrentUsername()
  const mensagem = mensagemAdmin?.trim() || null
  const agora = new Date().toISOString()

  // Atualiza cada solicitação com o vínculo do agendamento real criado
  await Promise.all(
    atribuicoes.map(async (a) => {
      const criado = criados.find(
        (c) => c.instructor_name === a.instructorName && c.time_slot === a.timeSlot && c.student_name === a.studentName
      )
      if (!criado) return

      await supabase
        .from('solicitacoes')
        .update({
          status: 'agendado',
          dados_atendimento: {
            data: examDate,
            horario: a.timeSlot,
            local: null,
            observacoes: 'Agendado via mutirão de exames',
          },
          agendamento_id: criado.id,
          mensagem_admin: mensagem,
          finalizado_em: agora,
        })
        .eq('id', a.solicitacaoId)

      await supabase.from('solicitacoes_eventos').insert({
        solicitacao_id: a.solicitacaoId,
        tipo_evento: 'agendada',
        autor_tipo: 'painel',
        autor_nome: username,
        dados: {
          modo: 'mutirao_exame',
          agendamento_id: criado.id,
          instructor_name: a.instructorName,
          time_slot: a.timeSlot,
          categoria: categoria_codigo,
        },
      })
    })
  )

  await supabase.from('activity_logs_painel').insert({
    username,
    action_type: 'solicitacao',
    description: `Mutirão de exame (categoria ${categoria_codigo}, ${examDate}): ${atribuicoes.length} aluno(s) agendado(s).`,
    autoescola_id,
  })

  revalidatePath(`/${escola}/painel/solicitacoes`)
  revalidatePath(`/${escola}/painel/datas-exame`)
  revalidatePath(`/${escola}/painel/calendario`, 'layout')
  revalidatePath(`/${escola}/aluno/solicitacoes`)

  return { success: true, data: { criados: atribuicoes.length } }
}

interface AgendarExameDiretoInput {
  autoescola_id: string
  student_id: string
  categoria_codigo: string
  examDate: string
  instructorName: string
  timeSlot: string
  escola: string
}

/**
 * Agendamento de exame iniciado pelo atendente diretamente na lista de Alunos
 * (o aluno pediu presencialmente/por telefone, sem passar pelo app). Faz, em
 * uma única ação, o que solicitação + mutirão fazem em dois passos: cria a
 * solicitação já como registro de auditoria e imediatamente a agenda.
 */
export async function agendarExameDireto(
  input: AgendarExameDiretoInput
): Promise<ActionResult<{ agendamentoId: string }>> {
  const { autoescola_id, student_id, categoria_codigo, examDate, instructorName, timeSlot, escola } = input

  const supabase = createServiceClient()

  const { data: student } = await supabase
    .from('students')
    .select('id, name, document_id')
    .eq('id', student_id)
    .eq('autoescola_id', autoescola_id)
    .maybeSingle()

  if (!student) return { success: false, error: 'Aluno não encontrado.' }

  const aulasConcluidas = await contarAulasConcluidasPorCategoria(autoescola_id, student.document_id, categoria_codigo)
  if (aulasConcluidas < AULAS_MINIMAS_PARA_EXAME) {
    return {
      success: false,
      error: `Aluno precisa de pelo menos ${AULAS_MINIMAS_PARA_EXAME} aulas concluídas nessa categoria para agendar exame (tem ${aulasConcluidas}).`,
    }
  }

  const datasValidas = await listarDatasExame(autoescola_id, categoria_codigo, { apenasFuturas: true })
  if (!datasValidas.some((d) => d.date === examDate)) {
    return { success: false, error: 'Data selecionada não está mais disponível. Atualize e tente novamente.' }
  }

  // Várias bancas podem compartilhar o mesmo instrutor+horário (turma indo
  // junto pro exame) — só bloqueia se o horário já estiver ocupado por uma
  // AULA normal (outra banca no mesmo horário não é conflito).
  const { data: ocupado } = await supabase
    .from('agendamentos')
    .select('id')
    .eq('autoescola_id', autoescola_id)
    .eq('date', examDate)
    .eq('instructor_name', instructorName)
    .eq('time_slot', timeSlot)
    .neq('status', 'cancelled')
    .neq('tipo', 'banca')
    .maybeSingle()

  if (ocupado) return { success: false, error: 'Esse horário já está ocupado com uma aula normal. Escolha outro.' }

  const [username, adminId] = await Promise.all([getCurrentUsername(), getCurrentUserId()])

  const { data: solicitacao, error: solicitacaoError } = await supabase
    .from('solicitacoes')
    .insert({
      autoescola_id,
      student_id,
      tipo: 'exame',
      categoria: categoria_codigo,
      data_preferida: examDate,
      observacao_aluno: 'Agendado diretamente pelo painel (solicitação presencial/telefone).',
    })
    .select()
    .single()

  if (solicitacaoError) {
    if (solicitacaoError.code === '23505') {
      return { success: false, error: `Esse aluno já tem uma solicitação de exame em andamento para a categoria ${categoria_codigo}.` }
    }
    return { success: false, error: 'Erro ao registrar a solicitação de exame.' }
  }

  const { data: instrutorRow } = await supabase
    .from('instructors')
    .select('category')
    .eq('autoescola_id', autoescola_id)
    .eq('name', instructorName)
    .maybeSingle()

  const { data: criado, error: insertError } = await supabase
    .from('agendamentos')
    .insert({
      autoescola_id,
      date: examDate,
      time_slot: timeSlot,
      instructor_name: instructorName,
      instructorCategory: instrutorRow?.category ?? categoria_codigo,
      student_id,
      student_name: student.name,
      student_document: student.document_id,
      cpf_cnh: student.document_id,
      status: 'scheduled',
      tipo: 'banca',
      notes: 'Agendado diretamente pelo painel',
    })
    .select('id')
    .single()

  if (insertError || !criado) {
    // Reverte a solicitação criada pra não deixar um registro órfão
    await supabase.from('solicitacoes').delete().eq('id', solicitacao.id)
    return { success: false, error: 'Erro ao criar o agendamento da banca.' }
  }

  await supabase
    .from('solicitacoes')
    .update({
      status: 'agendado',
      dados_atendimento: { data: examDate, horario: timeSlot, local: null, observacoes: 'Agendado diretamente pelo painel' },
      agendamento_id: criado.id,
      admin_responsavel_id: adminId,
      finalizado_em: new Date().toISOString(),
    })
    .eq('id', solicitacao.id)

  await supabase.from('solicitacoes_eventos').insert([
    {
      solicitacao_id: solicitacao.id,
      tipo_evento: 'criada',
      autor_tipo: 'painel',
      autor_nome: username,
      dados: { tipo: 'exame', categoria: categoria_codigo, data_preferida: examDate, modo: 'direto_painel' },
    },
    {
      solicitacao_id: solicitacao.id,
      tipo_evento: 'agendada',
      autor_tipo: 'painel',
      autor_nome: username,
      dados: { modo: 'direto_painel', agendamento_id: criado.id, instructor_name: instructorName, time_slot: timeSlot },
    },
  ])

  await supabase.from('activity_logs_painel').insert({
    username,
    action_type: 'solicitacao',
    description: `Exame agendado diretamente pelo painel para ${student.name} — categoria ${categoria_codigo}, ${examDate} ${timeSlot}.`,
    autoescola_id,
  })

  revalidatePath(`/${escola}/painel/alunos`)
  revalidatePath(`/${escola}/painel/solicitacoes`)
  revalidatePath(`/${escola}/painel/datas-exame`)
  revalidatePath(`/${escola}/painel/calendario`, 'layout')
  revalidatePath(`/${escola}/aluno/solicitacoes`)

  return { success: true, data: { agendamentoId: criado.id } }
}
