import 'server-only'

import { cache } from 'react'
import { createServiceClient } from '@/lib/supabase/server'
import { temConteudo, type TermosVersao } from '@/lib/termos'

/** Versão vigente (a mais recente) — deduplicado por request. */
export const getTermosVigentes = cache(async (autoescola_id: string): Promise<TermosVersao | null> => {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('termos_versoes')
    .select('*')
    .eq('autoescola_id', autoescola_id)
    .order('versao', { ascending: false })
    .limit(1)
    .maybeSingle()
  return (data as TermosVersao | null) ?? null
})

/**
 * Termos que o aluno ainda precisa aceitar. O aceite é pedido SOMENTE no
 * primeiro acesso: quem já aceitou qualquer versão não vê de novo, mesmo que
 * a autoescola publique uma versão nova.
 */
export async function getTermosPendentesAluno(
  autoescola_id: string,
  student_id: string
): Promise<TermosVersao | null> {
  const vigente = await getTermosVigentes(autoescola_id)
  if (!temConteudo(vigente)) return null

  const supabase = createServiceClient()
  const { count } = await supabase
    .from('termos_aceites')
    .select('id', { count: 'exact', head: true })
    .eq('autoescola_id', autoescola_id)
    .eq('student_id', student_id)

  return (count ?? 0) > 0 ? null : vigente
}
