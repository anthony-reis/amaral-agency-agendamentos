'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { getCurrentUsername } from './authPainel'
import type { ActionResult } from '../types'
import type { NovoProdutoInput, Produto } from '@/lib/loja-types'
import { somaCreditos } from '@/lib/loja-types'

function validarProduto(input: NovoProdutoInput): string | null {
  if (!input.nome.trim()) return 'Nome é obrigatório.'
  if (!Number.isInteger(input.preco_centavos) || input.preco_centavos <= 0) {
    return 'Preço deve ser maior que zero.'
  }
  const soma = somaCreditos(input)
  if (input.tipo === 'avulsa' && soma !== 1) return 'Aula avulsa deve conceder exatamente 1 aula.'
  if (input.tipo === 'servico' && soma !== 0) return 'Serviço não concede aulas (zere as quantidades).'
  if (input.tipo === 'pacote' && soma < 1) return 'Pacote deve conceder ao menos 1 aula.'
  return null
}

export async function listarProdutos(autoescola_id: string): Promise<Produto[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('produtos')
    .select('*')
    .eq('autoescola_id', autoescola_id)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as Produto[]
}

export async function criarProduto(
  input: NovoProdutoInput,
  autoescola_id: string
): Promise<ActionResult<Produto>> {
  const erro = validarProduto(input)
  if (erro) return { success: false, error: erro }

  const supabase = createServiceClient()
  const { data: produto, error } = await supabase
    .from('produtos')
    .insert({
      autoescola_id,
      nome: input.nome.trim(),
      descricao: input.descricao?.trim() || null,
      tipo: input.tipo,
      automatico: input.automatico,
      preco_centavos: input.preco_centavos,
      qtd_cat_a: input.qtd_cat_a,
      qtd_cat_b: input.qtd_cat_b,
      qtd_cat_c: input.qtd_cat_c,
      qtd_cat_d: input.qtd_cat_d,
      qtd_cat_e: input.qtd_cat_e,
      ativo: input.ativo,
    })
    .select()
    .single()

  if (error || !produto) return { success: false, error: 'Erro ao criar produto.' }

  const userAct = await getCurrentUsername()
  await supabase.from('activity_logs_painel').insert({
    username: userAct,
    action_type: 'catalogo',
    description: `Produto criado: ${produto.nome} (${produto.tipo})`,
    autoescola_id,
  })

  return { success: true, data: produto as Produto }
}

export async function editarProduto(
  id: string,
  input: NovoProdutoInput,
  autoescola_id: string
): Promise<ActionResult<Produto>> {
  const erro = validarProduto(input)
  if (erro) return { success: false, error: erro }

  const supabase = createServiceClient()
  const { data: produto, error } = await supabase
    .from('produtos')
    .update({
      nome: input.nome.trim(),
      descricao: input.descricao?.trim() || null,
      tipo: input.tipo,
      automatico: input.automatico,
      preco_centavos: input.preco_centavos,
      qtd_cat_a: input.qtd_cat_a,
      qtd_cat_b: input.qtd_cat_b,
      qtd_cat_c: input.qtd_cat_c,
      qtd_cat_d: input.qtd_cat_d,
      qtd_cat_e: input.qtd_cat_e,
      ativo: input.ativo,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('autoescola_id', autoescola_id)
    .select()
    .single()

  if (error || !produto) return { success: false, error: 'Erro ao editar produto.' }

  const userAct = await getCurrentUsername()
  await supabase.from('activity_logs_painel').insert({
    username: userAct,
    action_type: 'catalogo',
    description: `Produto editado: ${produto.nome} (ID: ${id})`,
    autoescola_id,
  })

  return { success: true, data: produto as Produto }
}

export async function alternarAtivoProduto(
  id: string,
  ativo: boolean,
  autoescola_id: string
): Promise<ActionResult<void>> {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from('produtos')
    .update({ ativo, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('autoescola_id', autoescola_id)

  if (error) return { success: false, error: 'Erro ao atualizar produto.' }

  const userAct = await getCurrentUsername()
  await supabase.from('activity_logs_painel').insert({
    username: userAct,
    action_type: 'catalogo',
    description: `Produto ${ativo ? 'ativado' : 'desativado'} (ID: ${id})`,
    autoescola_id,
  })

  return { success: true, data: undefined }
}

export async function excluirProduto(
  id: string,
  autoescola_id: string
): Promise<ActionResult<{ desativado: boolean }>> {
  const supabase = createServiceClient()

  // Se existir pedido vinculado, não exclui — apenas desativa (preserva histórico)
  const { count } = await supabase
    .from('pedidos_loja')
    .select('id', { count: 'exact', head: true })
    .eq('produto_id', id)
    .eq('autoescola_id', autoescola_id)

  const userAct = await getCurrentUsername()

  if ((count ?? 0) > 0) {
    const { error } = await supabase
      .from('produtos')
      .update({ ativo: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('autoescola_id', autoescola_id)
    if (error) return { success: false, error: 'Erro ao desativar produto.' }

    await supabase.from('activity_logs_painel').insert({
      username: userAct,
      action_type: 'catalogo',
      description: `Produto desativado (tinha vendas vinculadas) (ID: ${id})`,
      autoescola_id,
    })
    return { success: true, data: { desativado: true } }
  }

  const { error } = await supabase
    .from('produtos')
    .delete()
    .eq('id', id)
    .eq('autoescola_id', autoescola_id)
  if (error) return { success: false, error: 'Erro ao excluir produto.' }

  await supabase.from('activity_logs_painel').insert({
    username: userAct,
    action_type: 'catalogo',
    description: `Produto excluído (ID: ${id})`,
    autoescola_id,
  })

  return { success: true, data: { desativado: false } }
}
