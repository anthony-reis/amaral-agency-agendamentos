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

  // Fallback: aluno importado sem row de créditos
  const { data: creditos } = await supabase
    .from('student_credits')
    .select('*')
    .eq('student_id', pedido.student_id)
    .eq('autoescola_id', pedido.autoescola_id)
    .maybeSingle()

  let atual = creditos
  if (!atual) {
    const { data: novo } = await supabase
      .from('student_credits')
      .insert({
        student_id: pedido.student_id,
        autoescola_id: pedido.autoescola_id,
        aulas_cat_a: 0,
        aulas_cat_b: 0,
        aulas_cat_c: 0,
        aulas_cat_d: 0,
        aulas_cat_e: 0,
        aulas_disponiveis: 0,
      })
      .select()
      .single()
    atual = novo
  }
  if (!atual) throw new Error(`[creditos] Não foi possível obter/criar student_credits do aluno ${pedido.student_id}`)

  const updates: Record<string, number> = {}
  for (const { cat, qtd } of quantidades) {
    const col = `aulas_cat_${cat}`
    updates[col] = ((atual as Record<string, number>)[col] ?? 0) + qtd
  }

  const { error: updateError } = await supabase
    .from('student_credits')
    .update(updates)
    .eq('student_id', pedido.student_id)
    .eq('autoescola_id', pedido.autoescola_id)

  if (updateError) {
    throw new Error(`[creditos] Erro ao creditar pedido ${pedido.id}: ${updateError.message}`)
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
