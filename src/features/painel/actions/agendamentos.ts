'use server'

import { createServiceClient } from '@/lib/supabase/server'
import type { Agendamento, AgendamentoStats, InstrutorDesempenho } from '../types'

export interface AgendamentosFilter {
  autoescola_id: string
  date_start?: string
  date_end?: string
  instructor_name?: string
  category?: string
  status?: string
  search?: string
  limit?: number
  offset?: number
}

export async function listarAgendamentos(
  filter: AgendamentosFilter
): Promise<{ data: Agendamento[]; total: number }> {
  const supabase = createServiceClient()
  const limit = filter.limit ?? 50
  const offset = filter.offset ?? 0

  let query = supabase
    .from('agendamentos')
    .select('*', { count: 'exact' })
    .eq('autoescola_id', filter.autoescola_id)
    .order('date', { ascending: false })
    .order('time_slot', { ascending: false })
    .range(offset, offset + limit - 1)

  if (filter.date_start) query = query.gte('date', filter.date_start)
  if (filter.date_end) query = query.lte('date', filter.date_end)
  if (filter.instructor_name && filter.instructor_name !== 'TODOS') {
    query = query.eq('instructor_name', filter.instructor_name)
  }
  if (filter.category && filter.category !== 'TODAS') {
    query = query.eq('instructorCategory', filter.category)
  }
  if (filter.status && filter.status !== 'TODOS') {
    query = query.eq('status', filter.status)
  }
  if (filter.search) {
    query = query.or(
      `student_name.ilike.%${filter.search}%,cpf_cnh.ilike.%${filter.search}%,student_document.ilike.%${filter.search}%`
    )
  }

  const { data, error, count } = await query
  if (error) throw new Error(error.message)
  return { data: data ?? [], total: count ?? 0 }
}

export async function getAgendamentosStats(
  autoescola_id: string,
  date_start: string,
  date_end: string
): Promise<AgendamentoStats> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('agendamentos')
    .select('status')
    .eq('autoescola_id', autoescola_id)
    .gte('date', date_start)
    .lte('date', date_end)

  if (error) throw new Error(error.message)

  const rows = data ?? []
  return {
    total: rows.length,
    agendadas: rows.filter((r) => r.status === 'scheduled').length,
    confirmadas: rows.filter((r) => r.status === 'confirmed').length,
    concluidas: rows.filter((r) => r.status === 'completed').length,
    desmarcadas: rows.filter((r) => r.status === 'cancelled').length,
    faltas: rows.filter((r) => r.status === 'absent').length,
  }
}

export async function getDesempenhoInstrutores(
  autoescola_id: string,
  date_start: string,
  date_end: string,
  instructor_name?: string,
  category?: string
): Promise<InstrutorDesempenho[]> {
  const supabase = createServiceClient()

  let query = supabase
    .from('agendamentos')
    .select('instructor_name, instructorCategory, status')
    .eq('autoescola_id', autoescola_id)
    .gte('date', date_start)
    .lte('date', date_end)
    .not('instructor_name', 'is', null)

  if (instructor_name && instructor_name !== 'TODOS') {
    query = query.eq('instructor_name', instructor_name)
  }
  if (category && category !== 'TODAS') {
    query = query.eq('instructorCategory', category)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)

  // Group by instructor
  const map = new Map<string, { concluidas: number; agendadas: number; canceladas: number; categoria: string }>()
  for (const row of data ?? []) {
    const key = row.instructor_name!
    if (!map.has(key)) {
      map.set(key, { concluidas: 0, agendadas: 0, canceladas: 0, categoria: row.instructorCategory ?? '' })
    }
    const entry = map.get(key)!
    if (!entry.categoria && row.instructorCategory) entry.categoria = row.instructorCategory
    if (row.status === 'completed') entry.concluidas++
    else if (row.status === 'scheduled' || row.status === 'confirmed') entry.agendadas++
    else if (row.status === 'cancelled' || row.status === 'absent') entry.canceladas++
  }

  return Array.from(map.entries())
    .map(([name, v]) => ({
      instructor_name: name,
      categoria: v.categoria,
      concluidas: v.concluidas,
      agendadas: v.agendadas,
      canceladas: v.canceladas,
      taxa: v.concluidas + v.canceladas > 0
        ? Math.round((v.concluidas / (v.concluidas + v.canceladas)) * 100)
        : 0,
    }))
    .sort((a, b) => b.concluidas - a.concluidas)
}

export async function cancelarAgendamento(
  id: string,
  autoescola_id: string
): Promise<void> {
  const supabase = createServiceClient()
  await supabase
    .from('agendamentos')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .eq('autoescola_id', autoescola_id)
}
