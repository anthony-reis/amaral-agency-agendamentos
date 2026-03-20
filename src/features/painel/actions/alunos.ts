'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'
import type { AlunoComCreditos, AlunoCreditos, NovoAlunoInput, ActionResult } from '../types'

export async function listarAlunos(
  autoescola_id: string,
  search?: string
): Promise<AlunoComCreditos[]> {
  const supabase = createServiceClient()

  let query = supabase
    .from('students')
    .select('*, creditos:student_credits(*)')
    .eq('autoescola_id', autoescola_id)
    .order('name', { ascending: true })

  if (search) {
    query = query.or(`name.ilike.%${search}%,document_id.ilike.%${search}%,phone.ilike.%${search}%`)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)

  return (data ?? []).map((row) => ({
    ...row,
    creditos: Array.isArray(row.creditos) ? row.creditos[0] ?? null : row.creditos ?? null,
  })) as AlunoComCreditos[]
}

export async function criarAluno(input: NovoAlunoInput): Promise<ActionResult<AlunoComCreditos>> {
  const supabase = createServiceClient()

  const docLimpo = input.document_id.replace(/\D/g, '')
  if (!docLimpo) return { success: false, error: 'CPF/CNH inválido.' }
  if (!input.name.trim()) return { success: false, error: 'Nome é obrigatório.' }

  // Verificar duplicidade
  const { data: existe } = await supabase
    .from('students')
    .select('id')
    .eq('document_id', docLimpo)
    .eq('autoescola_id', input.autoescola_id)
    .maybeSingle()

  if (existe) return { success: false, error: 'Já existe um aluno com este CPF/CNH.' }

  const { data: aluno, error } = await supabase
    .from('students')
    .insert({
      name: input.name.trim(),
      document_id: docLimpo,
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
      autoescola_id: input.autoescola_id,
    })
    .select()
    .single()

  if (error || !aluno) return { success: false, error: 'Erro ao criar aluno.' }

  // Criar créditos zerados
  const { data: creditos } = await supabase
    .from('student_credits')
    .insert({
      student_id: aluno.id,
      autoescola_id: input.autoescola_id,
      aulas_cat_a: 0,
      aulas_cat_b: 0,
      aulas_cat_c: 0,
      aulas_cat_d: 0,
      aulas_cat_e: 0,
      aulas_disponiveis: 0,
    })
    .select()
    .single()

  return { success: true, data: { ...aluno, creditos: creditos ?? null } as AlunoComCreditos }
}

export async function editarAluno(
  id: string,
  input: Partial<{ name: string; phone: string; email: string }>,
  autoescola_id: string
): Promise<ActionResult<void>> {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from('students')
    .update({
      ...(input.name && { name: input.name.trim() }),
      ...(input.phone !== undefined && { phone: input.phone.trim() || null }),
      ...(input.email !== undefined && { email: input.email.trim() || null }),
    })
    .eq('id', id)
    .eq('autoescola_id', autoescola_id)

  if (error) return { success: false, error: 'Erro ao editar aluno.' }
  return { success: true, data: undefined }
}

export async function excluirAluno(
  id: string,
  autoescola_id: string
): Promise<ActionResult<void>> {
  const supabase = createServiceClient()
  // Excluir créditos primeiro (FK)
  await supabase.from('student_credits').delete().eq('student_id', id).eq('autoescola_id', autoescola_id)
  const { error } = await supabase.from('students').delete().eq('id', id).eq('autoescola_id', autoescola_id)
  if (error) return { success: false, error: 'Erro ao excluir aluno.' }
  return { success: true, data: undefined }
}

export async function ajustarCredito(
  student_id: string,
  categoria: 'a' | 'b' | 'c' | 'd' | 'e',
  delta: 1 | -1,
  autoescola_id: string
): Promise<ActionResult<AlunoCreditos>> {
  const supabase = createServiceClient()
  const col = `aulas_cat_${categoria}` as const

  // Buscar valor atual
  const { data: atual } = await supabase
    .from('student_credits')
    .select('*')
    .eq('student_id', student_id)
    .eq('autoescola_id', autoescola_id)
    .single()

  if (!atual) return { success: false, error: 'Créditos não encontrados.' }

  const currentVal = (atual as Record<string, number>)[col] ?? 0
  const newVal = Math.max(0, currentVal + delta)

  const { data: updated, error } = await supabase
    .from('student_credits')
    .update({ [col]: newVal })
    .eq('student_id', student_id)
    .eq('autoescola_id', autoescola_id)
    .select()
    .single()

  if (error || !updated) return { success: false, error: 'Erro ao ajustar crédito.' }

  // Registrar log de auditoria
  await supabase.from('activity_logs_painel').insert({
    username: 'sistema',
    action_type: 'creditos',
    description: `Crédito Cat. ${categoria.toUpperCase()} ${delta > 0 ? 'adicionado' : 'removido'} (novo total: ${newVal})`,
    autoescola_id,
  })

  return { success: true, data: updated as AlunoCreditos }
}
