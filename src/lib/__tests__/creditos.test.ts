import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { creditarPedido } from '../creditos'
import type { PedidoLoja, ProdutoSnapshot } from '../loja-types'

function pedidoFixture(snapshot: Partial<ProdutoSnapshot>): PedidoLoja {
  return {
    id: 'pedido-1',
    autoescola_id: 'autoescola-1',
    student_id: 'aluno-1',
    produto_id: 'produto-1',
    produto_snapshot: {
      nome: 'Pacote Categoria B',
      tipo: 'pacote',
      automatico: false,
      preco_centavos: 10000,
      qtd_cat_a: 0,
      qtd_cat_b: 0,
      qtd_cat_c: 0,
      qtd_cat_d: 0,
      qtd_cat_e: 0,
      ...snapshot,
    },
    valor_centavos: 10000,
    status: 'aprovado',
    mp_preference_id: 'pref-1',
    mp_payment_id: 'pay-1',
    payment_method: 'pix',
    creditos_liberados: true,
    paid_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

function mockSupabase() {
  const rpc = vi.fn().mockResolvedValue({ data: null, error: null })
  const insert = vi.fn().mockResolvedValue({ data: null, error: null })
  const from = vi.fn().mockReturnValue({ insert })
  const supabase = { rpc, from } as unknown as SupabaseClient
  return { supabase, rpc, insert, from }
}

describe('creditarPedido', () => {
  it('não credita nada para produto tipo serviço (todas as quantidades zeradas)', async () => {
    const { supabase, rpc, from } = mockSupabase()
    const pedido = pedidoFixture({ tipo: 'servico' })

    await creditarPedido(supabase, pedido)

    expect(rpc).not.toHaveBeenCalled()
    expect(from).not.toHaveBeenCalled()
  })

  it('credita via RPC atômica e registra histórico + auditoria para um pacote normal', async () => {
    const { supabase, rpc, from, insert } = mockSupabase()
    const pedido = pedidoFixture({ qtd_cat_b: 5 })

    await creditarPedido(supabase, pedido)

    expect(rpc).toHaveBeenCalledWith('creditar_pedido_loja', {
      p_student_id: pedido.student_id,
      p_autoescola_id: pedido.autoescola_id,
      p_qtd_a: 0,
      p_qtd_b: 5,
      p_qtd_c: 0,
      p_qtd_d: 0,
      p_qtd_e: 0,
    })
    expect(from).toHaveBeenCalledWith('historico_creditos')
    expect(from).toHaveBeenCalledWith('activity_logs_painel')
    expect(insert).toHaveBeenCalledTimes(2)
  })

  it('lança erro se a RPC de crédito falhar', async () => {
    const { supabase, rpc } = mockSupabase()
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'falhou' } })
    const pedido = pedidoFixture({ qtd_cat_a: 1 })

    await expect(creditarPedido(supabase, pedido)).rejects.toThrow(/falhou/)
  })
})
