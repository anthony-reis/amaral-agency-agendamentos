'use server'

import { createServiceClient } from '@/lib/supabase/server'
import type { Instrutor, NovoInstrutorInput, ActionResult } from '../types'

export async function listarInstrutores(autoescola_id: string): Promise<Instrutor[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('instructors')
    .select('*')
    .eq('autoescola_id', autoescola_id)
    .order('name')

  if (error) throw new Error(error.message)
  return data ?? []
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
  input: Partial<Pick<Instrutor, 'name' | 'category'>>,
  autoescola_id: string
): Promise<ActionResult<Instrutor>> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('instructors')
    .update(input)
    .eq('id', id)
    .eq('autoescola_id', autoescola_id)
    .select()
    .single()

  if (error) return { success: false, error: 'Erro ao atualizar instrutor.' }
  return { success: true, data }
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

  const { error } = await supabase
    .from('instructors')
    .delete()
    .eq('id', id)
    .eq('autoescola_id', autoescola_id)

  if (error) return { success: false, error: 'Erro ao excluir instrutor.' }

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
