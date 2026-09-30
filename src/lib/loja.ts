import 'server-only'

import { createServiceClient } from '@/lib/supabase/server'
import { autoescolaTemFeature } from '@/lib/features.server'

/**
 * Feature gate da Loja/Vendas: a feature só existe para tenants com o módulo
 * "vendas" ligado no /admin E credenciais Mercado Pago cadastradas e ativas.
 */
export async function lojaHabilitada(autoescola_id: string): Promise<boolean> {
  if (!(await autoescolaTemFeature(autoescola_id, 'vendas'))) return false
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
