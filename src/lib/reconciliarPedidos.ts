import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { buscarPaymentPorExternalReference } from '@/lib/mercadopago'
import { processarPagamentoPedido } from '@/lib/pagamentoLoja'
import type { PedidoLoja } from '@/lib/loja-types'

// Pix vence em 24h no MP; sem payment algum, 48h de folga antes de marcar expirado.
const HORAS_EXPIRAR_SEM_PAGAMENTO = 48
const DIAS_JANELA = 14

export interface ResumoReconciliacao {
  verificados: number
  aprovados: number
  expirados: number
  erros: number
}

/**
 * Reconciliação ativa dos pedidos do Mercado Pago ainda "pendente"
 * (ou "expirado" por engano, caso o pagamento caia depois): consulta a API do
 * MP por external_reference e aplica o resultado com a mesma lógica idempotente
 * do webhook. Cobre o Pix pago no app do banco, onde o aluno não volta à página
 * de retorno e o webhook pode falhar. `autoescolaId` restringe a uma escola.
 */
export async function reconciliarPedidosPendentes(
  supabase: SupabaseClient,
  opts: { autoescolaId?: string; dias?: number } = {}
): Promise<ResumoReconciliacao> {
  const resumo: ResumoReconciliacao = { verificados: 0, aprovados: 0, expirados: 0, erros: 0 }
  const desde = new Date(Date.now() - (opts.dias ?? DIAS_JANELA) * 24 * 3600 * 1000).toISOString()

  let query = supabase
    .from('pedidos_loja')
    .select('*')
    .eq('origem', 'mercado_pago')
    .in('status', ['pendente', 'expirado'])
    .eq('creditos_liberados', false)
    .gte('created_at', desde)
    .order('created_at', { ascending: true })
    .limit(500)
  if (opts.autoescolaId) query = query.eq('autoescola_id', opts.autoescolaId)

  const { data } = await query
  const pedidos = (data ?? []) as PedidoLoja[]

  const tokens = new Map<string, string | null>()
  async function tokenDaEscola(autoescolaId: string): Promise<string | null> {
    if (tokens.has(autoescolaId)) return tokens.get(autoescolaId) ?? null
    const { data: row } = await supabase
      .from('autoescola_pagamentos')
      .select('mp_access_token_secret_id')
      .eq('autoescola_id', autoescolaId)
      .maybeSingle()
    let token: string | null = null
    if (row?.mp_access_token_secret_id) {
      const { data: t } = await supabase.rpc('vault_read_secret', { p_secret_id: row.mp_access_token_secret_id })
      token = (t as string | null) ?? null
    }
    tokens.set(autoescolaId, token)
    return token
  }

  for (const pedido of pedidos) {
    const token = await tokenDaEscola(pedido.autoescola_id)
    if (!token) continue
    resumo.verificados++

    try {
      const payment = await buscarPaymentPorExternalReference(pedido.id, token)

      if (payment) {
        const r = await processarPagamentoPedido(supabase, pedido, payment)
        if (r.status === 'aprovado' && r.creditos_liberados) resumo.aprovados++
        continue
      }

      // Nenhum payment: checkout aberto e abandonado
      const idadeHoras = (Date.now() - new Date(pedido.created_at).getTime()) / 3600000
      if (pedido.status === 'pendente' && idadeHoras > HORAS_EXPIRAR_SEM_PAGAMENTO) {
        await expirarPedido(supabase, pedido.id)
        resumo.expirados++
      }
    } catch (e) {
      console.error(`[reconciliar] pedido ${pedido.id}:`, e)
      resumo.erros++
    }
  }

  return resumo
}

async function expirarPedido(supabase: SupabaseClient, pedidoId: string) {
  await supabase
    .from('pedidos_loja')
    .update({ status: 'expirado', updated_at: new Date().toISOString() })
    .eq('id', pedidoId)
    .eq('status', 'pendente')
}
