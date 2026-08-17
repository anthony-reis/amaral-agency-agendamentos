import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import type { MPPayment } from '@/lib/mercadopago'
import { creditarPedido } from '@/lib/creditos'
import type { PedidoLoja, PedidoLojaStatus } from '@/lib/loja-types'

export interface ResultadoProcessamento {
  status: PedidoLojaStatus
  creditos_liberados: boolean
}

/**
 * Aplica o resultado de um payment do MP a um pedido_loja, de forma
 * idempotente. Usado tanto pelo webhook quanto pela reconciliação ativa
 * (página de retorno do aluno) — mesma lógica, duas origens de chamada.
 */
export async function processarPagamentoPedido(
  supabase: SupabaseClient,
  pedido: PedidoLoja,
  payment: MPPayment
): Promise<ResultadoProcessamento> {
  const agora = new Date().toISOString()

  switch (payment.status) {
    case 'approved': {
      const valorEsperado = pedido.valor_centavos / 100
      if (Math.abs(payment.transaction_amount - valorEsperado) > 0.009) {
        console.error(
          `[pagamento-loja] CRÍTICO: valor divergente no pedido ${pedido.id} — esperado ${valorEsperado}, pago ${payment.transaction_amount}. NÃO creditado.`
        )
        return { status: pedido.status, creditos_liberados: pedido.creditos_liberados }
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
        return { status: 'aprovado', creditos_liberados: true } // já processado antes
      }

      await creditarPedido(supabase, atualizados[0] as PedidoLoja)
      return { status: 'aprovado', creditos_liberados: true }
    }

    case 'rejected':
    case 'cancelled': {
      const novoStatus: PedidoLojaStatus = payment.status === 'rejected' ? 'rejeitado' : 'cancelado'
      // Nunca rebaixar um pedido já aprovado/creditado
      if (pedido.status === 'aprovado' || pedido.status === 'reembolsado') {
        return { status: pedido.status, creditos_liberados: pedido.creditos_liberados }
      }
      await supabase
        .from('pedidos_loja')
        .update({
          status: novoStatus,
          mp_payment_id: String(payment.id),
          payment_method: payment.payment_type_id,
          updated_at: agora,
        })
        .eq('id', pedido.id)
        .in('status', ['pendente', 'expirado'])
      return { status: novoStatus, creditos_liberados: false }
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
      return { status: 'reembolsado', creditos_liberados: pedido.creditos_liberados }
    }

    default: {
      // pending / in_process / authorized: mantém pendente, guarda referências
      if (pedido.status === 'pendente') {
        await supabase
          .from('pedidos_loja')
          .update({
            mp_payment_id: String(payment.id),
            payment_method: payment.payment_type_id,
            updated_at: agora,
          })
          .eq('id', pedido.id)
          .eq('status', 'pendente')
      }
      return { status: pedido.status, creditos_liberados: pedido.creditos_liberados }
    }
  }
}
