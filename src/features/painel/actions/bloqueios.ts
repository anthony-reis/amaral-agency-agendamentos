'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { getCurrentUsername } from './authPainel'
import type { BloqueioTimeSlot, NovoBloqueioInput, NovoBloqueioSemanalInput, ActionResult } from '../types'

export async function listarBloqueios(autoescola_id: string): Promise<BloqueioTimeSlot[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('blockedTimeSlots')
    .select('*')
    .eq('autoescola_id', autoescola_id)

  if (error) throw new Error(error.message)
  if (!data) return []

  // Ordenar: primeiro os semanais (RECORRENTE_DIA_SEMANA), depois por data crescente
  return data.sort((a, b) => {
    const isRecurrentA = a.date === 'RECORRENTE_DIA_SEMANA'
    const isRecurrentB = b.date === 'RECORRENTE_DIA_SEMANA'

    if (isRecurrentA && !isRecurrentB) return -1
    if (!isRecurrentA && isRecurrentB) return 1
    
    // Se ambos forem recorrentes ou ambos forem datas, ordena por data
    // Nota: 'RECORRENTE_DIA_SEMANA' será igual se ambos forem recorrentes,
    // então a comparação de data funcionará para os outros casos.
    const dateA = a.date || ''
    const dateB = b.date || ''
    
    return dateA.localeCompare(dateB)
  })
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

  const userAct = await getCurrentUsername()
  await supabase.from('activity_logs_painel').insert({
    username: userAct,
    action_type: 'bloqueio',
    description: `Bloqueio criado: ${tipo.toUpperCase()} (${input.date || `${input.date_start} até ${input.date_end}`}) para ${instructor || vehicle_type || 'TODOS'}`,
    autoescola_id,
  })

  return { success: true, data: data ?? [] }
}

export async function criarBloqueioSemanais(
  input: NovoBloqueioSemanalInput
): Promise<ActionResult<{ total: number }>> {
  const supabase = createServiceClient()
  const { dia_semana, grupos, vehicle_type, reason, autoescola_id } = input

  // Uma linha recorrente por instructor por grupo — sem explodir em datas
  const rows: Omit<BloqueioTimeSlot, 'id' | 'created_at' | 'status'>[] = []
  const weekdays = [dia_semana] as unknown as string[]

  for (const grupo of grupos) {
    const instrutores = grupo.instrutores.length > 0 ? grupo.instrutores : [null]
    const time_slot = grupo.tipo === 'dia_inteiro'
      ? 'DIA_INTEIRO'
      : `APOS_${grupo.horario_corte}`

    for (const instructor of instrutores) {
      rows.push({
        date: 'RECORRENTE_DIA_SEMANA',
        time_slot,
        vehicle_type,
        instructor,
        reason,
        weekdays,
        autoescola_id,
      })
    }
  }

  if (rows.length === 0) return { success: false, error: 'Nenhum registro para inserir.' }

  const { error } = await supabase.from('blockedTimeSlots').insert(rows)
  if (error) return { success: false, error: `Erro ao criar bloqueios: ${error.message}` }

  const userAct = await getCurrentUsername()
  await supabase.from('activity_logs_painel').insert({
    username: userAct,
    action_type: 'bloqueio',
    description: `Bloqueio recorrente criado: dia ${dia_semana} — ${rows.length} instrutor(es)`,
    autoescola_id,
  })

  return { success: true, data: { total: rows.length } }
}

export async function editarBloqueio(
  id: string,
  patch: {
    time_slot?: string
    vehicle_type?: string
    instructor?: string | null
    reason?: string
    weekdays?: string[]
  },
  autoescola_id: string
): Promise<ActionResult> {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from('blockedTimeSlots')
    .update(patch)
    .eq('id', id)
    .eq('autoescola_id', autoescola_id)

  if (error) return { success: false, error: 'Erro ao editar bloqueio.' }

  const userAct = await getCurrentUsername()
  await supabase.from('activity_logs_painel').insert({
    username: userAct,
    action_type: 'bloqueio',
    description: `Bloqueio editado (ID: ${id})`,
    autoescola_id,
  })

  return { success: true, data: undefined }
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

  const userAct = await getCurrentUsername()
  await supabase.from('activity_logs_painel').insert({
    username: userAct,
    action_type: 'bloqueio',
    description: `Bloqueio removido (ID: ${id})`,
    autoescola_id,
  })

  return { success: true, data: undefined }
}
