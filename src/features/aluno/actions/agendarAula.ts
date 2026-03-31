'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getDisponibilidade } from '@/lib/getDisponibilidade'

/**
 * Returns current date string (YYYY-MM-DD) in São Paulo timezone (UTC-3).
 */
function getTodayBRTStr(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo'
  }).format(new Date());
}

/**
 * Validates that a date string (YYYY-MM-DD) is not in the past,
 * and if it's today, the time slot is at least in the future.
 */
function validateNotInPast(dateStr: string, timeSlot: string) {
  const todayStr = getTodayBRTStr()

  if (dateStr < todayStr) {
    throw new Error('Não é possível agendar aulas no passado.')
  }

  if (dateStr === todayStr) {
    const classDateTime = new Date(`${dateStr}T${timeSlot}:00-03:00`)
    if (classDateTime.getTime() <= Date.now()) {
      throw new Error('Não é possível agendar um horário que já passou.')
    }
  }
}

/**
 * Checks that the student doesn't already have a class on the given date.
 * For rescheduling, excludes the agendamento being rescheduled.
 */
async function validateOneClassPerDay(
  supabase: ReturnType<typeof createServiceClient>,
  autoescolaId: string,
  studentDocument: string,
  dateStr: string,
  excludeAgendamentoId?: string
) {
  let query = supabase
    .from('agendamentos')
    .select('id')
    .eq('autoescola_id', autoescolaId)
    .eq('date', dateStr)
    .neq('status', 'cancelled')
    .or(`student_document.eq.${studentDocument},cpf_cnh.eq.${studentDocument}`)

  if (excludeAgendamentoId) {
    query = query.neq('id', excludeAgendamentoId)
  }

  const { data: existing } = await query

  if (existing && existing.length > 0) {
    throw new Error('Você já possui uma aula agendada neste dia. Cada aluno pode ter apenas 1 aula por dia.')
  }
}

export async function fetchDisponibilidade(
  autoescolaId: string,
  date: string,
  category: string
) {
  return getDisponibilidade(autoescolaId, date, category)
}

/**
 * Checks if a student already has a (non-cancelled) class on the given date.
 * Returns the existing class info if found, null otherwise.
 */
export async function verificarAulaExistente(
  autoescolaId: string,
  studentDocument: string,
  date: string,
  excludeAgendamentoId?: string
): Promise<{ exists: boolean; time_slot?: string; instructor_name?: string }> {
  const supabase = createServiceClient()

  let query = supabase
    .from('agendamentos')
    .select('id, time_slot, instructor_name')
    .eq('autoescola_id', autoescolaId)
    .eq('date', date)
    .neq('status', 'cancelled')
    .or(`student_document.eq.${studentDocument},cpf_cnh.eq.${studentDocument}`)
    .limit(1)

  if (excludeAgendamentoId) {
    query = query.neq('id', excludeAgendamentoId)
  }

  const { data: existing } = await query

  if (existing && existing.length > 0) {
    return {
      exists: true,
      time_slot: existing[0].time_slot,
      instructor_name: existing[0].instructor_name,
    }
  }

  return { exists: false }
}

export async function criarAgendamento(data: {
  autoescola_id: string;
  date: string;
  timeSlot: string;
  instructorName: string;
  category: string;
  studentId: string;
  studentName: string;
  studentDocument: string;
}) {
  const supabase = createServiceClient()

  // ── Validations ──
  validateNotInPast(data.date, data.timeSlot)
  await validateOneClassPerDay(supabase, data.autoescola_id, data.studentDocument, data.date)
  
  // Insert agendamento
  const { error: insertError } = await supabase
    .from('agendamentos')
    .insert({
      autoescola_id: data.autoescola_id,
      date: data.date,
      time_slot: data.timeSlot,
      instructor_name: data.instructorName,
      instructorCategory: data.category?.toUpperCase(),
      student_name: data.studentName,
      student_document: data.studentDocument,
      cpf_cnh: data.studentDocument,
      status: 'scheduled',
      notes: 'Agendado pelo app do aluno'
    });

  if (insertError) {
    throw new Error(insertError.message)
  }

  // Deduct credit
  const rpcCat = data.category === 'CARRO' ? 'aulas_cat_b' : 'aulas_cat_a'
  
  const { data: currentCreds } = await supabase
    .from('student_credits')
    .select(rpcCat)
    .eq('student_id', data.studentId)
    .single()
    
  if (currentCreds) {
    const credsTyped = currentCreds as Record<string, number>
    await supabase
      .from('student_credits')
      .update({ [rpcCat]: Math.max(0, (credsTyped[rpcCat] ?? 0) - 1) })
      .eq('student_id', data.studentId)
  }

  revalidatePath('/', 'layout')
  return { success: true }
}

export async function atualizarTelefoneAluno(studentId: string, phone: string): Promise<void> {
  const supabase = createServiceClient()
  await supabase.from('students').update({ phone: phone.trim() }).eq('id', studentId)
}

export async function reagendarAula(agendamentoId: string, data: {
  autoescola_id: string;
  date: string;
  timeSlot: string;
  instructorName: string;
  category: string;
  studentId: string;
  studentName: string;
  studentDocument: string;
}) {
  const supabase = createServiceClient()

  // 1. Fetch old agendamento to get existing category + date/time for 2h rule
  const { data: oldAgendamento, error: fetchError } = await supabase
    .from('agendamentos')
    .select('instructorCategory, date, time_slot')
    .eq('id', agendamentoId)
    .single()

  if (fetchError || !oldAgendamento) {
    throw new Error('Agendamento original não encontrado.')
  }

  // ── Validate: rescheduling must be at least 2h before original class ──
  const classDateTime = new Date(`${oldAgendamento.date}T${oldAgendamento.time_slot}:00-03:00`)
  const diffMs = classDateTime.getTime() - Date.now()
  const diffHours = diffMs / (1000 * 60 * 60)

  if (diffHours < 2) {
    throw new Error('O reagendamento só pode ser feito com pelo menos 2 horas de antecedência do horário da aula.')
  }

  // ── Validate: new date/time not in the past ──
  validateNotInPast(data.date, data.timeSlot)

  // ── Validate: 1 class per day (excluding the current agendamento) ──
  await validateOneClassPerDay(supabase, data.autoescola_id, data.studentDocument, data.date, agendamentoId)

  const oldCategory = oldAgendamento.instructorCategory

  // 2. Adjust credits if category changed
  if (oldCategory !== data.category) {
    const rpcOldCat = oldCategory === 'CARRO' ? 'aulas_cat_b' : 'aulas_cat_a'
    const rpcNewCat = data.category === 'CARRO' ? 'aulas_cat_b' : 'aulas_cat_a'

    // Fetch current credits
    const { data: currentCreds } = await supabase
      .from('student_credits')
      .select('*')
      .eq('student_id', data.studentId)
      .single()

    if (currentCreds) {
      const credsTyped = currentCreds as Record<string, number>
      const currentNewCatAmount = credsTyped[rpcNewCat] ?? 0

      if (currentNewCatAmount < 1) {
        throw new Error(`Créditos insuficientes para reagendar como ${data.category === 'CARRO' ? 'Carro' : 'Moto'}.`)
      }

      await supabase
        .from('student_credits')
        .update({
          [rpcOldCat]: (credsTyped[rpcOldCat] ?? 0) + 1,
          [rpcNewCat]: Math.max(0, currentNewCatAmount - 1)
        })
        .eq('student_id', data.studentId)
    }
  }

  // 3. Update agendamento row
  const { error: updateError } = await supabase
    .from('agendamentos')
    .update({
      date: data.date,
      time_slot: data.timeSlot,
      instructor_name: data.instructorName,
      instructorCategory: data.category?.toUpperCase(),
      status: 'scheduled',
      notes: 'Reagendado pelo app do aluno'
    })
    .eq('id', agendamentoId)

  if (updateError) {
    throw new Error(updateError.message)
  }

  revalidatePath('/', 'layout')
  return { success: true }
}
