'use server'

import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/server'
import { criarPreference } from '@/lib/mercadopago'
import { verifyStudentSignature } from '@/lib/studentSession'
import type { PedidoLoja, PedidoLojaStatus, Produto, ProdutoSnapshot } from '@/lib/loja-types'
import type { ActionResult } from '@/features/admin/types'

// Lê e valida o student_id do cookie contra o cookie auxiliar assinado
// (student_sig). Usado só nas rotas de pagamento — um student_id sem
// assinatura correta (cookie editado manualmente) é tratado como não logado.
async function getAuthenticatedStudentId(): Promise<string | null> {
  const cookieStore = await cookies()
  const studentId = cookieStore.get('student_id')?.value
  const signature = cookieStore.get('student_sig')?.value
  if (!studentId || !verifyStudentSignature(studentId, signature)) return null
  return studentId
}

export async function listarProdutosLoja(autoescola_id: string): Promise<Produto[]> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('produtos')
    .select('*')
    .eq('autoescola_id', autoescola_id)
    .eq('ativo', true)
    .order('preco_centavos', { ascending: true })
  return (data ?? []) as Produto[]
}

export async function criarCheckout(
  produto_id: string,
  escola: string
): Promise<ActionResult<{ initPoint: string }>> {
  const studentId = await getAuthenticatedStudentId()
  if (!studentId) return { success: false, error: 'Sessão expirada. Identifique-se novamente.' }

  const supabase = createServiceClient()

  const { data: autoescola } = await supabase
    .from('autoescolas')
    .select('id, nome')
    .eq('slug', escola)
    .single()
  if (!autoescola) return { success: false, error: 'Autoescola não encontrada.' }

  // Aluno precisa pertencer ao tenant da URL
  const { data: student } = await supabase
    .from('students')
    .select('id, name, email, phone, document_id')
    .eq('id', studentId)
    .eq('autoescola_id', autoescola.id)
    .single()
  if (!student) return { success: false, error: 'Aluno não encontrado nesta autoescola.' }

  const { data: produto } = await supabase
    .from('produtos')
    .select('*')
    .eq('id', produto_id)
    .eq('autoescola_id', autoescola.id)
    .eq('ativo', true)
    .single()
  if (!produto) return { success: false, error: 'Produto indisponível.' }

  const { data: credenciaisRow } = await supabase
    .from('autoescola_pagamentos')
    .select('mp_access_token_secret_id, ativo, sandbox')
    .eq('autoescola_id', autoescola.id)
    .eq('ativo', true)
    .maybeSingle()
  if (!credenciaisRow?.mp_access_token_secret_id) {
    return { success: false, error: 'Pagamentos indisponíveis no momento.' }
  }

  const { data: accessToken } = await supabase.rpc('vault_read_secret', {
    p_secret_id: credenciaisRow.mp_access_token_secret_id,
  })
  if (!accessToken) return { success: false, error: 'Pagamentos indisponíveis no momento.' }

  const snapshot: ProdutoSnapshot = {
    nome: produto.nome,
    tipo: produto.tipo,
    automatico: produto.automatico,
    preco_centavos: produto.preco_centavos,
    qtd_cat_a: produto.qtd_cat_a,
    qtd_cat_b: produto.qtd_cat_b,
    qtd_cat_c: produto.qtd_cat_c,
    qtd_cat_d: produto.qtd_cat_d,
    qtd_cat_e: produto.qtd_cat_e,
  }

  const { data: pedido, error: pedidoError } = await supabase
    .from('pedidos_loja')
    .insert({
      autoescola_id: autoescola.id,
      student_id: student.id,
      produto_id: produto.id,
      produto_snapshot: snapshot,
      valor_centavos: produto.preco_centavos,
      status: 'pendente',
    })
    .select()
    .single()
  if (pedidoError || !pedido) return { success: false, error: 'Erro ao criar pedido.' }

  const [payerFirstName, ...payerLastNameParts] = student.name.trim().split(/\s+/)
  const payerLastName = payerLastNameParts.join(' ') || undefined

  try {
    const preference = await criarPreference(
      {
        pedidoId: pedido.id,
        titulo: produto.nome,
        descricao: produto.descricao,
        valorCentavos: produto.preco_centavos,
        autoescolaId: autoescola.id,
        escolaSlug: escola,
        statementDescriptor: autoescola.nome,
        payerEmail: student.email,
        payerFirstName,
        payerLastName,
        payerPhone: student.phone,
      },
      accessToken
    )

    await supabase
      .from('pedidos_loja')
      .update({ mp_preference_id: preference.id, updated_at: new Date().toISOString() })
      .eq('id', pedido.id)

    // Sempre init_point: o MP descontinuou o domínio sandbox.mercadopago.com.br
    // (sandbox_init_point pode cair em loop de redirecionamento). O modo de
    // teste é detectado automaticamente pelo Access Token usado na preference.
    return {
      success: true,
      data: { initPoint: preference.init_point },
    }
  } catch (e) {
    console.error('[loja] Erro ao criar preference MP:', e)
    // Pedido órfão vira cancelado para não poluir a lista
    await supabase
      .from('pedidos_loja')
      .update({ status: 'cancelado', updated_at: new Date().toISOString() })
      .eq('id', pedido.id)
    return { success: false, error: 'Erro ao iniciar o pagamento. Tente novamente.' }
  }
}

export async function consultarPedido(
  pedido_id: string
): Promise<{ status: PedidoLojaStatus; creditos_liberados: boolean } | null> {
  const studentId = await getAuthenticatedStudentId()
  if (!studentId) return null

  const supabase = createServiceClient()
  const { data } = await supabase
    .from('pedidos_loja')
    .select('status, creditos_liberados, student_id')
    .eq('id', pedido_id)
    .single()

  if (!data || data.student_id !== studentId) return null
  return { status: data.status as PedidoLojaStatus, creditos_liberados: data.creditos_liberados }
}

export async function listarMinhasCompras(): Promise<PedidoLoja[]> {
  const studentId = await getAuthenticatedStudentId()
  if (!studentId) return []

  const supabase = createServiceClient()
  const { data } = await supabase
    .from('pedidos_loja')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
  return (data ?? []) as PedidoLoja[]
}
