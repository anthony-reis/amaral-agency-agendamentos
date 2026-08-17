import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { CATEGORIAS_CREDITO, type PedidoLoja } from '@/lib/loja-types'

/**
 * Credita as aulas de um pedido aprovado em student_credits, usando
 * EXCLUSIVAMENTE o produto_snapshot do pedido (produto pode ter mudado).
 * A idempotência é garantida ANTES da chamada (update condicional de
 * creditos_liberados no webhook) — aqui só aplicamos os créditos.
 */
export async function creditarPedido(supabase: SupabaseClient, pedido: PedidoLoja): Promise<void> {
  const snapshot = pedido.produto_snapshot

  const quantidades = CATEGORIAS_CREDITO
    .map((cat) => ({ cat, qtd: snapshot[`qtd_cat_${cat}` as const] ?? 0 }))
    .filter(({ qtd }) => qtd > 0)

  if (quantidades.length === 0) return // produto tipo 'servico' — nada a creditar

  const qtdPorCategoria = Object.fromEntries(quantidades.map(({ cat, qtd }) => [cat, qtd])) as Partial<
    Record<(typeof CATEGORIAS_CREDITO)[number], number>
  >

  // UPDATE atômico (col = col + qtd) via RPC — evita a janela de corrida do
  // padrão SELECT + soma em memória + UPDATE para créditos concorrentes do mesmo aluno.
  const { error: creditoError } = await supabase.rpc('creditar_pedido_loja', {
    p_student_id: pedido.student_id,
    p_autoescola_id: pedido.autoescola_id,
    p_qtd_a: qtdPorCategoria.a ?? 0,
    p_qtd_b: qtdPorCategoria.b ?? 0,
    p_qtd_c: qtdPorCategoria.c ?? 0,
    p_qtd_d: qtdPorCategoria.d ?? 0,
    p_qtd_e: qtdPorCategoria.e ?? 0,
  })

  if (creditoError) {
    throw new Error(`[creditos] Erro ao creditar pedido ${pedido.id}: ${creditoError.message}`)
  }

  // Histórico de créditos (uma linha por categoria, seguindo convenção existente)
  const pedidoCurto = pedido.id.slice(0, 8)
  await supabase.from('historico_creditos').insert(
    quantidades.map(({ cat, qtd }) => ({
      aluno_id: pedido.student_id,
      student_id: pedido.student_id,
      autoescola_id: pedido.autoescola_id,
      tipo: 'credito',
      quantidade: qtd,
      motivo: `Compra na loja: ${snapshot.nome} - Categoria ${cat.toUpperCase()} (pedido ${pedidoCurto})`,
      usuario_responsavel: 'Mercado Pago',
    }))
  )

  // Auditoria do painel
  await supabase.from('activity_logs_painel').insert({
    username: 'mercadopago',
    action_type: 'venda',
    description: `Créditos liberados: ${snapshot.nome} (pedido ${pedidoCurto}) — ${quantidades
      .map(({ cat, qtd }) => `${qtd} cat. ${cat.toUpperCase()}`)
      .join(', ')}`,
    autoescola_id: pedido.autoescola_id,
  })
}
