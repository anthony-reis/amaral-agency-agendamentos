'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { getCurrentUsername } from './authPainel'
import type { Instrutor, NovoInstrutorInput, ActionResult } from '../types'

// Postgres `numeric` chega como string via Supabase/PostgREST — normaliza para number.
function normalizarInstrutor(row: Instrutor): Instrutor {
  return {
    ...row,
    valor_hora_aula: row.valor_hora_aula != null ? Number(row.valor_hora_aula) : null,
  }
}

export async function listarInstrutores(autoescola_id: string): Promise<Instrutor[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('instructors')
    .select('*')
    .eq('autoescola_id', autoescola_id)
    .order('name')

  if (error) throw new Error(error.message)
  return (data ?? []).map(normalizarInstrutor)
}

export async function criarInstrutor(
  input: NovoInstrutorInput
): Promise<ActionResult<Instrutor>> {
  const { name, category, autoescola_id } = input

  if (!name.trim()) return { success: false, error: 'Nome é obrigatório.' }
  if (!category.trim()) return { success: false, error: 'Categoria é obrigatória.' }

  const supabase = createServiceClient()
  const DEFAULT_PASSWORD = '1234'

  const { data, error } = await supabase
    .from('instructors')
    .insert({ name: name.trim(), category, password: DEFAULT_PASSWORD, autoescola_id })
    .select()
    .single()

  if (error) return { success: false, error: 'Erro ao criar instrutor.' }

  const userAct = await getCurrentUsername()
  await supabase.from('activity_logs_painel').insert({
    username: userAct,
    action_type: 'usuarios',
    description: `Instrutor criado: ${name.trim()} (${category})`,
    autoescola_id,
  })

  // Sync instructor_passwords table (legacy)
  await supabase.from('instructor_passwords').insert({
    instructor_name: name.trim(),
    password: DEFAULT_PASSWORD,
    autoescola_id,
  })

  return { success: true, data }
}

export async function atualizarInstrutor(
  id: string,
  input: Partial<Pick<Instrutor, 'name' | 'category' | 'valor_hora_aula'>>,
  autoescola_id: string
): Promise<ActionResult<Instrutor>> {
  const supabase = createServiceClient()

  // Fetch current name before update to detect renames
  const { data: current } = await supabase
    .from('instructors')
    .select('name')
    .eq('id', id)
    .eq('autoescola_id', autoescola_id)
    .single()

  const { data, error } = await supabase
    .from('instructors')
    .update(input)
    .eq('id', id)
    .eq('autoescola_id', autoescola_id)
    .select()
    .single()

  if (error) return { success: false, error: 'Erro ao atualizar instrutor.' }

  // Cascade name change to all related tables
  if (input.name && current?.name && input.name !== current.name) {
    const oldName = current.name
    const newName = input.name
    await Promise.all([
      supabase
        .from('horarios_disponiveis')
        .update({ instrutor: newName })
        .eq('instrutor', oldName)
        .eq('autoescola_id', autoescola_id),
      supabase
        .from('agendamentos')
        .update({ instructor_name: newName })
        .eq('instructor_name', oldName)
        .eq('autoescola_id', autoescola_id),
      supabase
        .from('instructor_passwords')
        .update({ instructor_name: newName })
        .eq('instructor_name', oldName)
        .eq('autoescola_id', autoescola_id),
    ])
  }

  const userAct = await getCurrentUsername()
  await supabase.from('activity_logs_painel').insert({
    username: userAct,
    action_type: 'usuarios',
    description: `Instrutor atualizado (ID: ${id})`,
    autoescola_id,
  })
  return { success: true, data: normalizarInstrutor(data) }
}

export async function excluirInstrutor(
  id: string,
  autoescola_id: string
): Promise<ActionResult> {
  const supabase = createServiceClient()

  // Fetch name first so we can clean up horarios
  const { data: inst } = await supabase
    .from('instructors')
    .select('name')
    .eq('id', id)
    .eq('autoescola_id', autoescola_id)
    .single()

  if (!inst) return { success: false, error: 'Instrutor não encontrado.' }

  // Proteção contra exclusão acidental: não permite excluir enquanto houver
  // aulas marcadas (agendadas/confirmadas/em andamento) de hoje em diante.
  const hoje = new Date().toISOString().slice(0, 10)
  const { count: aulasMarcadas } = await supabase
    .from('agendamentos')
    .select('id', { count: 'exact', head: true })
    .eq('autoescola_id', autoescola_id)
    .eq('instructor_name', inst.name)
    .gte('date', hoje)
    .in('status', ['scheduled', 'confirmed', 'in_progress'])

  if (aulasMarcadas && aulasMarcadas > 0) {
    return {
      success: false,
      error: `Não é possível excluir ${inst.name}: ainda há ${aulasMarcadas} aula(s) marcada(s) de hoje em diante. Cancele ou remaneje essas aulas para outro instrutor antes de excluir.`,
    }
  }

  const { error } = await supabase
    .from('instructors')
    .delete()
    .eq('id', id)
    .eq('autoescola_id', autoescola_id)

  if (error) return { success: false, error: 'Erro ao excluir instrutor.' }

  const userAct = await getCurrentUsername()
  await supabase.from('activity_logs_painel').insert({
    username: userAct,
    action_type: 'usuarios',
    description: `Instrutor excluído (ID: ${id}, Nome: ${inst?.name || '?'})`,
    autoescola_id,
  })

  // Null out horarios linked to this instructor's name
  if (inst?.name) {
    await supabase
      .from('horarios_disponiveis')
      .update({ instrutor: null })
      .eq('autoescola_id', autoescola_id)
      .eq('instrutor', inst.name)
  }

  return { success: true, data: undefined }
}

export async function alterarSenhaInstrutor(
  id: string,
  novaSenha: string,
  autoescola_id: string
): Promise<ActionResult> {
  if (!novaSenha.trim()) return { success: false, error: 'Senha não pode ser vazia.' }

  const supabase = createServiceClient()

  // Update instructors table
  const { data: instrutor, error } = await supabase
    .from('instructors')
    .update({ password: novaSenha })
    .eq('id', id)
    .eq('autoescola_id', autoescola_id)
    .select('name')
    .single()

  if (error) return { success: false, error: 'Erro ao alterar senha.' }

  // Sync instructor_passwords table (legacy)
  await supabase
    .from('instructor_passwords')
    .update({ password: novaSenha })
    .eq('instructor_name', instrutor.name)
    .eq('autoescola_id', autoescola_id)

  return { success: true, data: undefined }
}
