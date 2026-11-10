import 'server-only'

import { cache } from 'react'
import { createServiceClient } from '@/lib/supabase/server'

/**
 * Autoescola pela slug, deduplicada por request (React cache): layouts,
 * metadata e páginas da mesma renderização fazem 1 consulta só.
 */
export const getAutoescolaPorSlug = cache(async (slug: string) => {
  const { data } = await createServiceClient()
    .from('autoescolas')
    .select('id, nome, logo_url, slug, status, is_teste, reagendamento_min_horas, janela_agendamento')
    .eq('slug', slug)
    .maybeSingle()
  return data
})
