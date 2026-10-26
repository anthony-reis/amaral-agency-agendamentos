'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { bloqueioArea } from '@/lib/permissoes.server'
import { bloqueioFeature } from '@/lib/features.server'
import { getTermosVigentes } from '@/lib/termos.server'
import { temConteudo } from '@/lib/termos'
import { enviarArquivoAnexo, removerArquivoAnexo, urlAssinadaAnexo } from '@/lib/anexosAluno.server'
import { getCurrentUsername, getPainelAutoescolaId } from './authPainel'
import type { ActionResult } from '../types'

export interface AnexoAluno {
  id: string
  tipo: 'comprovante' | 'documento'
  nome: string
  mime: string
  tamanho: number
  pedido_id: string | null
  enviado_por: string | null
  created_at: string
  url: string | null
}

export interface PagamentoMpAluno {
  id: string
  produto: string
  valor_centavos: number
  status: string
  payment_method: string | null
  mp_payment_id: string | null
  paid_at: string | null
  created_at: string
}

export interface TermosAlunoStatus {
  status: 'aceito' | 'pendente' | 'sem_termos'
  versao: number | null
  versaoVigente: number | null
  aceito_em: string | null
  ip: string | null
  user_agent: string | null
}

async function bloqueio(autoescola_id: string, nivel: 'ver' | 'editar'): Promise<string | null> {
  const erro = await bloqueioArea('cadastros', nivel)
  if (erro) return erro
  if ((await getPainelAutoescolaId()) !== autoescola_id) return 'Sessão inválida.'
  return null
}

export async function listarAnexosAluno(autoescola_id: string, student_id: string): Promise<ActionResult<AnexoAluno[]>> {
  const erro = await bloqueio(autoescola_id, 'ver')
  if (erro) return { success: false, error: erro }

  const supabase = createServiceClient()
  const { data } = await supabase
    .from('aluno_anexos')
    .select('id, tipo, nome, mime, tamanho, pedido_id, enviado_por, created_at, path')
    .eq('autoescola_id', autoescola_id)
    .eq('student_id', student_id)
    .order('created_at', { ascending: false })

  const anexos = await Promise.all(
    (data ?? []).map(async ({ path, ...resto }) => ({ ...resto, url: await urlAssinadaAnexo(supabase, path) }))
  )
  return { success: true, data: anexos as AnexoAluno[] }
}

export async function enviarAnexoAluno(
  autoescola_id: string,
  student_id: string,
  formData: FormData
): Promise<ActionResult<AnexoAluno>> {
  const erro = await bloqueio(autoescola_id, 'editar')
  if (erro) return { success: false, error: erro }

  const supabase = createServiceClient()
  const { data: aluno } = await supabase
    .from('students').select('name').eq('id', student_id).eq('autoescola_id', autoescola_id).maybeSingle()
  if (!aluno) return { success: false, error: 'Aluno não encontrado.' }

  const up = await enviarArquivoAnexo(supabase, autoescola_id, student_id, formData.get('arquivo'))
  if (!up.ok) return { success: false, error: up.error }

  const usuario = await getCurrentUsername()
  const { data: row, error } = await supabase
    .from('aluno_anexos')
    .insert({ autoescola_id, student_id, tipo: 'documento', ...up.anexo, enviado_por: usuario })
    .select('id, tipo, nome, mime, tamanho, pedido_id, enviado_por, created_at')
    .single()
  if (error || !row) {
    await removerArquivoAnexo(supabase, up.anexo.path)
    return { success: false, error: 'Erro ao salvar o anexo.' }
  }

  await supabase.from('activity_logs_painel').insert({
    username: usuario,
    action_type: 'aluno',
    description: `Anexo adicionado ao aluno ${aluno.name}: ${up.anexo.nome}`,
    autoescola_id,
  })

  return { success: true, data: { ...(row as Omit<AnexoAluno, 'url'>), url: await urlAssinadaAnexo(supabase, up.anexo.path) } }
}

/** Comprovantes de venda não podem ser excluídos (evidência financeira). */
export async function excluirAnexoAluno(autoescola_id: string, anexo_id: string): Promise<ActionResult<null>> {
  const erro = await bloqueio(autoescola_id, 'editar')
  if (erro) return { success: false, error: erro }

  const supabase = createServiceClient()
  const { data: anexo } = await supabase
    .from('aluno_anexos')
    .select('id, tipo, nome, path, student_id')
    .eq('id', anexo_id)
    .eq('autoescola_id', autoescola_id)
    .maybeSingle()
  if (!anexo) return { success: false, error: 'Anexo não encontrado.' }
  if (anexo.tipo === 'comprovante') return { success: false, error: 'Comprovantes de venda não podem ser excluídos.' }

  await removerArquivoAnexo(supabase, anexo.path)
  await supabase.from('aluno_anexos').delete().eq('id', anexo_id).eq('autoescola_id', autoescola_id)

  const { data: aluno } = await supabase.from('students').select('name').eq('id', anexo.student_id).maybeSingle()
  await supabase.from('activity_logs_painel').insert({
    username: await getCurrentUsername(),
    action_type: 'aluno',
    description: `Anexo removido do aluno ${aluno?.name ?? ''}: ${anexo.nome}`,
    autoescola_id,
  })
  return { success: true, data: null }
}

/** Situação do aceite dos Termos/Privacidade (aceite é pedido só no primeiro acesso). */
export async function getTermosAluno(autoescola_id: string, student_id: string): Promise<ActionResult<TermosAlunoStatus>> {
  const erro = await bloqueio(autoescola_id, 'ver')
  if (erro) return { success: false, error: erro }

  const supabase = createServiceClient()
  const [vigente, { data: aceite }] = await Promise.all([
    getTermosVigentes(autoescola_id),
    supabase
      .from('termos_aceites')
      .select('aceito_em, ip, user_agent, versao:termos_versoes(versao)')
      .eq('autoescola_id', autoescola_id)
      .eq('student_id', student_id)
      .order('aceito_em', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const versaoVigente = vigente?.versao ?? null
  if (aceite) {
    const v = aceite.versao as unknown as { versao: number } | { versao: number }[] | null
    return {
      success: true,
      data: {
        status: 'aceito',
        versao: (Array.isArray(v) ? v[0]?.versao : v?.versao) ?? null,
        versaoVigente,
        aceito_em: aceite.aceito_em,
        ip: aceite.ip,
        user_agent: aceite.user_agent,
      },
    }
  }
  return {
    success: true,
    data: {
      status: temConteudo(vigente) ? 'pendente' : 'sem_termos',
      versao: null, versaoVigente, aceito_em: null, ip: null, user_agent: null,
    },
  }
}

/**
 * Pagamentos do aluno feitos pelo Mercado Pago (aprovados ou reembolsados).
 * Dados financeiros: `null` quando o perfil não vê Vendas ou o módulo está desligado.
 */
export async function listarPagamentosMpAluno(
  autoescola_id: string,
  student_id: string
): Promise<ActionResult<PagamentoMpAluno[] | null>> {
  const erro = await bloqueio(autoescola_id, 'ver')
  if (erro) return { success: false, error: erro }
  if ((await bloqueioArea('vendas', 'ver')) || (await bloqueioFeature(autoescola_id, 'vendas'))) {
    return { success: true, data: null }
  }

  const supabase = createServiceClient()
  const { data } = await supabase
    .from('pedidos_loja')
    .select('id, produto_snapshot, valor_centavos, status, payment_method, mp_payment_id, paid_at, created_at')
    .eq('autoescola_id', autoescola_id)
    .eq('student_id', student_id)
    .eq('origem', 'mercado_pago')
    .in('status', ['aprovado', 'reembolsado'])
    .order('created_at', { ascending: false })

  return {
    success: true,
    data: (data ?? []).map(({ produto_snapshot, ...resto }) => ({
      ...resto,
      produto: (produto_snapshot as { nome?: string } | null)?.nome ?? '—',
    })),
  }
}
