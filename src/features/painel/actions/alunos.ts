'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'
import { getCurrentUsername, getCurrentUserId } from './authPainel'
import { creditarPedido } from '@/lib/creditos'
import type { Produto, PedidoLoja, ProdutoSnapshot } from '@/lib/loja-types'
import type { AlunoComCreditos, AlunoCreditos, NovoAlunoInput, ActionResult } from '../types'

export interface VendaNoCadastroInput {
  produto_id: string
  quantidade: number
  payment_method: string
}

export async function listarAlunos(
  autoescola_id: string,
  search?: string
): Promise<AlunoComCreditos[]> {
  const supabase = createServiceClient()

  let query = supabase
    .from('students')
    .select('*, creditos:student_credits(*)')
    .eq('autoescola_id', autoescola_id)
    .order('name', { ascending: true })

  if (search) {
    query = query.or(`name.ilike.%${search}%,document_id.ilike.%${search}%,phone.ilike.%${search}%`)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)

  return (data ?? []).map((row) => ({
    ...row,
    creditos: Array.isArray(row.creditos) ? row.creditos[0] ?? null : row.creditos ?? null,
  })) as AlunoComCreditos[]
}

export async function criarAluno(
  input: NovoAlunoInput,
  venda?: VendaNoCadastroInput
): Promise<ActionResult<AlunoComCreditos>> {
  const supabase = createServiceClient()

  const docLimpo = input.document_id.replace(/\D/g, '')
  if (!docLimpo) return { success: false, error: 'CPF/CNH inválido.' }
  if (!input.name.trim()) return { success: false, error: 'Nome é obrigatório.' }

  // Verificar duplicidade
  const { data: existe } = await supabase
    .from('students')
    .select('id')
    .eq('document_id', docLimpo)
    .eq('autoescola_id', input.autoescola_id)
    .maybeSingle()

  if (existe) return { success: false, error: 'Já existe um aluno com este CPF/CNH.' }

  // Se houver venda, valida o produto ANTES de criar o aluno (evita cadastro parcial).
  let produto: Produto | null = null
  const quantidade = Math.max(1, Math.floor(venda?.quantidade ?? 1))
  if (venda) {
    const { data: produtoRow } = await supabase
      .from('produtos')
      .select('*')
      .eq('id', venda.produto_id)
      .eq('autoescola_id', input.autoescola_id)
      .eq('ativo', true)
      .maybeSingle()
    if (!produtoRow) return { success: false, error: 'Plano/produto selecionado não encontrado ou inativo.' }
    produto = produtoRow as Produto
    if (produto.tipo === 'pacote' && quantidade !== 1) {
      return { success: false, error: 'Plano (pacote) só pode ser vendido com quantidade 1.' }
    }
    if (produto.tipo === 'servico') {
      return { success: false, error: 'Serviços não concedem aulas e não podem ser vendidos no cadastro.' }
    }
  }

  const { data: aluno, error } = await supabase
    .from('students')
    .insert({
      name: input.name.trim(),
      document_id: docLimpo,
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
      autoescola_id: input.autoescola_id,
    })
    .select()
    .single()

  if (error || !aluno) return { success: false, error: 'Erro ao criar aluno.' }

  // Criar créditos zerados
  const { data: creditos } = await supabase
    .from('student_credits')
    .insert({
      student_id: aluno.id,
      autoescola_id: input.autoescola_id,
      aulas_cat_a: 0,
      aulas_cat_b: 0,
      aulas_cat_c: 0,
      aulas_cat_d: 0,
      aulas_cat_e: 0,
      aulas_disponiveis: 0,
    })
    .select()
    .single()

  const userAct = await getCurrentUsername()
  await supabase.from('activity_logs_painel').insert({
    username: userAct,
    action_type: 'aluno',
    description: `Aluno criado: ${aluno.name} (Doc: ${aluno.document_id})`,
    autoescola_id: input.autoescola_id,
  })

  let creditosFinal = creditos ?? null
  if (produto) {
    const snapshot: ProdutoSnapshot = {
      nome: quantidade > 1 ? `${produto.nome} x${quantidade}` : produto.nome,
      tipo: produto.tipo,
      automatico: produto.automatico,
      preco_centavos: produto.preco_centavos * quantidade,
      qtd_cat_a: produto.qtd_cat_a * quantidade,
      qtd_cat_b: produto.qtd_cat_b * quantidade,
      qtd_cat_c: produto.qtd_cat_c * quantidade,
      qtd_cat_d: produto.qtd_cat_d * quantidade,
      qtd_cat_e: produto.qtd_cat_e * quantidade,
    }

    const agora = new Date().toISOString()
    const vendedorId = await getCurrentUserId()
    const { data: pedido } = await supabase
      .from('pedidos_loja')
      .insert({
        autoescola_id: input.autoescola_id,
        student_id: aluno.id,
        produto_id: produto.id,
        produto_snapshot: snapshot,
        valor_centavos: snapshot.preco_centavos,
        status: 'aprovado',
        payment_method: venda!.payment_method,
        creditos_liberados: true,
        paid_at: agora,
        origem: 'manual',
        vendedor_user_id: vendedorId,
      })
      .select()
      .single()

    if (pedido) {
      await creditarPedido(supabase, pedido as PedidoLoja, {
        username: userAct,
        label: `Venda manual (${userAct})`,
      })

      const { data: creditosAtualizados } = await supabase
        .from('student_credits')
        .select('*')
        .eq('student_id', aluno.id)
        .eq('autoescola_id', input.autoescola_id)
        .single()
      if (creditosAtualizados) creditosFinal = creditosAtualizados
    }
  }

  return { success: true, data: { ...aluno, creditos: creditosFinal } as AlunoComCreditos }
}

export async function editarAluno(
  id: string,
  input: Partial<{ name: string; phone: string; email: string }>,
  autoescola_id: string
): Promise<ActionResult<void>> {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from('students')
    .update({
      ...(input.name && { name: input.name.trim() }),
      ...(input.phone !== undefined && { phone: input.phone.trim() || null }),
      ...(input.email !== undefined && { email: input.email.trim() || null }),
    })
    .eq('id', id)
    .eq('autoescola_id', autoescola_id)

  if (error) return { success: false, error: 'Erro ao editar aluno.' }

  const userAct = await getCurrentUsername()
  await supabase.from('activity_logs_painel').insert({
    username: userAct,
    action_type: 'aluno',
    description: `Aluno editado (ID: ${id})`,
    autoescola_id,
  })

  return { success: true, data: undefined }
}

export async function contarAulasAgendadas(
  student_id: string,
  autoescola_id: string
): Promise<number> {
  const supabase = createServiceClient()

  // Buscar document_id do aluno para encontrar agendamentos (vinculados por cpf_cnh)
  const { data: student } = await supabase
    .from('students')
    .select('document_id')
    .eq('id', student_id)
    .eq('autoescola_id', autoescola_id)
    .single()

  if (!student?.document_id) return 0

  const { count } = await supabase
    .from('agendamentos')
    .select('id', { count: 'exact', head: true })
    .eq('autoescola_id', autoescola_id)
    .eq('cpf_cnh', student.document_id)
    .in('status', ['scheduled', 'confirmed'])

  return count ?? 0
}

export async function excluirAluno(
  id: string,
  autoescola_id: string
): Promise<ActionResult<void>> {
  const supabase = createServiceClient()

  // Buscar document_id para encontrar agendamentos vinculados por cpf_cnh
  const { data: student } = await supabase
    .from('students')
    .select('document_id')
    .eq('id', id)
    .eq('autoescola_id', autoescola_id)
    .single()

  // Excluir agendamentos futuros/agendados (libera horários)
  if (student?.document_id) {
    await supabase
      .from('agendamentos')
      .delete()
      .eq('autoescola_id', autoescola_id)
      .eq('cpf_cnh', student.document_id)
      .in('status', ['scheduled', 'confirmed'])
  }

  // Excluir créditos (FK)
  await supabase.from('student_credits').delete().eq('student_id', id).eq('autoescola_id', autoescola_id)

  const { error } = await supabase.from('students').delete().eq('id', id).eq('autoescola_id', autoescola_id)
  if (error) return { success: false, error: 'Erro ao excluir aluno.' }

  const userAct = await getCurrentUsername()
  await supabase.from('activity_logs_painel').insert({
    username: userAct,
    action_type: 'aluno',
    description: `Aluno excluído (ID: ${id}, Doc: ${student?.document_id || '?'})`,
    autoescola_id,
  })

  return { success: true, data: undefined }
}

export async function ajustarCredito(
  student_id: string,
  categoria: 'a' | 'b' | 'c' | 'd' | 'e',
  delta: 1 | -1,
  autoescola_id: string
): Promise<ActionResult<AlunoCreditos>> {
  const supabase = createServiceClient()
  const col = `aulas_cat_${categoria}` as const

  // Buscar valor atual
  const { data: atual } = await supabase
    .from('student_credits')
    .select('*')
    .eq('student_id', student_id)
    .eq('autoescola_id', autoescola_id)
    .single()

  if (!atual) return { success: false, error: 'Créditos não encontrados.' }

  const currentVal = (atual as Record<string, number>)[col] ?? 0
  const newVal = Math.max(0, currentVal + delta)

  const { data: updated, error } = await supabase
    .from('student_credits')
    .update({ [col]: newVal })
    .eq('student_id', student_id)
    .eq('autoescola_id', autoescola_id)
    .select()
    .single()

  if (error || !updated) return { success: false, error: 'Erro ao ajustar crédito.' }

  const userAct = await getCurrentUsername()
  await supabase.from('activity_logs_painel').insert({
    username: userAct,
    action_type: 'creditos',
    description: `Crédito Cat. ${categoria.toUpperCase()} ${delta > 0 ? 'adicionado' : 'removido'} para aluno (ID: ${student_id}, novo total: ${newVal})`,
    autoescola_id,
  })

  return { success: true, data: updated as AlunoCreditos }
}

export interface QuantidadesPorCategoria {
  a?: number
  b?: number
  c?: number
  d?: number
  e?: number
}

/**
 * Adicionar crédito é sempre uma venda: exige valor + forma de pagamento
 * antes de aplicar. Reaproveita o mesmo mecanismo de venda manual usado no
 * cadastro de aluno (pedidos_loja + creditarPedido), então cai automaticamente
 * no histórico financeiro da autoescola e do vendedor (usuário logado).
 */
export async function venderCreditosAluno(
  student_id: string,
  autoescola_id: string,
  quantidades: QuantidadesPorCategoria,
  valor_centavos: number,
  payment_method: string
): Promise<ActionResult<AlunoComCreditos>> {
  const total = (quantidades.a ?? 0) + (quantidades.b ?? 0) + (quantidades.c ?? 0) + (quantidades.d ?? 0) + (quantidades.e ?? 0)
  if (total <= 0) return { success: false, error: 'Nenhuma quantidade de crédito informada.' }
  if (!Number.isInteger(valor_centavos) || valor_centavos <= 0) {
    return { success: false, error: 'Informe o valor da venda.' }
  }

  const supabase = createServiceClient()

  const { data: aluno } = await supabase
    .from('students')
    .select('*')
    .eq('id', student_id)
    .eq('autoescola_id', autoescola_id)
    .single()

  if (!aluno) return { success: false, error: 'Aluno não encontrado.' }

  const snapshot: ProdutoSnapshot = {
    nome: 'Ajuste de créditos (venda manual)',
    tipo: 'pacote',
    automatico: false,
    preco_centavos: valor_centavos,
    qtd_cat_a: quantidades.a ?? 0,
    qtd_cat_b: quantidades.b ?? 0,
    qtd_cat_c: quantidades.c ?? 0,
    qtd_cat_d: quantidades.d ?? 0,
    qtd_cat_e: quantidades.e ?? 0,
  }

  const userAct = await getCurrentUsername()
  const vendedorId = await getCurrentUserId()

  const { data: pedido, error: pedidoError } = await supabase
    .from('pedidos_loja')
    .insert({
      autoescola_id,
      student_id,
      produto_id: null,
      produto_snapshot: snapshot,
      valor_centavos,
      status: 'aprovado',
      payment_method,
      creditos_liberados: true,
      paid_at: new Date().toISOString(),
      origem: 'manual',
      vendedor_user_id: vendedorId,
    })
    .select()
    .single()

  if (pedidoError || !pedido) return { success: false, error: 'Erro ao registrar a venda.' }

  await creditarPedido(supabase, pedido as PedidoLoja, {
    username: userAct,
    label: `Venda manual (${userAct})`,
  })

  const { data: creditos } = await supabase
    .from('student_credits')
    .select('*')
    .eq('student_id', student_id)
    .eq('autoescola_id', autoescola_id)
    .single()

  return { success: true, data: { ...aluno, creditos: creditos ?? null } as AlunoComCreditos }
}
