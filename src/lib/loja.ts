import 'server-only'

import { createServiceClient } from '@/lib/supabase/server'

/**
 * Feature gate da Loja/Vendas: a feature só existe para tenants com
 * credenciais Mercado Pago cadastradas e ativas. Produção sem credencial
 * não vê nada.
 */
export async function lojaHabilitada(autoescola_id: string): Promise<boolean> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('autoescola_pagamentos')
    .select('ativo')
    .eq('autoescola_id', autoescola_id)
    .eq('ativo', true)
    .maybeSingle()
  return !!data
}

/**
 * Visibilidade da Loja para o aluno: além da credencial ativa,
 * exige ao menos 1 produto ativo no catálogo.
 */
export async function lojaVisivelParaAluno(autoescola_id: string): Promise<boolean> {
  if (!(await lojaHabilitada(autoescola_id))) return false
  const supabase = createServiceClient()
  const { count } = await supabase
    .from('produtos')
    .select('id', { count: 'exact', head: true })
    .eq('autoescola_id', autoescola_id)
    .eq('ativo', true)
  return (count ?? 0) > 0
}
