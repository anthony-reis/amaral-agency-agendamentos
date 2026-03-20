'use server'

import { createServiceClient } from '@/lib/supabase/server'
import type { BloqueioTimeSlot, NovoBloqueioInput, ActionResult } from '../types'

export async function listarBloqueios(autoescola_id: string): Promise<BloqueioTimeSlot[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('blockedTimeSlots')
    .select('*')
    .eq('autoescola_id', autoescola_id)
    .order('date', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function criarBloqueio(
  input: NovoBloqueioInput
): Promise<ActionResult<BloqueioTimeSlot[]>> {
  const supabase = createServiceClient()
  const { tipo, vehicle_type, instructor, reason, autoescola_id } = input

  const rows: Omit<BloqueioTimeSlot, 'id' | 'created_at' | 'status'>[] = []

  if (tipo === 'dia') {
    if (!input.date) return { success: false, error: 'Data é obrigatória.' }
    rows.push({
      date: input.date,
      time_slot: 'DIA_INTEIRO',
      vehicle_type,
      instructor,
      reason,
      weekdays: [],
      autoescola_id,
    })
  } else if (tipo === 'horario') {
    if (!input.date || !input.time_slot) {
      return { success: false, error: 'Data e horário são obrigatórios.' }
    }
    rows.push({
      date: input.date,
      time_slot: input.time_slot,
      vehicle_type,
      instructor,
      reason,
      weekdays: [],
      autoescola_id,
    })
  } else if (tipo === 'intervalo') {
    if (!input.date_start || !input.date_end) {
      return { success: false, error: 'Data início e fim são obrigatórias.' }
    }
    // Generate a row per day in the range
    const start = new Date(input.date_start + 'T00:00:00')
    const end = new Date(input.date_end + 'T00:00:00')
    if (end < start) return { success: false, error: 'Data fim deve ser após data início.' }

    const current = new Date(start)
    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0]
      rows.push({
        date: dateStr,
        time_slot: input.time_slot ?? 'DIA_INTEIRO',
        vehicle_type,
        instructor,
        reason,
        weekdays: [],
        autoescola_id,
      })
      current.setDate(current.getDate() + 1)
    }
  }

  if (rows.length === 0) return { success: false, error: 'Nenhum registro para inserir.' }

  const { data, error } = await supabase
    .from('blockedTimeSlots')
    .insert(rows)
    .select()

  if (error) return { success: false, error: 'Erro ao criar bloqueio.' }
  return { success: true, data: data ?? [] }
}

export async function excluirBloqueio(
  id: string,
  autoescola_id: string
): Promise<ActionResult> {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from('blockedTimeSlots')
    .delete()
    .eq('id', id)
    .eq('autoescola_id', autoescola_id)

  if (error) return { success: false, error: 'Erro ao excluir bloqueio.' }
  return { success: true, data: undefined }
}
