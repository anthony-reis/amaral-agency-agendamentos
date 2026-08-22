'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { criarReembolso } from '@/lib/mercadopago'
import type { PedidoLoja, PedidoLojaStatus } from '@/lib/loja-types'
import type { ActionResult } from '@/features/admin/types'

export interface PedidoComAluno extends PedidoLoja {
  aluno: { name: string; document_id: string } | null
  vendedor: { full_name: string; username: string } | null
}

export async function listarVendas(
  autoescola_id: string,
  filtro?: { status?: PedidoLojaStatus | 'todos' }
): Promise<PedidoComAluno[]> {
  const supabase = createServiceClient()

  let query = supabase
    .from('pedidos_loja')
    .select('*, aluno:students(name, document_id), vendedor:users_painel(full_name, username)')
    .eq('autoescola_id', autoescola_id)
    .order('created_at', { ascending: false })
    .limit(300)

  if (filtro?.status && filtro.status !== 'todos') {
    query = query.eq('status', filtro.status)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)

  return (data ?? []).map((row) => ({
    ...row,
    aluno: Array.isArray(row.aluno) ? row.aluno[0] ?? null : row.aluno ?? null,
    vendedor: Array.isArray(row.vendedor) ? row.vendedor[0] ?? null : row.vendedor ?? null,
  })) as PedidoComAluno[]
}

export async function reembolsarPedido(autoescola_id: string, pedido_id: string): Promise<ActionResult<null>> {
  const supabase = createServiceClient()

  const { data: pedido } = await supabase
    .from('pedidos_loja')
    .select('*')
    .eq('id', pedido_id)
    .eq('autoescola_id', autoescola_id)
    .single()
  if (!pedido) return { success: false, error: 'Pedido não encontrado.' }
  if (pedido.status !== 'aprovado') return { success: false, error: 'Só é possível reembolsar pedidos aprovados.' }
  if (!pedido.mp_payment_id) return { success: false, error: 'Pedido sem payment_id do Mercado Pago.' }

  const { data: credenciaisRow } = await supabase
    .from('autoescola_pagamentos')
    .select('mp_access_token_secret_id')
    .eq('autoescola_id', autoescola_id)
    .maybeSingle()
  if (!credenciaisRow?.mp_access_token_secret_id) {
    return { success: false, error: 'Credenciais do Mercado Pago não configuradas.' }
  }

  const { data: accessToken } = await supabase.rpc('vault_read_secret', {
    p_secret_id: credenciaisRow.mp_access_token_secret_id,
  })
  if (!accessToken) return { success: false, error: 'Credenciais do Mercado Pago não configuradas.' }

  try {
    await criarReembolso(pedido.mp_payment_id, accessToken, `refund-${pedido.id}`)
  } catch (e) {
    console.error('[vendas] Erro ao reembolsar pedido:', e)
    return { success: false, error: 'Erro ao solicitar reembolso no Mercado Pago. Tente novamente.' }
  }

  await supabase
    .from('pedidos_loja')
    .update({ status: 'reembolsado', updated_at: new Date().toISOString() })
    .eq('id', pedido.id)

  await supabase.from('activity_logs_painel').insert({
    username: 'painel',
    action_type: 'venda',
    description: `Reembolso solicitado manualmente pelo painel — pedido ${pedido.id.slice(0, 8)} (${pedido.produto_snapshot.nome}). Créditos NÃO foram removidos automaticamente — ajuste manualmente se necessário.`,
    autoescola_id,
  })

  return { success: true, data: null }
}
