'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'
import { FEATURE_KEYS, normalizarFeatures, type FeatureKey } from '@/lib/features'
import { getAdminSession } from './authAdmin'
import type { ActionResult } from '../types'

export async function salvarModulosAutoescola(
  autoescola_id: string,
  modulos: Partial<Record<FeatureKey, boolean>>
): Promise<ActionResult<Record<FeatureKey, boolean>>> {
  const admin = await getAdminSession()
  if (!admin) return { success: false, error: 'Não autorizado.' }

  const features = normalizarFeatures(modulos)
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('autoescolas')
    .update({
      features,
      // Mantém a coluna legada em sincronia (lida pela main enquanto a
      // homolog não é mergeada).
      solicitacoes_ativo: features.solicitacoes,
    })
    .eq('id', autoescola_id)
    .select('slug, features')
    .single()

  if (error || !data) return { success: false, error: 'Erro ao salvar módulos.' }

  const ligados = FEATURE_KEYS.filter((k) => features[k])
  await supabase.from('activity_logs_painel').insert({
    username: admin.email,
    action_type: 'modulos',
    description: `Módulos atualizados pelo admin: ${ligados.length ? ligados.join(', ') : 'nenhum'}`,
    metadata: { features },
    autoescola_id,
  })

  revalidatePath(`/admin/clientes/${autoescola_id}/editar`)
  revalidatePath(`/${data.slug}`, 'layout')
  return { success: true, data: normalizarFeatures(data.features) }
}
