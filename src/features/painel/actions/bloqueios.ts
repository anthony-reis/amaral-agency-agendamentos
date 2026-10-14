'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { getCurrentUsername, assertPodeEditar } from './authPainel'
import { conflitoEntreBloqueios, mensagemConflitoBloqueio, parseWeekdaysIso, bloqueiosParaData, isoWeekday } from '@/lib/horariosDia'
import type { BloqueioTimeSlot, NovoBloqueioInput, NovoBloqueioSemanalInput, ActionResult } from '../types'


/** Erro se já existe bloqueio semanal cobrindo o mesmo instrutor/veículo/dia/horário (para qualquer um dos alvos). */
async function erroDeBloqueioDuplicado(
  autoescola_id: string,
  alvos: Array<string | null>,
  vehicle_type: string,
  time_slot: string,
  dias: number[],
  ignorarId?: string
): Promise<string | null> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('blockedTimeSlots')
    .select('id, instructor, vehicle_type, time_slot, weekdays, reason')
    .eq('autoescola_id', autoescola_id)
    .eq('status', 'Bloqueado')
    .eq('date', 'RECORRENTE_DIA_SEMANA')
  const existentes = (data ?? []).map((b) => ({ ...b, weekdays: parseWeekdaysIso(b.weekdays) }))
  for (const instructor of alvos) {
    const c = conflitoEntreBloqueios({ instructor, vehicle_type, time_slot, weekdays: dias }, existentes, ignorarId)
    if (c) return mensagemConflitoBloqueio(c)
  }
  return null
}

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
  const guard = await assertPodeEditar('operacao')
  if (!guard.ok) return { success: false, error: guard.error }

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
): Promise<ActionResult<{ total: number; registros: BloqueioTimeSlot[] }>> {
  const guard = await assertPodeEditar('operacao')
  if (!guard.ok) return { success: false, error: guard.error }

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

  const { data: inserted, error } = await supabase.from('blockedTimeSlots').insert(rows).select()
  if (error) return { success: false, error: `Erro ao criar bloqueios: ${error.message}` }

  const userAct = await getCurrentUsername()
  await supabase.from('activity_logs_painel').insert({
    username: userAct,
    action_type: 'bloqueio',
    description: `Bloqueio recorrente criado: dia ${dia_semana} — ${rows.length} instrutor(es)`,
    autoescola_id,
  })

  return { success: true, data: { total: rows.length, registros: inserted ?? [] } }
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
  const guard = await assertPodeEditar('operacao')
  if (!guard.ok) return { success: false, error: guard.error }

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
  const guard = await assertPodeEditar('operacao')
  if (!guard.ok) return { success: false, error: guard.error }

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

/**
 * Bloqueio semanal criado pela agenda de Horários: uma linha recorrente com vários dias (ISO 1=Seg…7=Dom).
 * tipo: dia inteiro | a partir de um horário | um horário específico.
 */
export async function criarBloqueioSemanalLivre(input: {
  dias: number[]
  tipo: 'dia_inteiro' | 'apos' | 'horario'
  horario?: string
  instrutor: string | null
  reason: string
  autoescola_id: string
}): Promise<ActionResult<BloqueioTimeSlot>> {
  const guard = await assertPodeEditar('operacao')
  if (!guard.ok) return { success: false, error: guard.error }

  const dias = [...new Set(input.dias.filter((d) => Number.isInteger(d) && d >= 1 && d <= 7))].sort()
  if (dias.length === 0) return { success: false, error: 'Selecione ao menos um dia da semana.' }
  if (input.tipo !== 'dia_inteiro' && !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.horario ?? '')) {
    return { success: false, error: 'Horário inválido. Use HH:MM.' }
  }

  const time_slot =
    input.tipo === 'dia_inteiro' ? 'DIA_INTEIRO' : input.tipo === 'apos' ? `APOS_${input.horario}` : input.horario!

  const duplicado = await erroDeBloqueioDuplicado(input.autoescola_id, [input.instrutor], 'TODOS', time_slot, dias)
  if (duplicado) return { success: false, error: duplicado }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('blockedTimeSlots')
    .insert({
      date: 'RECORRENTE_DIA_SEMANA',
      time_slot,
      vehicle_type: 'TODOS',
      instructor: input.instrutor,
      reason: input.reason.trim() || null,
      weekdays: dias,
      autoescola_id: input.autoescola_id,
    })
    .select()
    .single()

  if (error || !data) return { success: false, error: 'Erro ao criar bloqueio.' }

  const userAct = await getCurrentUsername()
  await supabase.from('activity_logs_painel').insert({
    username: userAct,
    action_type: 'bloqueio',
    description: `Bloqueio semanal criado: ${time_slot} (dias ${dias.join(',')}) para ${input.instrutor || 'TODOS'}`,
    autoescola_id: input.autoescola_id,
  })

  return { success: true, data }
}

/**
 * Edita um bloqueio semanal por completo (vários dias, tipo, horário, motivo).
 * instrutor/vehicle_type só mudam quando informados.
 */
export async function atualizarBloqueioSemanal(
  id: string,
  input: {
    dias: number[]
    tipo: 'dia_inteiro' | 'apos' | 'horario'
    horario?: string
    reason: string
    instrutor?: string | null
    vehicle_type?: string
  },
  autoescola_id: string
): Promise<ActionResult<BloqueioTimeSlot>> {
  const guard = await assertPodeEditar('operacao')
  if (!guard.ok) return { success: false, error: guard.error }

  const dias = [...new Set(input.dias.filter((d) => Number.isInteger(d) && d >= 1 && d <= 7))].sort()
  if (dias.length === 0) return { success: false, error: 'Selecione ao menos um dia da semana.' }
  if (input.tipo !== 'dia_inteiro' && !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.horario ?? '')) {
    return { success: false, error: 'Horário inválido. Use HH:MM.' }
  }

  const time_slot =
    input.tipo === 'dia_inteiro' ? 'DIA_INTEIRO' : input.tipo === 'apos' ? `APOS_${input.horario}` : input.horario!

  const supabase = createServiceClient()
  const { data: atual } = await supabase.from('blockedTimeSlots').select('instructor, vehicle_type').eq('id', id).eq('autoescola_id', autoescola_id).single()
  if (!atual) return { success: false, error: 'Bloqueio não encontrado.' }
  const duplicado = await erroDeBloqueioDuplicado(
    autoescola_id,
    [input.instrutor !== undefined ? input.instrutor : atual.instructor],
    input.vehicle_type ?? atual.vehicle_type,
    time_slot,
    dias,
    id
  )
  if (duplicado) return { success: false, error: duplicado }

  const patch: Record<string, unknown> = { time_slot, weekdays: dias, reason: input.reason.trim() || null }
  if (input.instrutor !== undefined) patch.instructor = input.instrutor
  if (input.vehicle_type !== undefined) patch.vehicle_type = input.vehicle_type

  const { data, error } = await supabase
    .from('blockedTimeSlots')
    .update(patch)
    .eq('id', id)
    .eq('autoescola_id', autoescola_id)
    .eq('date', 'RECORRENTE_DIA_SEMANA')
    .select()
    .single()

  if (error || !data) return { success: false, error: 'Erro ao editar bloqueio.' }

  const userAct = await getCurrentUsername()
  await supabase.from('activity_logs_painel').insert({
    username: userAct,
    action_type: 'bloqueio',
    description: `Bloqueio semanal editado: ${time_slot} (dias ${dias.join(',')}) para ${data.instructor || 'TODOS'}`,
    autoescola_id,
  })

  return { success: true, data }
}

/** Cria o mesmo bloqueio semanal (vários dias) para vários instrutores — lista vazia = todos. */
export async function criarBloqueioSemanalVarios(input: {
  dias: number[]
  tipo: 'dia_inteiro' | 'apos' | 'horario'
  horario?: string
  instrutores: string[]
  vehicle_type: string
  reason: string
  autoescola_id: string
}): Promise<ActionResult<BloqueioTimeSlot[]>> {
  const guard = await assertPodeEditar('operacao')
  if (!guard.ok) return { success: false, error: guard.error }

  const dias = [...new Set(input.dias.filter((d) => Number.isInteger(d) && d >= 1 && d <= 7))].sort()
  if (dias.length === 0) return { success: false, error: 'Selecione ao menos um dia da semana.' }
  if (input.tipo !== 'dia_inteiro' && !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.horario ?? '')) {
    return { success: false, error: 'Horário inválido. Use HH:MM.' }
  }
  const time_slot =
    input.tipo === 'dia_inteiro' ? 'DIA_INTEIRO' : input.tipo === 'apos' ? `APOS_${input.horario}` : input.horario!
  const alvos: Array<string | null> = input.instrutores.length > 0 ? input.instrutores : [null]

  const duplicado = await erroDeBloqueioDuplicado(input.autoescola_id, alvos, input.vehicle_type || 'TODOS', time_slot, dias)
  if (duplicado) return { success: false, error: duplicado }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('blockedTimeSlots')
    .insert(
      alvos.map((instructor) => ({
        date: 'RECORRENTE_DIA_SEMANA',
        time_slot,
        vehicle_type: input.vehicle_type || 'TODOS',
        instructor,
        reason: input.reason.trim() || null,
        weekdays: dias,
        autoescola_id: input.autoescola_id,
      }))
    )
    .select()
  if (error || !data) return { success: false, error: 'Erro ao criar bloqueio.' }

  const userAct = await getCurrentUsername()
  await supabase.from('activity_logs_painel').insert({
    username: userAct,
    action_type: 'bloqueio',
    description: `Bloqueio semanal criado: ${time_slot} (dias ${dias.join(',')}) para ${input.instrutores.length > 0 ? input.instrutores.join(', ') : 'TODOS'}`,
    autoescola_id: input.autoescola_id,
  })
  return { success: true, data }
}

/** Remove bloqueios de instrutores que não existem mais (sobras de antes da exclusão em cascata). */
export async function limparBloqueiosOrfaos(autoescola_id: string): Promise<ActionResult<{ removidos: number }>> {
  const guard = await assertPodeEditar('operacao')
  if (!guard.ok) return { success: false, error: guard.error }

  const supabase = createServiceClient()
  const [{ data: instrutores }, { data: blocos }] = await Promise.all([
    supabase.from('instructors').select('name').eq('autoescola_id', autoescola_id),
    supabase.from('blockedTimeSlots').select('id, instructor').eq('autoescola_id', autoescola_id).not('instructor', 'is', null),
  ])
  const existentes = new Set((instrutores ?? []).map((i) => i.name))
  const ids = (blocos ?? [])
    .filter((b) => b.instructor && b.instructor.trim().toUpperCase() !== 'TODOS' && !existentes.has(b.instructor))
    .map((b) => b.id)
  if (ids.length === 0) return { success: true, data: { removidos: 0 } }

  const { error } = await supabase.from('blockedTimeSlots').delete().in('id', ids).eq('autoescola_id', autoescola_id)
  if (error) return { success: false, error: 'Erro ao remover bloqueios.' }

  const userAct = await getCurrentUsername()
  await supabase.from('activity_logs_painel').insert({
    username: userAct,
    action_type: 'bloqueio',
    description: `Bloqueios de instrutores removidos limpos: ${ids.length}`,
    autoescola_id,
  })
  return { success: true, data: { removidos: ids.length } }
}

/** Bloqueio só numa data (feriado, exame, manutenção...) criado pela agenda. */
export async function criarBloqueioPontual(input: {
  date: string
  tipo: 'dia_inteiro' | 'apos' | 'horario'
  horario?: string
  instrutor: string | null
  reason: string
  autoescola_id: string
}): Promise<ActionResult<BloqueioTimeSlot>> {
  const guard = await assertPodeEditar('operacao')
  if (!guard.ok) return { success: false, error: guard.error }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || isNaN(new Date(input.date + 'T12:00:00').getTime())) {
    return { success: false, error: 'Data inválida.' }
  }
  if (input.date < new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })) {
    return { success: false, error: 'Escolha uma data de hoje em diante.' }
  }
  if (input.tipo !== 'dia_inteiro' && !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.horario ?? '')) {
    return { success: false, error: 'Horário inválido. Use HH:MM.' }
  }
  const time_slot =
    input.tipo === 'dia_inteiro' ? 'DIA_INTEIRO' : input.tipo === 'apos' ? `APOS_${input.horario}` : input.horario!

  const supabase = createServiceClient()
  const { data: rows } = await supabase
    .from('blockedTimeSlots')
    .select('id, instructor, vehicle_type, time_slot, weekdays, reason, date')
    .eq('autoescola_id', input.autoescola_id)
    .eq('status', 'Bloqueado')
    .or(`date.eq.${input.date},date.eq.RECORRENTE_DIA_SEMANA`)
  const existentes = bloqueiosParaData(
    input.date,
    (rows ?? []).map((b) => ({ ...b, date: b.date === 'RECORRENTE_DIA_SEMANA' ? null : b.date, weekdays: parseWeekdaysIso(b.weekdays) }))
  )
  const dia = isoWeekday(input.date)
  const c = conflitoEntreBloqueios({ instructor: input.instrutor, vehicle_type: 'TODOS', time_slot, weekdays: [dia] }, existentes)
  if (c) return { success: false, error: mensagemConflitoBloqueio(c) }

  const { data, error } = await supabase
    .from('blockedTimeSlots')
    .insert({
      date: input.date,
      time_slot,
      vehicle_type: 'TODOS',
      instructor: input.instrutor,
      reason: input.reason.trim() || null,
      weekdays: [],
      autoescola_id: input.autoescola_id,
    })
    .select()
    .single()
  if (error || !data) return { success: false, error: 'Erro ao criar bloqueio.' }

  const userAct = await getCurrentUsername()
  await supabase.from('activity_logs_painel').insert({
    username: userAct,
    action_type: 'bloqueio',
    description: `Bloqueio criado: ${time_slot} em ${input.date.split('-').reverse().join('/')} para ${input.instrutor || 'TODOS'}`,
    autoescola_id: input.autoescola_id,
  })
  return { success: true, data }
}
