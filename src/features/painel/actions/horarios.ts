'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { getCurrentUsername, assertPodeEditar } from './authPainel'
import type { HorarioDisponivel, ActionResult } from '../types'

export async function listarHorarios(autoescola_id: string): Promise<HorarioDisponivel[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('horarios_disponiveis')
    .select('*')
    .eq('autoescola_id', autoescola_id)
    .order('instrutor', { nullsFirst: true })
    .order('ordem')

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function criarHorario(
  horario: string,
  instrutor: string | null,
  autoescola_id: string
): Promise<ActionResult<HorarioDisponivel>> {
  const guard = await assertPodeEditar()
  if (!guard.ok) return { success: false, error: guard.error }

  if (!horario.trim()) return { success: false, error: 'Horário é obrigatório.' }

  const supabase = createServiceClient()

  // Get next ordem for this instrutor
  const { data: existing } = await supabase
    .from('horarios_disponiveis')
    .select('ordem')
    .eq('autoescola_id', autoescola_id)
    .eq('instrutor', instrutor ?? '')
    .order('ordem', { ascending: false })
    .limit(1)

  const nextOrdem = existing && existing.length > 0 ? existing[0].ordem + 1 : 1

  const { data, error } = await supabase
    .from('horarios_disponiveis')
    .insert({
      horario: horario.trim(),
      instrutor,
      ordem: nextOrdem,
      ativo: true,
      autoescola_id,
    })
    .select()
    .single()

  if (error) return { success: false, error: 'Erro ao criar horário.' }

  const userAct = await getCurrentUsername()
  await supabase.from('activity_logs_painel').insert({
    username: userAct,
    action_type: 'usuarios',
    description: `Horário criado: ${horario.trim()} para ${instrutor || 'GERAL'}`,
    autoescola_id,
  })

  return { success: true, data }
}

export async function toggleHorario(
  id: string,
  ativo: boolean,
  autoescola_id: string
): Promise<ActionResult> {
  const guard = await assertPodeEditar()
  if (!guard.ok) return { success: false, error: guard.error }

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('horarios_disponiveis')
    .update({ ativo })
    .eq('id', id)
    .eq('autoescola_id', autoescola_id)

  if (error) return { success: false, error: 'Erro ao atualizar horário.' }

  const userAct = await getCurrentUsername()
  await supabase.from('activity_logs_painel').insert({
    username: userAct,
    action_type: 'usuarios',
    description: `Horário (ID: ${id}) ${ativo ? 'ativado' : 'desativado'}`,
    autoescola_id,
  })

  return { success: true, data: undefined }
}

export async function excluirHorario(
  id: string,
  autoescola_id: string
): Promise<ActionResult> {
  const guard = await assertPodeEditar()
  if (!guard.ok) return { success: false, error: guard.error }

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('horarios_disponiveis')
    .delete()
    .eq('id', id)
    .eq('autoescola_id', autoescola_id)

  if (error) return { success: false, error: 'Erro ao excluir horário.' }

  const userAct = await getCurrentUsername()
  await supabase.from('activity_logs_painel').insert({
    username: userAct,
    action_type: 'usuarios',
    description: `Horário excluído (ID: ${id})`,
    autoescola_id,
  })

  return { success: true, data: undefined }
}
