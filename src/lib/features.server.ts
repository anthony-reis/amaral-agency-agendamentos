import 'server-only'

import { cache } from 'react'
import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { hasFeature, normalizarFeatures, type FeatureKey } from '@/lib/features'

/** Módulos da autoescola — deduplicado por request via React cache. */
export const getAutoescolaFeatures = cache(async (autoescola_id: string) => {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('autoescolas')
    .select('features')
    .eq('id', autoescola_id)
    .maybeSingle()
  return normalizarFeatures(data?.features)
})

export async function autoescolaTemFeature(autoescola_id: string, key: FeatureKey): Promise<boolean> {
  const features = await getAutoescolaFeatures(autoescola_id)
  return hasFeature(features, key)
}

/** Para páginas: 404 quando o módulo está desligado. */
export async function exigirFeature(autoescola_id: string, key: FeatureKey): Promise<void> {
  if (!(await autoescolaTemFeature(autoescola_id, key))) notFound()
}

/** Para server actions: devolve a mensagem de erro, ou null se liberado. */
export async function bloqueioFeature(autoescola_id: string, key: FeatureKey): Promise<string | null> {
  return (await autoescolaTemFeature(autoescola_id, key))
    ? null
    : 'Este recurso não está habilitado para esta autoescola.'
}
