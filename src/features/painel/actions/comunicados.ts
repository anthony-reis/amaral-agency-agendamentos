'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'
import { getPainelSession } from './authPainel'
import type { ComunicadoComLidos } from '../types'

export async function listarComunicados(autoescola_id: string): Promise<ComunicadoComLidos[]> {
  const supabase = createServiceClient()

  const { data: comunicados, error } = await supabase
    .from('comunicados')
    .select('*')
    .eq('autoescola_id', autoescola_id)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  if (!comunicados || comunicados.length === 0) return []

  const ids = comunicados.map((c) => c.id)

  const { data: lidosRows } = await supabase
    .from('comunicados_lidos')
    .select('comunicado_id')
    .in('comunicado_id', ids)

  const countMap = new Map<string, number>()
  for (const row of lidosRows ?? []) {
    countMap.set(row.comunicado_id, (countMap.get(row.comunicado_id) ?? 0) + 1)
  }

  return comunicados.map((c) => ({ ...c, total_lidos: countMap.get(c.id) ?? 0 }))
}

export async function criarComunicado(
  formData: FormData,
  escola: string
): Promise<ComunicadoComLidos> {
  const supabase = createServiceClient()
  const session = await getPainelSession(escola)
  if (!session) throw new Error('Não autenticado.')

  const titulo = (formData.get('titulo') as string | null)?.trim() ?? ''
  const descricao = (formData.get('descricao') as string | null)?.trim() ?? ''

  if (!titulo || !descricao) throw new Error('Título e descrição são obrigatórios.')

  const { data, error } = await supabase
    .from('comunicados')
    .insert({
      autoescola_id: session.autoescola_id,
      titulo,
      descricao,
      created_by: session.full_name,
    })
    .select('*')
    .single()

  if (error) throw new Error(error.message)

  await supabase.from('activity_logs_painel').insert({
    username: session.username,
    action_type: 'comunicado',
    description: `Comunicado criado: "${titulo}"`,
    autoescola_id: session.autoescola_id,
  })

  revalidatePath(`/${escola}/painel/comunicados`)
  return { ...data, total_lidos: 0 }
}

export async function editarComunicado(
  id: string,
  formData: FormData,
  escola: string
): Promise<ComunicadoComLidos> {
  const supabase = createServiceClient()
  const session = await getPainelSession(escola)
  if (!session) throw new Error('Não autenticado.')

  const titulo = (formData.get('titulo') as string | null)?.trim() ?? ''
  const descricao = (formData.get('descricao') as string | null)?.trim() ?? ''

  if (!titulo || !descricao) throw new Error('Título e descrição são obrigatórios.')

  const { data, error } = await supabase
    .from('comunicados')
    .update({ titulo, descricao })
    .eq('id', id)
    .eq('autoescola_id', session.autoescola_id)
    .select('*')
    .single()

  if (error) throw new Error(error.message)

  await supabase.from('activity_logs_painel').insert({
    username: session.username,
    action_type: 'comunicado',
    description: `Comunicado editado: "${titulo}"`,
    autoescola_id: session.autoescola_id,
  })

  revalidatePath(`/${escola}/painel/comunicados`)
  return { ...data, total_lidos: 0 }
}

export async function excluirComunicado(
  id: string,
  autoescola_id: string,
  escola: string
): Promise<void> {
  const supabase = createServiceClient()
  const session = await getPainelSession(escola)
  if (!session) throw new Error('Não autenticado.')

  const { error } = await supabase
    .from('comunicados')
    .delete()
    .eq('id', id)
    .eq('autoescola_id', autoescola_id)

  if (error) throw new Error(error.message)

  await supabase.from('activity_logs_painel').insert({
    username: session.username,
    action_type: 'comunicado',
    description: `Comunicado excluído: ${id}`,
    autoescola_id,
  })

  revalidatePath(`/${escola}/painel/comunicados`)
}
