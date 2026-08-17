import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { buscarPayment, validarAssinaturaWebhook } from '@/lib/mercadopago'
import { creditarPedido } from '@/lib/creditos'
import type { PedidoLoja } from '@/lib/loja-types'

export const dynamic = 'force-dynamic'

// Sempre respondemos 200 nos casos "tratados mas ignorados" para o MP não
// fazer retry eterno; 401 apenas para assinatura inválida (possível forja).
function ok(motivo?: string) {
  return NextResponse.json({ ok: true, ...(motivo ? { motivo } : {}) })
}

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const autoescolaId = searchParams.get('autoescola_id')
  const type = searchParams.get('type') ?? searchParams.get('topic')
  const dataId = searchParams.get('data.id') ?? searchParams.get('id')

  if (!autoescolaId) return ok('sem autoescola_id')
  if (type !== 'payment') return ok('evento ignorado')
  if (!dataId) return ok('sem data.id')

  const supabase = createServiceClient()

  const { data: credenciaisRow } = await supabase
    .from('autoescola_pagamentos')
    .select('mp_access_token_secret_id, mp_webhook_secret_id')
    .eq('autoescola_id', autoescolaId)
    .maybeSingle()

  if (!credenciaisRow?.mp_access_token_secret_id || !credenciaisRow.mp_webhook_secret_id) {
    console.warn(`[webhook-mp] Sem credenciais para autoescola ${autoescolaId}`)
    return ok('sem credenciais')
  }

  const [{ data: accessToken }, { data: webhookSecret }] = await Promise.all([
    supabase.rpc('vault_read_secret', { p_secret_id: credenciaisRow.mp_access_token_secret_id }),
    supabase.rpc('vault_read_secret', { p_secret_id: credenciaisRow.mp_webhook_secret_id }),
  ])
  if (!accessToken || !webhookSecret) {
    console.warn(`[webhook-mp] Credenciais incompletas no Vault para autoescola ${autoescolaId}`)
    return ok('sem credenciais')
  }

  const assinaturaValida = validarAssinaturaWebhook({
    xSignature: req.headers.get('x-signature'),
    xRequestId: req.headers.get('x-request-id'),
    dataId,
    secret: webhookSecret,
  })
  if (!assinaturaValida) {
    console.warn(`[webhook-mp] Assinatura inválida (autoescola ${autoescolaId}, payment ${dataId})`)
    return NextResponse.json({ error: 'assinatura inválida' }, { status: 401 })
  }

  // Fonte de verdade: buscar o pagamento na API do MP com o token do tenant
  const payment = await buscarPayment(dataId, accessToken)
  if (!payment) {
    console.warn(`[webhook-mp] Payment ${dataId} não encontrado na API do MP`)
    return ok('payment não encontrado')
  }

  const pedidoId = payment.external_reference
  if (!pedidoId) return ok('sem external_reference')

  const { data: pedidoRaw } = await supabase
    .from('pedidos_loja')
    .select('*')
    .eq('id', pedidoId)
    .single()

  if (!pedidoRaw) {
    console.warn(`[webhook-mp] Pedido ${pedidoId} não encontrado`)
    return ok('pedido não encontrado')
  }
  const pedido = pedidoRaw as PedidoLoja

  if (pedido.autoescola_id !== autoescolaId) {
    console.error(`[webhook-mp] CRÍTICO: pedido ${pedidoId} não pertence à autoescola ${autoescolaId}`)
    return ok('tenant divergente')
  }

  const agora = new Date().toISOString()

  switch (payment.status) {
    case 'approved': {
      // Conferência de valor antes de creditar
      const valorEsperado = pedido.valor_centavos / 100
      if (Math.abs(payment.transaction_amount - valorEsperado) > 0.009) {
        console.error(
          `[webhook-mp] CRÍTICO: valor divergente no pedido ${pedidoId} — esperado ${valorEsperado}, pago ${payment.transaction_amount}. NÃO creditado.`
        )
        return ok('valor divergente')
      }

      // Idempotência: só a "primeira" chamada consegue virar creditos_liberados
      const { data: atualizados } = await supabase
        .from('pedidos_loja')
        .update({
          status: 'aprovado',
          mp_payment_id: String(payment.id),
          payment_method: payment.payment_type_id,
          creditos_liberados: true,
          paid_at: payment.date_approved ?? agora,
          updated_at: agora,
        })
        .eq('id', pedido.id)
        .eq('creditos_liberados', false)
        .select()

      if (!atualizados || atualizados.length === 0) {
        return ok('já creditado') // webhook duplicado
      }

      await creditarPedido(supabase, atualizados[0] as PedidoLoja)
      return ok('creditado')
    }

    case 'rejected':
    case 'cancelled': {
      // Nunca rebaixar um pedido já aprovado/creditado
      await supabase
        .from('pedidos_loja')
        .update({
          status: payment.status === 'rejected' ? 'rejeitado' : 'cancelado',
          mp_payment_id: String(payment.id),
          payment_method: payment.payment_type_id,
          updated_at: agora,
        })
        .eq('id', pedido.id)
        .in('status', ['pendente', 'expirado'])
      return ok('status atualizado')
    }

    case 'refunded':
    case 'charged_back': {
      await supabase
        .from('pedidos_loja')
        .update({ status: 'reembolsado', updated_at: agora })
        .eq('id', pedido.id)

      await supabase.from('activity_logs_painel').insert({
        username: 'mercadopago',
        action_type: 'venda',
        description: `ATENÇÃO: estorno/chargeback recebido no pedido ${pedido.id.slice(0, 8)} (${pedido.produto_snapshot.nome}). Créditos NÃO foram removidos automaticamente — ajuste manualmente se necessário.`,
        autoescola_id: pedido.autoescola_id,
      })
      return ok('reembolso registrado')
    }

    default: {
      // pending / in_process / authorized: mantém pendente, guarda referências
      await supabase
        .from('pedidos_loja')
        .update({
          mp_payment_id: String(payment.id),
          payment_method: payment.payment_type_id,
          updated_at: agora,
        })
        .eq('id', pedido.id)
        .eq('status', 'pendente')
      return ok('pendente')
    }
  }
}
