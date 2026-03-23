'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Agendamento, AgendamentoStats, InstrutorDesempenho, AgendamentoStatus } from '../types'

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
    const { data: insts } = await supabase
      .from('instructors')
      .select('name')
      .eq('category', filter.category)
      .eq('autoescola_id', filter.autoescola_id)
    const names = (insts ?? []).map((i) => i.name)
    if (names.length > 0) {
      query = query.in('instructor_name', names)
    } else {
      query = query.in('instructor_name', ['__NO_MATCH__'])
    }
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

  const rows = data ?? []
  if (rows.length > 0) {
    const { data: insts } = await supabase
      .from('instructors')
      .select('name, category')
      .eq('autoescola_id', filter.autoescola_id)
    
    if (insts) {
      const catMap = new Map(insts.map((i) => [i.name, i.category]))
      for (const row of rows) {
        if (row.instructor_name && catMap.has(row.instructor_name)) {
          row.instructorCategory = catMap.get(row.instructor_name)!
        }
      }
    }
  }

  return { data: rows, total: count ?? 0 }
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
    const { data: insts } = await supabase
      .from('instructors')
      .select('name')
      .eq('category', category)
      .eq('autoescola_id', autoescola_id)
    const names = (insts ?? []).map((i) => i.name)
    if (names.length > 0) {
      query = query.in('instructor_name', names)
    } else {
      query = query.in('instructor_name', ['__NO_MATCH__'])
    }
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)

  const { data: insts } = await supabase
    .from('instructors')
    .select('name, category')
    .eq('autoescola_id', autoescola_id)
  
  const catMap = new Map((insts ?? []).map((i) => [i.name, i.category]))

  // Group by instructor
  const map = new Map<string, { concluidas: number; agendadas: number; canceladas: number; categoria: string }>()
  for (const row of data ?? []) {
    const key = row.instructor_name!
    const realCategory = catMap.get(key) ?? row.instructorCategory ?? 'CARRO'

    if (!map.has(key)) {
      map.set(key, { concluidas: 0, agendadas: 0, canceladas: 0, categoria: realCategory })
    }
    const entry = map.get(key)!
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

  // Buscar o agendamento atual para dados do aluno
  const { data: ag } = await supabase
    .from('agendamentos')
    .select('status, cpf_cnh, student_document, instructorCategory, instructor_name')
    .eq('id', id)
    .eq('autoescola_id', autoescola_id)
    .single()

  if (!ag || ag.status === 'cancelled') return

  await supabase
    .from('agendamentos')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .eq('autoescola_id', autoescola_id)

  const { data: inst } = ag.instructor_name ? await supabase.from('instructors').select('category').eq('name', ag.instructor_name).eq('autoescola_id', autoescola_id).single() : { data: null }
  const trueCategory = inst?.category ?? ag.instructorCategory

  const doc = ag.cpf_cnh ?? ag.student_document
  const creditField = trueCategory === 'MOTO' ? 'aulas_cat_a' : 'aulas_cat_b'

  if (doc) {
    const { data: student } = await supabase
      .from('students')
      .select('id')
      .eq('document_id', doc)
      .eq('autoescola_id', autoescola_id)
      .single()

    if (student) {
      const { data: creds } = await supabase
        .from('student_credits')
        .select(creditField)
        .eq('student_id', student.id)
        .single()

      if (creds) {
        const current = (creds as Record<string, number>)[creditField] ?? 0
        await supabase
          .from('student_credits')
          .update({ [creditField]: current + 1 })
          .eq('student_id', student.id)

        await supabase.from('activity_logs_painel').insert({
          username: 'painel',
          action_type: 'cancelamento',
          description: `Cancelamento de aula na listagem: devolvido 1 crédito de ${trueCategory} para aluno com doc ${doc}`,
          autoescola_id,
        })
      }
    }
  }

  revalidatePath('/', 'layout')
}

export async function atualizarStatusAgendamentosEmMassa(
  ids: string[],
  status: AgendamentoStatus,
  autoescola_id: string
): Promise<{ success: boolean; error?: string }> {
  if (!ids.length) return { success: true }
  
  const supabase = createServiceClient()

  try {
    for (const id of ids) {
      const { data: ag } = await supabase
        .from('agendamentos')
        .select('status, cpf_cnh, student_document, instructorCategory, instructor_name')
        .eq('id', id)
        .eq('autoescola_id', autoescola_id)
        .single()

      if (!ag) continue

      // Se for cancelar e ainda não estava cancelado, reembolsa crédito
      if (status === 'cancelled' && ag.status !== 'cancelled') {
        const { data: inst } = ag.instructor_name ? await supabase.from('instructors').select('category').eq('name', ag.instructor_name).eq('autoescola_id', autoescola_id).single() : { data: null }
        const trueCategory = inst?.category ?? ag.instructorCategory
        
        const doc = ag.cpf_cnh ?? ag.student_document
        const creditField = trueCategory === 'MOTO' ? 'aulas_cat_a' : 'aulas_cat_b'

        if (doc) {
          const { data: student } = await supabase
            .from('students')
            .select('id')
            .eq('document_id', doc)
            .eq('autoescola_id', autoescola_id)
            .single()

          if (student) {
            const { data: creds } = await supabase
              .from('student_credits')
              .select(creditField)
              .eq('student_id', student.id)
              .single()

            if (creds) {
              const current = (creds as Record<string, number>)[creditField] ?? 0
              await supabase
                .from('student_credits')
                .update({ [creditField]: current + 1 })
                .eq('student_id', student.id)

              await supabase.from('activity_logs_painel').insert({
                username: 'painel',
                action_type: 'cancelamento_massa',
                description: `Cancelamento em lote: devolvido 1 crédito de ${trueCategory} para aluno com doc ${doc}`,
                autoescola_id,
              })
            }
          }
        }
      }

      // Atualiza o status
      await supabase
        .from('agendamentos')
        .update({ status })
        .eq('id', id)
        .eq('autoescola_id', autoescola_id)
    }

    revalidatePath('/', 'layout')
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' }
  }
}
