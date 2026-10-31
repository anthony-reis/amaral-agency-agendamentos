'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'
import { urlsEvidencias } from '@/lib/evidenciasSolicitacao'
import { listarArquivosComUrl, registrarArquivoSolicitacao } from '@/lib/arquivosSolicitacao.server'
import { bloqueioArea } from '@/lib/permissoes.server'
import { getCurrentUsername, getCurrentUserId, assertPodeEditar, getPainelAutoescolaId } from './authPainel'
import { contarAulasConcluidasPorCategoria } from './exameElegibilidade'
import type {
  ActionResult,
  DadosAtendimento,
  SituacaoCreditos,
  Solicitacao,
  SolicitacaoComAluno,
  SolicitacaoDetalhe,
  SolicitacaoEvento,
  SolicitacaoStatus,
  SolicitacoesFiltro,
} from '../types'
import { STATUS_EM_ANDAMENTO } from '../types'

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
  if (filtros.statusIn?.length) query = query.in('status', filtros.statusIn)
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
): Promise<{
  total: number
  exame: number
  legislacao: number
  psicotecnico: number
  comprovantes: number
  ids: string[]
}> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('solicitacoes')
    .select('id, tipo, status')
    .eq('autoescola_id', autoescola_id)
    .is('visualizado_em', null)

  const rows = data ?? []
  // Comprovante enviado volta a ficar "não visualizado" para avisar a autoescola;
  // conta à parte para o aviso não dizer "novo exame solicitado".
  const novas = rows.filter((r) => r.status !== 'comprovante_enviado')
  return {
    total: rows.length,
    exame: novas.filter((r) => r.tipo === 'exame').length,
    legislacao: novas.filter((r) => r.tipo === 'legislacao').length,
    psicotecnico: novas.filter((r) => r.tipo === 'psicotecnico').length,
    comprovantes: rows.length - novas.length,
    // Comprovante usa id próprio: o aviso reaparece mesmo se o modal da solicitação já foi dispensado.
    ids: rows.map((r) => (r.status === 'comprovante_enviado' ? `${r.id}:comprovante` : r.id)),
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
  // Devolve selfie/assinatura do aluno — só para o painel da própria autoescola.
  if ((await getPainelAutoescolaId()) !== autoescola_id) return null

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

  const [aulasConcluidas, credito, aulasConcluidasCategoria, evidencias, arquivos] = await Promise.all([
    contarAulasConcluidas(autoescola_id, student?.document_id ?? ''),
    getSituacaoCreditos(row.student_id),
    row.tipo === 'exame' && row.categoria
      ? contarAulasConcluidasPorCategoria(autoescola_id, student?.document_id ?? '', row.categoria)
      : Promise.resolve(null),
    urlsEvidencias(supabase, row.foto_path ?? null, row.assinatura_path ?? null),
    listarArquivosComUrl(supabase, id, autoescola_id),
  ])

  return {
    ...row,
    student_name: student?.name ?? 'Aluno não encontrado',
    student_document: student?.document_id ?? '',
    student_phone: student?.phone ?? null,
    eventos: (eventosRaw ?? []) as SolicitacaoEvento[],
    aulasConcluidas,
    aulasConcluidasCategoria,
    situacaoCreditos: credito.situacao,
    totalCreditos: credito.total,
    fotoUrl: evidencias.fotoUrl,
    assinaturaUrl: evidencias.assinaturaUrl,
    arquivos,
  }
}

export async function marcarComoVisualizada(id: string, autoescola_id: string): Promise<void> {
  if (await bloqueioArea('solicitacoes', 'ver')) return
  if ((await getPainelAutoescolaId()) !== autoescola_id) return

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
  const guard = await assertPodeEditar('solicitacoes')
  if (!guard.ok) return { success: false, error: guard.error }

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
  const guard = await assertPodeEditar('solicitacoes')
  if (!guard.ok) return { success: false, error: guard.error }

  if (!dadosAtendimento.data || !dadosAtendimento.horario) {
    return { success: false, error: 'Informe pelo menos data e horário do atendimento.' }
  }

  const supabase = createServiceClient()
  const [username, adminId] = await Promise.all([getCurrentUsername(), getCurrentUserId()])

  const { data: atual } = await supabase
    .from('solicitacoes')
    .select('status, tipo')
    .eq('id', id)
    .eq('autoescola_id', autoescola_id)
    .single()

  if (!atual || !STATUS_EM_ANDAMENTO.includes(atual.status as SolicitacaoStatus)) {
    return { success: false, error: 'Essa solicitação não pode mais ser agendada.' }
  }

  if (atual.tipo === 'exame') {
    return {
      success: false,
      error: 'Solicitações de exame agora são agendadas pelo mutirão de exames (menu "Datas de Exame").',
    }
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
  const guard = await assertPodeEditar('solicitacoes')
  if (!guard.ok) return { success: false, error: guard.error }

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

  if (!atual || !STATUS_EM_ANDAMENTO.includes(atual.status as SolicitacaoStatus)) {
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

/**
 * Autoescola anexa o boleto e devolve ao aluno: a solicitação passa a
 * "aguardando_pagamento". Pode anexar mais de um boleto enquanto aguarda.
 * Recebe FormData: id, autoescola_id, escola, mensagem (opcional) e "arquivo".
 */
export async function enviarBoleto(formData: FormData): Promise<ActionResult> {
  const guard = await assertPodeEditar('solicitacoes')
  if (!guard.ok) return { success: false, error: guard.error }

  const campo = (k: string) => {
    const v = formData.get(k)
    return typeof v === 'string' && v.trim() !== '' ? v.trim() : null
  }
  const id = campo('id')
  const autoescola_id = campo('autoescola_id')
  const escola = campo('escola') ?? ''
  const mensagem = campo('mensagem')
  if (!id || !autoescola_id) return { success: false, error: 'Solicitação inválida.' }
  if ((await getPainelAutoescolaId()) !== autoescola_id) return { success: false, error: 'Sem permissão.' }

  const supabase = createServiceClient()
  const [username, adminId] = await Promise.all([getCurrentUsername(), getCurrentUserId()])

  const { data: atual } = await supabase
    .from('solicitacoes')
    .select('status, student_id')
    .eq('id', id)
    .eq('autoescola_id', autoescola_id)
    .single()

  if (!atual || !['pendente', 'em_analise', 'aguardando_pagamento'].includes(atual.status)) {
    return { success: false, error: 'Não é possível enviar boleto nessa etapa da solicitação.' }
  }

  const up = await registrarArquivoSolicitacao(supabase, {
    solicitacao_id: id,
    autoescola_id,
    student_id: atual.student_id,
    tipo: 'boleto',
    arquivo: formData.get('arquivo'),
    autor_tipo: 'painel',
    autor_nome: username,
  })
  if (!up.ok) return { success: false, error: up.error }

  const { error } = await supabase
    .from('solicitacoes')
    .update({
      status: 'aguardando_pagamento',
      admin_responsavel_id: adminId,
      ...(mensagem ? { mensagem_admin: mensagem } : {}),
    })
    .eq('id', id)
    .eq('autoescola_id', autoescola_id)
  if (error) return { success: false, error: 'Erro ao enviar o boleto ao aluno.' }

  await supabase.from('solicitacoes_eventos').insert({
    solicitacao_id: id,
    tipo_evento: 'boleto_enviado',
    autor_tipo: 'painel',
    autor_nome: username,
    dados: { arquivo: up.nome, mensagem },
  })
  await supabase.from('activity_logs_painel').insert({
    username,
    action_type: 'solicitacao',
    description: `Boleto enviado ao aluno na solicitação (ID: ${id})`,
    autoescola_id,
  })

  revalidatePath(`/${escola}/painel/solicitacoes`)
  revalidatePath(`/${escola}/aluno/solicitacoes`)
  return { success: true, data: undefined }
}
