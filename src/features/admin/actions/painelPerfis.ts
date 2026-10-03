'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'
import { normalizarPermissoes, type Permissoes } from '@/lib/permissoes'
import { getAdminSession } from './authAdmin'
import type { ActionResult } from '../types'

export interface PerfilPersonalizado {
  id: string
  autoescola_id: string
  nome: string
  descricao: string | null
  permissoes: Permissoes
  /** Quantos usuários do painel têm este perfil. */
  usuarios: number
}

export async function listarPerfisPersonalizados(autoescola_id: string): Promise<PerfilPersonalizado[]> {
  const supabase = createServiceClient()
  const [{ data: perfis }, { data: users }] = await Promise.all([
    supabase.from('painel_perfis').select('id, autoescola_id, nome, descricao, permissoes').eq('autoescola_id', autoescola_id).order('nome'),
    supabase.from('users_painel').select('perfis').eq('autoescola_id', autoescola_id),
  ])
  return (perfis ?? []).map((p) => ({
    ...p,
    permissoes: normalizarPermissoes(p.permissoes),
    usuarios: (users ?? []).filter((u) => (u.perfis ?? []).includes(p.id)).length,
  }))
}

export async function salvarPerfilPersonalizado(input: {
  id?: string
  autoescola_id: string
  nome: string
  descricao?: string
  permissoes: Partial<Permissoes>
}): Promise<ActionResult<PerfilPersonalizado>> {
  if (!(await getAdminSession())) return { success: false, error: 'Não autorizado.' }

  const nome = input.nome.trim()
  if (!nome) return { success: false, error: 'Dê um nome ao perfil.' }
  const permissoes = normalizarPermissoes(input.permissoes)
  if (Object.values(permissoes).every((n) => n === 'nenhum')) {
    return { success: false, error: 'Libere ao menos uma área para o perfil.' }
  }

  const supabase = createServiceClient()
  const row = {
    autoescola_id: input.autoescola_id,
    nome,
    descricao: input.descricao?.trim() || null,
    permissoes,
    updated_at: new Date().toISOString(),
  }
  const query = input.id
    ? supabase.from('painel_perfis').update(row).eq('id', input.id).eq('autoescola_id', input.autoescola_id)
    : supabase.from('painel_perfis').insert(row)
  const { data, error } = await query.select('id, autoescola_id, nome, descricao, permissoes').single()

  if (error || !data) {
    if (error?.code === '23505') return { success: false, error: 'Já existe um perfil com esse nome nesta autoescola.' }
    return { success: false, error: 'Erro ao salvar o perfil.' }
  }

  revalidatePath(`/admin/clientes/${input.autoescola_id}/perfis`)
  revalidatePath(`/admin/clientes/${input.autoescola_id}/usuarios`)
  const lista = await listarPerfisPersonalizados(input.autoescola_id)
  return { success: true, data: lista.find((p) => p.id === data.id)! }
}

export async function excluirPerfilPersonalizado(id: string, autoescola_id: string): Promise<ActionResult> {
  if (!(await getAdminSession())) return { success: false, error: 'Não autorizado.' }

  const supabase = createServiceClient()
  // Usuários que só tinham este perfil ficariam sem acesso — bloqueia a exclusão.
  const { data: users } = await supabase.from('users_painel').select('id, full_name, perfis').eq('autoescola_id', autoescola_id)
  const comPerfil = (users ?? []).filter((u) => (u.perfis ?? []).includes(id))
  const ficariamSemPerfil = comPerfil.filter((u) => (u.perfis ?? []).length === 1)
  if (ficariamSemPerfil.length > 0) {
    return {
      success: false,
      error: `Antes de excluir, atribua outro perfil a: ${ficariamSemPerfil.map((u) => u.full_name).join(', ')}.`,
    }
  }

  for (const u of comPerfil) {
    await supabase
      .from('users_painel')
      .update({ perfis: (u.perfis ?? []).filter((p: string) => p !== id) })
      .eq('id', u.id)
      .eq('autoescola_id', autoescola_id)
  }
  const { error } = await supabase.from('painel_perfis').delete().eq('id', id).eq('autoescola_id', autoescola_id)
  if (error) return { success: false, error: 'Erro ao excluir o perfil.' }

  revalidatePath(`/admin/clientes/${autoescola_id}/perfis`)
  revalidatePath(`/admin/clientes/${autoescola_id}/usuarios`)
  return { success: true, data: undefined }
}
