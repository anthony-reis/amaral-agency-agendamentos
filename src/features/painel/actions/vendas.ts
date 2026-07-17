'use server'

import { createServiceClient } from '@/lib/supabase/server'
import type { PedidoLoja, PedidoLojaStatus } from '@/lib/loja-types'

export interface PedidoComAluno extends PedidoLoja {
  aluno: { name: string; document_id: string } | null
}

export async function listarVendas(
  autoescola_id: string,
  filtro?: { status?: PedidoLojaStatus | 'todos' }
): Promise<PedidoComAluno[]> {
  const supabase = createServiceClient()

  let query = supabase
    .from('pedidos_loja')
    .select('*, aluno:students(name, document_id)')
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
  })) as PedidoComAluno[]
}
