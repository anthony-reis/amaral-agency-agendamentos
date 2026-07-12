'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'
import type {
  ActionResult,
  NovaSolicitacaoInput,
  Solicitacao,
} from '@/features/painel/types'

const TIPO_LABEL: Record<string, string> = {
  exame: 'Solicitação de agendamento de exame',
  legislacao: 'Solicitação de curso de legislação',
}

export async function listarMinhasSolicitacoes(
  autoescola_id: string,
  student_id: string
): Promise<Solicitacao[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('solicitacoes')
    .select('*')
    .eq('autoescola_id', autoescola_id)
    .eq('student_id', student_id)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function criarSolicitacao(
  input: NovaSolicitacaoInput,
  escola: string
): Promise<ActionResult<Solicitacao>> {
  const { autoescola_id, student_id, student_name, tipo, categoria, observacao_aluno } = input

  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('solicitacoes')
    .insert({
      autoescola_id,
      student_id,
      tipo,
      categoria: categoria ?? null,
      observacao_aluno: observacao_aluno?.trim() || null,
    })
    .select()
    .single()

  if (error) {
    // uq_solicitacoes_ativa_por_tipo — já existe uma solicitação ativa desse tipo
    if (error.code === '23505') {
      return {
        success: false,
        error: `Você já tem uma ${TIPO_LABEL[tipo].toLowerCase()} em andamento. Aguarde a resposta da autoescola antes de criar outra.`,
      }
    }
    return { success: false, error: 'Erro ao criar solicitação.' }
  }

  await supabase.from('solicitacoes_eventos').insert({
    solicitacao_id: data.id,
    tipo_evento: 'criada',
    autor_tipo: 'aluno',
    autor_nome: student_name,
    dados: { tipo, categoria: categoria ?? null },
  })

  revalidatePath(`/${escola}/aluno/solicitacoes`)
  return { success: true, data }
}

export async function cancelarSolicitacao(
  id: string,
  student_id: string,
  student_name: string,
  escola: string
): Promise<ActionResult> {
  const supabase = createServiceClient()

  const { data: atual } = await supabase
    .from('solicitacoes')
    .select('status')
    .eq('id', id)
    .eq('student_id', student_id)
    .single()

  if (!atual) return { success: false, error: 'Solicitação não encontrada.' }
  if (!['pendente', 'em_analise'].includes(atual.status)) {
    return { success: false, error: 'Essa solicitação já foi respondida e não pode mais ser cancelada.' }
  }

  const { error } = await supabase
    .from('solicitacoes')
    .update({ status: 'cancelado', finalizado_em: new Date().toISOString() })
    .eq('id', id)
    .eq('student_id', student_id)

  if (error) return { success: false, error: 'Erro ao cancelar solicitação.' }

  await supabase.from('solicitacoes_eventos').insert({
    solicitacao_id: id,
    tipo_evento: 'cancelada',
    autor_tipo: 'aluno',
    autor_nome: student_name,
    dados: null,
  })

  revalidatePath(`/${escola}/aluno/solicitacoes`)
  return { success: true, data: undefined }
}

export async function contarSolicitacoesAtualizadas(
  autoescola_id: string,
  student_id: string,
  sinceIso: string
): Promise<number> {
  const supabase = createServiceClient()
  const { count } = await supabase
    .from('solicitacoes')
    .select('id', { count: 'exact', head: true })
    .eq('autoescola_id', autoescola_id)
    .eq('student_id', student_id)
    .gt('updated_at', sinceIso)

  return count ?? 0
}
