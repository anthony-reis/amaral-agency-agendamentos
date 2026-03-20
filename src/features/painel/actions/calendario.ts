'use server'

import { createServiceClient } from '@/lib/supabase/server'

export interface DiaCalendario {
  date: string          // 'YYYY-MM-DD'
  total: number
  bloqueado: boolean    // tem bloqueio nesse dia
}

export async function getCalendarioData(
  autoescola_id: string,
  year: number,
  month: number // 1-based
): Promise<DiaCalendario[]> {
  const supabase = createServiceClient()
  const monthStr = String(month).padStart(2, '0')
  const prefix = `${year}-${monthStr}`

  // Buscar agendamentos do mês (não cancelados)
  const { data: agendamentos } = await supabase
    .from('agendamentos')
    .select('date')
    .eq('autoescola_id', autoescola_id)
    .like('date', `${prefix}%`)
    .neq('status', 'cancelled')

  // Buscar bloqueios do mês
  const { data: bloqueios } = await supabase
    .from('blockedTimeSlots')
    .select('date')
    .eq('autoescola_id', autoescola_id)
    .like('date', `${prefix}%`)

  // Contar agendamentos por dia
  const contagem = new Map<string, number>()
  for (const a of agendamentos ?? []) {
    contagem.set(a.date, (contagem.get(a.date) ?? 0) + 1)
  }

  // Coletar datas com bloqueio
  const diasBloqueados = new Set((bloqueios ?? []).map((b) => b.date))

  // Descobrir total de horários disponíveis para calcular ocupação
  const { data: horarios } = await supabase
    .from('horarios_disponiveis')
    .select('id')
    .eq('autoescola_id', autoescola_id)
    .eq('ativo', true)

  const capacidade = Math.max(horarios?.length ?? 1, 1)

  // Montar todos os dias do mês
  const daysInMonth = new Date(year, month, 0).getDate()
  const result: DiaCalendario[] = []

  for (let d = 1; d <= daysInMonth; d++) {
    const dayStr = String(d).padStart(2, '0')
    const date = `${prefix}-${dayStr}`
    result.push({
      date,
      total: contagem.get(date) ?? 0,
      bloqueado: diasBloqueados.has(date),
    })
  }

  return result
}

export async function getAgendamentosDia(
  autoescola_id: string,
  date: string
) {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('agendamentos')
    .select('id, time_slot, instructor_name, student_name, status, instructorCategory, cpf_cnh')
    .eq('autoescola_id', autoescola_id)
    .eq('date', date)
    .order('time_slot', { ascending: true })

  return data ?? []
}
