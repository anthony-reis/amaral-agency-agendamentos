'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'
import { getCurrentUsername } from './authPainel'
import { listarCategorias, type Categoria } from '@/features/admin/actions/categorias'
import type { ActionResult } from '../types'
import type { DataExame } from '../types-exame'

export async function listarCategoriasParaAutoescola(autoescola_id: string): Promise<Categoria[]> {
  return listarCategorias(autoescola_id)
}

export async function listarDatasExame(
  autoescola_id: string,
  categoria_codigo?: string,
  opts?: { apenasFuturas?: boolean }
): Promise<DataExame[]> {
  const supabase = createServiceClient()
  let query = supabase
    .from('datas_exame')
    .select('*')
    .eq('autoescola_id', autoescola_id)
    .order('date', { ascending: true })

  if (categoria_codigo) query = query.eq('categoria_codigo', categoria_codigo)
  if (opts?.apenasFuturas) query = query.gte('date', new Date().toISOString().slice(0, 10))

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as DataExame[]
}

export async function listarDatasExamePorMes(
  autoescola_id: string,
  year: number,
  month: number
): Promise<DataExame[]> {
  const dateStart = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const dateEnd = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('datas_exame')
    .select('*')
    .eq('autoescola_id', autoescola_id)
    .gte('date', dateStart)
    .lte('date', dateEnd)
    .order('date', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as DataExame[]
}

export async function criarDataExame(
  autoescola_id: string,
  categoria_codigo: string,
  date: string,
  escola: string
): Promise<ActionResult<DataExame>> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('datas_exame')
    .insert({ autoescola_id, categoria_codigo, date })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') return { success: false, error: 'Essa data já está configurada para essa categoria.' }
    return { success: false, error: 'Erro ao criar data de exame.' }
  }

  const username = await getCurrentUsername()
  await supabase.from('activity_logs_painel').insert({
    username,
    action_type: 'datas_exame',
    description: `Data de exame criada: ${date} (categoria ${categoria_codigo})`,
    autoescola_id,
  })

  revalidatePath(`/${escola}/painel/datas-exame`)
  return { success: true, data: data as DataExame }
}

export async function removerDataExame(
  id: string,
  autoescola_id: string,
  escola: string
): Promise<ActionResult> {
  const supabase = createServiceClient()
  const { data: atual } = await supabase
    .from('datas_exame')
    .select('date, categoria_codigo')
    .eq('id', id)
    .eq('autoescola_id', autoescola_id)
    .maybeSingle()

  const { error } = await supabase
    .from('datas_exame')
    .delete()
    .eq('id', id)
    .eq('autoescola_id', autoescola_id)

  if (error) return { success: false, error: 'Erro ao remover data de exame.' }

  const username = await getCurrentUsername()
  await supabase.from('activity_logs_painel').insert({
    username,
    action_type: 'datas_exame',
    description: `Data de exame removida: ${atual?.date ?? id} (categoria ${atual?.categoria_codigo ?? '?'})`,
    autoescola_id,
  })

  revalidatePath(`/${escola}/painel/datas-exame`)
  return { success: true, data: undefined }
}
