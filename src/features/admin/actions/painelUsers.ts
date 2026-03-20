'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'
import type { ActionResult } from '../types'

export interface PainelUserRow {
  id: string
  username: string
  full_name: string
  role: string
  is_active: boolean
  autoescola_id: string
  created_at: string
}

export async function listarPainelUsers(autoescola_id: string): Promise<PainelUserRow[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('users_painel')
    .select('id, username, full_name, role, is_active, autoescola_id, created_at')
    .eq('autoescola_id', autoescola_id)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function criarPainelUser(input: {
  username: string
  full_name: string
  password: string
  role: string
  autoescola_id: string
}): Promise<ActionResult<PainelUserRow>> {
  const { username, full_name, password, role, autoescola_id } = input

  if (!username.trim()) return { success: false, error: 'Username é obrigatório.' }
  if (!full_name.trim()) return { success: false, error: 'Nome completo é obrigatório.' }
  if (!password.trim()) return { success: false, error: 'Senha é obrigatória.' }

  const supabase = createServiceClient()

  // Check username uniqueness
  const { data: existing } = await supabase
    .from('users_painel')
    .select('id')
    .eq('username', username.trim())
    .maybeSingle()

  if (existing) return { success: false, error: 'Username já está em uso.' }

  const { data, error } = await supabase
    .from('users_painel')
    .insert({ username: username.trim(), full_name: full_name.trim(), password, role, autoescola_id, is_active: true })
    .select()
    .single()

  if (error) return { success: false, error: 'Erro ao criar usuário.' }

  revalidatePath(`/admin/clientes/${autoescola_id}/usuarios`)
  return { success: true, data }
}

export async function togglePainelUser(
  id: string,
  is_active: boolean,
  autoescola_id: string
): Promise<ActionResult> {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from('users_painel')
    .update({ is_active })
    .eq('id', id)
    .eq('autoescola_id', autoescola_id)

  if (error) return { success: false, error: 'Erro ao atualizar usuário.' }
  revalidatePath(`/admin/clientes/${autoescola_id}/usuarios`)
  return { success: true, data: undefined }
}

export async function editarPainelUser(
  id: string,
  input: { full_name: string; username: string; password?: string; role: string },
  autoescola_id: string
): Promise<ActionResult<PainelUserRow>> {
  const supabase = createServiceClient()

  const updates: Record<string, string> = {
    full_name: input.full_name.trim(),
    username: input.username.trim(),
    role: input.role,
  }
  if (input.password?.trim()) updates.password = input.password.trim()

  const { data, error } = await supabase
    .from('users_painel')
    .update(updates)
    .eq('id', id)
    .eq('autoescola_id', autoescola_id)
    .select()
    .single()

  if (error) return { success: false, error: 'Erro ao editar usuário.' }
  revalidatePath(`/admin/clientes/${autoescola_id}/usuarios`)
  return { success: true, data }
}

export async function excluirPainelUser(
  id: string,
  autoescola_id: string
): Promise<ActionResult> {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from('users_painel')
    .delete()
    .eq('id', id)
    .eq('autoescola_id', autoescola_id)

  if (error) return { success: false, error: 'Erro ao excluir usuário.' }
  revalidatePath(`/admin/clientes/${autoescola_id}/usuarios`)
  return { success: true, data: undefined }
}
