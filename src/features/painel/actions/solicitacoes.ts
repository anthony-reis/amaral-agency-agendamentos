'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/server'
import { getCurrentUsername } from './authPainel'
import type {
  ActionResult,
  DadosAtendimento,
  SituacaoCreditos,
  Solicitacao,
  SolicitacaoComAluno,
  SolicitacaoDetalhe,
  SolicitacaoEvento,
  SolicitacoesFiltro,
} from '../types'

interface StudentRow {
  id: string
  name: string
  document_id: string
  phone: string | null
}

function anexarAluno(rows: Solicitacao[], students: StudentRow[]): SolicitacaoComAluno[] {
  const map = new Map(students.map((s) => [s.id, s]))
  return rows.map((r) => {
    const s = map.get(r.student_id)
    return {
      ...r,
      student_name: s?.name ?? 'Aluno não encontrado',
      student_document: s?.document_id ?? '',
      student_phone: s?.phone ?? null,
    }
  })
}

export async function listarSolicitacoes(
  autoescola_id: string,
  filtros: SolicitacoesFiltro = {}
): Promise<SolicitacaoComAluno[]> {
  const supabase = createServiceClient()

  let query = supabase
    .from('solicitacoes')
    .select('*')
    .eq('autoescola_id', autoescola_id)
    .order('created_at', { ascending: false })

  if (filtros.tipo && filtros.tipo !== 'TODOS') query = query.eq('tipo', filtros.tipo)
  if (filtros.status && filtros.status !== 'TODOS') query = query.eq('status', filtros.status)
  if (filtros.dateStart) query = query.gte('created_at', filtros.dateStart)
  if (filtros.dateEnd) query = query.lte('created_at', `${filtros.dateEnd}T23:59:59`)
  if (filtros.naoVisualizadas) query = query.is('visualizado_em', null)

  const { data, error } = await query
  if (error) throw new Error(error.message)

  const rows = data ?? []
  if (rows.length === 0) return []

  const studentIds = Array.from(new Set(rows.map((r) => r.student_id)))
  const { data: students } = await supabase
    .from('students')
    .select('id, name, document_id, phone')
    .in('id', studentIds)

  let comAluno = anexarAluno(rows, students ?? [])

  if (filtros.aluno) {
    const termo = filtros.aluno.toLowerCase()
    comAluno = comAluno.filter(
      (s) => s.student_name.toLowerCase().includes(termo) || s.student_document.includes(termo)
    )
  }

  return comAluno
}

export async function contarNaoVisualizadas(
  autoescola_id: string
): Promise<{ total: number; exame: number; legislacao: number; ids: string[] }> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('solicitacoes')
    .select('id, tipo')
    .eq('autoescola_id', autoescola_id)
    .is('visualizado_em', null)

  const rows = data ?? []
  return {
    total: rows.length,
    exame: rows.filter((r) => r.tipo === 'exame').length,
    legislacao: rows.filter((r) => r.tipo === 'legislacao').length,
    ids: rows.map((r) => r.id),
  }
}

async function getCurrentUserId(): Promise<string | null> {
  const cookieStore = await cookies()
  const raw = cookieStore.get('painel_session')?.value
  if (!raw) return null
  try {
    const session = JSON.parse(raw) as { userId: string }
    return session.userId ?? null
  } catch {
    return null
  }
}

async function contarAulasConcluidas(autoescola_id: string, document_id: string): Promise<number> {
  const supabase = createServiceClient()
  if (!document_id) return 0
  const { count } = await supabase
    .from('agendamentos')
    .select('id', { count: 'exact', head: true })
    .eq('autoescola_id', autoescola_id)
    .eq('cpf_cnh', document_id)
    .eq('status', 'completed')
  return count ?? 0
}

async function getSituacaoCreditos(student_id: string): Promise<{ situacao: SituacaoCreditos; total: number | null }> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('student_credits')
    .select('aulas_cat_a, aulas_cat_b, aulas_cat_c, aulas_cat_d, aulas_cat_e')
    .eq('student_id', student_id)
    .maybeSingle()

  if (!data) return { situacao: 'indisponivel', total: null }
  const total = (data.aulas_cat_a ?? 0) + (data.aulas_cat_b ?? 0) + (data.aulas_cat_c ?? 0) + (data.aulas_cat_d ?? 0) + (data.aulas_cat_e ?? 0)
  return { situacao: total > 0 ? 'com_creditos' : 'sem_creditos', total }
}

export async function getSolicitacao(
  id: string,
  autoescola_id: string
): Promise<SolicitacaoDetalhe | null> {
  const supabase = createServiceClient()

  const { data: row } = await supabase
    .from('solicitacoes')
    .select('*')
    .eq('id', id)
    .eq('autoescola_id', autoescola_id)
    .single()

  if (!row) return null

  const { data: student } = await supabase
    .from('students')
    .select('id, name, document_id, phone')
    .eq('id', row.student_id)
    .single()

  const { data: eventosRaw } = await supabase
    .from('solicitacoes_eventos')
    .select('*')
    .eq('solicitacao_id', id)
    .order('created_at', { ascending: true })

  const [aulasConcluidas, credito] = await Promise.all([
    contarAulasConcluidas(autoescola_id, student?.document_id ?? ''),
    getSituacaoCreditos(row.student_id),
  ])

  return {
    ...row,
    student_name: student?.name ?? 'Aluno não encontrado',
    student_document: student?.document_id ?? '',
    student_phone: student?.phone ?? null,
    eventos: (eventosRaw ?? []) as SolicitacaoEvento[],
    aulasConcluidas,
    situacaoCreditos: credito.situacao,
    totalCreditos: credito.total,
  }
}

export async function marcarComoVisualizada(id: string, autoescola_id: string): Promise<void> {
  const supabase = createServiceClient()

  const { data: atual } = await supabase
    .from('solicitacoes')
    .select('visualizado_em')
    .eq('id', id)
    .eq('autoescola_id', autoescola_id)
    .single()

  if (!atual || atual.visualizado_em) return // já visualizada — idempotente

  const username = await getCurrentUsername()
  await supabase
    .from('solicitacoes')
    .update({ visualizado_em: new Date().toISOString() })
    .eq('id', id)
    .eq('autoescola_id', autoescola_id)

  await supabase.from('solicitacoes_eventos').insert({
    solicitacao_id: id,
    tipo_evento: 'visualizada',
    autor_tipo: 'painel',
    autor_nome: username,
    dados: null,
  })
}

export async function iniciarAnalise(
  id: string,
  autoescola_id: string,
  escola: string
): Promise<ActionResult> {
  const supabase = createServiceClient()
  const [username, adminId] = await Promise.all([getCurrentUsername(), getCurrentUserId()])

  const { data: atual } = await supabase
    .from('solicitacoes')
    .select('status')
    .eq('id', id)
    .eq('autoescola_id', autoescola_id)
    .single()

  if (!atual || atual.status !== 'pendente') {
    return { success: false, error: 'Só é possível iniciar análise de solicitações pendentes.' }
  }

  const { error } = await supabase
    .from('solicitacoes')
    .update({ status: 'em_analise', admin_responsavel_id: adminId })
    .eq('id', id)
    .eq('autoescola_id', autoescola_id)

  if (error) return { success: false, error: 'Erro ao iniciar análise.' }

  await supabase.from('solicitacoes_eventos').insert({
    solicitacao_id: id,
    tipo_evento: 'em_analise',
    autor_tipo: 'painel',
    autor_nome: username,
    dados: null,
  })
  await supabase.from('activity_logs_painel').insert({
    username,
    action_type: 'solicitacao',
    description: `Solicitação (ID: ${id}) colocada em análise`,
    autoescola_id,
  })

  revalidatePath(`/${escola}/painel/solicitacoes`)
  return { success: true, data: undefined }
}

export async function agendarSolicitacao(
  id: string,
  autoescola_id: string,
  dadosAtendimento: DadosAtendimento,
  mensagemAdmin: string | null,
  escola: string
): Promise<ActionResult> {
  if (!dadosAtendimento.data || !dadosAtendimento.horario) {
    return { success: false, error: 'Informe pelo menos data e horário do atendimento.' }
  }

  const supabase = createServiceClient()
  const [username, adminId] = await Promise.all([getCurrentUsername(), getCurrentUserId()])

  const { data: atual } = await supabase
    .from('solicitacoes')
    .select('status')
    .eq('id', id)
    .eq('autoescola_id', autoescola_id)
    .single()

  if (!atual || !['pendente', 'em_analise'].includes(atual.status)) {
    return { success: false, error: 'Essa solicitação não pode mais ser agendada.' }
  }

  const { error } = await supabase
    .from('solicitacoes')
    .update({
      status: 'agendado',
      dados_atendimento: dadosAtendimento,
      mensagem_admin: mensagemAdmin?.trim() || null,
      admin_responsavel_id: adminId,
      finalizado_em: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('autoescola_id', autoescola_id)

  if (error) return { success: false, error: 'Erro ao registrar agendamento.' }

  await supabase.from('solicitacoes_eventos').insert({
    solicitacao_id: id,
    tipo_evento: 'agendada',
    autor_tipo: 'painel',
    autor_nome: username,
    dados: { dadosAtendimento, mensagemAdmin: mensagemAdmin ?? null },
  })
  await supabase.from('activity_logs_painel').insert({
    username,
    action_type: 'solicitacao',
    description: `Solicitação (ID: ${id}) agendada/atendida`,
    autoescola_id,
  })

  revalidatePath(`/${escola}/painel/solicitacoes`)
  revalidatePath(`/${escola}/aluno/solicitacoes`)
  return { success: true, data: undefined }
}

export async function recusarSolicitacao(
  id: string,
  autoescola_id: string,
  motivoRecusa: string,
  mensagemAdmin: string | null,
  escola: string
): Promise<ActionResult> {
  if (!motivoRecusa.trim()) {
    return { success: false, error: 'Informe o motivo da recusa.' }
  }

  const supabase = createServiceClient()
  const [username, adminId] = await Promise.all([getCurrentUsername(), getCurrentUserId()])

  const { data: atual } = await supabase
    .from('solicitacoes')
    .select('status')
    .eq('id', id)
    .eq('autoescola_id', autoescola_id)
    .single()

  if (!atual || !['pendente', 'em_analise'].includes(atual.status)) {
    return { success: false, error: 'Essa solicitação não pode mais ser recusada.' }
  }

  const { error } = await supabase
    .from('solicitacoes')
    .update({
      status: 'recusado',
      motivo_recusa: motivoRecusa.trim(),
      mensagem_admin: mensagemAdmin?.trim() || null,
      admin_responsavel_id: adminId,
      finalizado_em: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('autoescola_id', autoescola_id)

  if (error) return { success: false, error: 'Erro ao recusar solicitação.' }

  await supabase.from('solicitacoes_eventos').insert({
    solicitacao_id: id,
    tipo_evento: 'recusada',
    autor_tipo: 'painel',
    autor_nome: username,
    dados: { motivoRecusa: motivoRecusa.trim(), mensagemAdmin: mensagemAdmin ?? null },
  })
  await supabase.from('activity_logs_painel').insert({
    username,
    action_type: 'solicitacao',
    description: `Solicitação (ID: ${id}) recusada`,
    autoescola_id,
  })

  revalidatePath(`/${escola}/painel/solicitacoes`)
  revalidatePath(`/${escola}/aluno/solicitacoes`)
  return { success: true, data: undefined }
}
