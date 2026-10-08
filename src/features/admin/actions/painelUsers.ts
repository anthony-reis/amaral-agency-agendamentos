'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'
import { ehPerfilPadrao, roleLegadoDosPerfis } from '@/lib/permissoes'
import { getAdminSession } from './authAdmin'
import type { ActionResult, AdminUser } from '../types'

/**
 * Concessão/remoção da permissão de reembolso fica na auditoria da própria
 * autoescola, com quem da AmaralPro fez a mudança.
 */
async function logPermissaoReembolso(
  admin: AdminUser,
  user: { id: string; full_name: string; username: string },
  concedida: boolean,
  autoescola_id: string
) {
  const supabase = createServiceClient()
  await supabase.from('activity_logs_painel').insert({
    username: `AmaralPro (${admin.email})`,
    action_type: 'reembolso',
    description: concedida
      ? `Permissão de reembolsar vendas CONCEDIDA a ${user.full_name} (@${user.username})`
      : `Permissão de reembolsar vendas REMOVIDA de ${user.full_name} (@${user.username})`,
    metadata: { painel_user_id: user.id, pode_reembolsar: concedida, admin_id: admin.id, admin_email: admin.email },
    autoescola_id,
  })
}

/** Mantém só perfis prontos ou personalizados desta autoescola (sem duplicados). */
async function validarPerfis(perfis: string[], autoescola_id: string): Promise<string[] | null> {
  const unicos = Array.from(new Set(perfis))
  const personalizados = unicos.filter((p) => !ehPerfilPadrao(p))
  if (personalizados.length) {
    const supabase = createServiceClient()
    const { data } = await supabase.from('painel_perfis').select('id').eq('autoescola_id', autoescola_id).in('id', personalizados)
    if ((data ?? []).length !== personalizados.length) return null
  }
  return unicos
}

export interface PainelUserRow {
  id: string
  username: string
  full_name: string
  role: string
  perfis: string[]
  is_active: boolean
  /** Permissão individual de reembolsar vendas (só a AmaralPro concede). */
  pode_reembolsar: boolean
  autoescola_id: string
  created_at: string
}

const USER_COLS = 'id, username, full_name, role, perfis, is_active, pode_reembolsar, autoescola_id, created_at'

export async function listarPainelUsers(autoescola_id: string): Promise<PainelUserRow[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('users_painel')
    .select(USER_COLS)
    .eq('autoescola_id', autoescola_id)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function criarPainelUser(input: {
  username: string
  full_name: string
  password: string
  perfis: string[]
  pode_reembolsar: boolean
  autoescola_id: string
}): Promise<ActionResult<PainelUserRow>> {
  const admin = await getAdminSession()
  if (!admin) return { success: false, error: 'Não autorizado.' }
  const { username, full_name, password, autoescola_id } = input
  const perfis = await validarPerfis(input.perfis, autoescola_id)
  if (!perfis) return { success: false, error: 'Perfil inválido para esta autoescola.' }
  if (perfis.length === 0) return { success: false, error: 'Escolha ao menos um perfil.' }
  const role = roleLegadoDosPerfis(perfis)

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
    .insert({
      username: username.trim(), full_name: full_name.trim(), password, role, perfis, autoescola_id, is_active: true,
      pode_reembolsar: input.pode_reembolsar === true,
    })
    .select(USER_COLS)
    .single()

  if (error || !data) return { success: false, error: 'Erro ao criar usuário.' }
  if (data.pode_reembolsar) await logPermissaoReembolso(admin, data, true, autoescola_id)

  revalidatePath(`/admin/clientes/${autoescola_id}/usuarios`)
  return { success: true, data }
}

export async function togglePainelUser(
  id: string,
  is_active: boolean,
  autoescola_id: string
): Promise<ActionResult> {
  if (!(await getAdminSession())) return { success: false, error: 'Não autorizado.' }
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
  input: { full_name: string; username: string; password?: string; perfis: string[]; pode_reembolsar: boolean },
  autoescola_id: string
): Promise<ActionResult<PainelUserRow>> {
  const admin = await getAdminSession()
  if (!admin) return { success: false, error: 'Não autorizado.' }
  const perfis = await validarPerfis(input.perfis, autoescola_id)
  if (!perfis) return { success: false, error: 'Perfil inválido para esta autoescola.' }
  if (perfis.length === 0) return { success: false, error: 'Escolha ao menos um perfil.' }

  const supabase = createServiceClient()

  const { data: antes } = await supabase
    .from('users_painel')
    .select('pode_reembolsar')
    .eq('id', id)
    .eq('autoescola_id', autoescola_id)
    .maybeSingle()
  if (!antes) return { success: false, error: 'Usuário não encontrado.' }

  const updates: Record<string, string | string[] | boolean> = {
    full_name: input.full_name.trim(),
    username: input.username.trim(),
    role: roleLegadoDosPerfis(perfis),
    perfis,
    pode_reembolsar: input.pode_reembolsar === true,
  }
  if (input.password?.trim()) updates.password = input.password.trim()

  const { data, error } = await supabase
    .from('users_painel')
    .update(updates)
    .eq('id', id)
    .eq('autoescola_id', autoescola_id)
    .select(USER_COLS)
    .single()

  if (error || !data) return { success: false, error: 'Erro ao editar usuário.' }
  if (antes.pode_reembolsar !== data.pode_reembolsar) {
    await logPermissaoReembolso(admin, data, data.pode_reembolsar, autoescola_id)
  }
  revalidatePath(`/admin/clientes/${autoescola_id}/usuarios`)
  return { success: true, data }
}

export async function excluirPainelUser(
  id: string,
  autoescola_id: string
): Promise<ActionResult> {
  if (!(await getAdminSession())) return { success: false, error: 'Não autorizado.' }
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
