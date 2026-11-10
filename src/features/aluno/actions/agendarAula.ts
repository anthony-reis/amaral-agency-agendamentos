'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getDisponibilidade } from '@/lib/getDisponibilidade'
import { liberarReservasVencidas } from '@/lib/reservasPosPacote'
import { cambioDoAluno, bloqueioCambio } from '@/lib/cambio.server'
import { bloqueioJanelaAgendamento } from '@/lib/janelaAgendamento.server'
import { bloqueioInstrutorVinculado, instrutorVinculadoDoAluno } from '@/lib/instrutorVinculado.server'
import { dataBR, registrarAtividadeAluno, registrarHistoricoAgendamento } from '@/lib/atividadeAluno.server'

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
  category: string,
  studentId?: string
) {
  // Independentes entre si: em paralelo. A liberação de reservas precisa terminar
  // antes de calcular a disponibilidade (ela altera os bloqueios).
  const [, cambio, vinculado] = await Promise.all([
    liberarReservasVencidas(autoescolaId),
    cambioDoAluno(autoescolaId, studentId, category),
    // Aluno vinculado a um instrutor na modalidade (opção da autoescola) só vê os horários dele.
    instrutorVinculadoDoAluno(autoescolaId, studentId, category),
  ])
  const disponiveis = await getDisponibilidade(autoescolaId, date, category, cambio)
  return vinculado ? disponiveis.filter((i) => i.nome === vinculado.name) : disponiveis
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
  const foraDoHorario = await bloqueioJanelaAgendamento(data.autoescola_id)
  if (foraDoHorario) throw new Error(foraDoHorario)
  validateNotInPast(data.date, data.timeSlot)
  await validateOneClassPerDay(supabase, data.autoescola_id, data.studentDocument, data.date)
  const erroCambio = await bloqueioCambio(data.autoescola_id, data.studentId, data.category, data.instructorName)
  if (erroCambio) throw new Error(erroCambio)
  const erroVinculo = await bloqueioInstrutorVinculado(data.autoescola_id, data.studentId, data.instructorName, data.category)
  if (erroVinculo) throw new Error(erroVinculo)

  // Insert agendamento
  const { data: novo, error: insertError } = await supabase
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
    })
    .select('id')
    .single();

  if (insertError || !novo) {
    throw new Error(insertError?.message ?? 'Não foi possível agendar a aula.')
  }

  // Rastreio: quando o aluno agendou, o que e com quem (Auditoria + linha do tempo da aula)
  const aluno = { id: data.studentId, name: data.studentName, document_id: data.studentDocument }
  const para = { date: data.date, time_slot: data.timeSlot, instrutor: data.instructorName, categoria: data.category?.toUpperCase() ?? null }
  await registrarHistoricoAgendamento(supabase, {
    autoescola_id: data.autoescola_id, agendamento_id: novo.id, student_id: aluno.id, student_name: aluno.name,
    tipo: 'agendado', para, feito_por: aluno.name,
  })
  await registrarAtividadeAluno(
    supabase, data.autoescola_id, aluno, 'agendamento',
    `Aluno agendou aula pelo app: ${aluno.name} (Doc: ${aluno.document_id}) — ${para.categoria}, ${dataBR(para.date)} às ${para.time_slot}, instrutor ${para.instrutor}`,
    { agendamento_id: novo.id, ...para }
  )

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
  const foraDoHorario = await bloqueioJanelaAgendamento(data.autoescola_id)
  if (foraDoHorario) throw new Error(foraDoHorario)

  const supabase = createServiceClient()

  // 1. Fetch old agendamento to get existing category + date/time for dynamic rule
  const { data: oldAgendamento, error: fetchError } = await supabase
    .from('agendamentos')
    .select('instructorCategory, date, time_slot, instructor_name')
    .eq('id', agendamentoId)
    .single()

  if (fetchError || !oldAgendamento) {
    throw new Error('Agendamento original não encontrado.')
  }

  // ── Fetch configured minimum hours for this school ──
  const { data: autoescolaConfig } = await supabase
    .from('autoescolas')
    .select('reagendamento_min_horas')
    .eq('id', data.autoescola_id)
    .single()
  const minHoras = autoescolaConfig?.reagendamento_min_horas ?? 2

  // ── Validate: rescheduling must be at least minHoras before original class ──
  const classDateTime = new Date(`${oldAgendamento.date}T${oldAgendamento.time_slot}:00-03:00`)
  const diffMs = classDateTime.getTime() - Date.now()
  const diffHours = diffMs / (1000 * 60 * 60)

  if (diffHours < minHoras) {
    throw new Error(`O reagendamento só pode ser feito com pelo menos ${minHoras} hora${minHoras !== 1 ? 's' : ''} de antecedência do horário da aula.`)
  }

  // ── Validate: new date/time not in the past ──
  validateNotInPast(data.date, data.timeSlot)

  // ── Validate: 1 class per day (excluding the current agendamento) ──
  await validateOneClassPerDay(supabase, data.autoescola_id, data.studentDocument, data.date, agendamentoId)

  const oldCategory = oldAgendamento.instructorCategory

  const erroCambio = await bloqueioCambio(data.autoescola_id, data.studentId, data.category, data.instructorName)
  if (erroCambio) throw new Error(erroCambio)
  const erroVinculo = await bloqueioInstrutorVinculado(data.autoescola_id, data.studentId, data.instructorName, data.category)
  if (erroVinculo) throw new Error(erroVinculo)

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

  // Rastreio: guarda de onde saiu e para onde foi (a linha da aula é sobrescrita)
  const aluno = { id: data.studentId, name: data.studentName, document_id: data.studentDocument }
  const de = {
    date: oldAgendamento.date, time_slot: oldAgendamento.time_slot,
    instrutor: oldAgendamento.instructor_name ?? null, categoria: oldAgendamento.instructorCategory ?? null,
  }
  const para = { date: data.date, time_slot: data.timeSlot, instrutor: data.instructorName, categoria: data.category?.toUpperCase() ?? null }
  await registrarHistoricoAgendamento(supabase, {
    autoescola_id: data.autoescola_id, agendamento_id: agendamentoId, student_id: aluno.id, student_name: aluno.name,
    tipo: 'reagendado', de, para, feito_por: aluno.name,
  })
  await registrarAtividadeAluno(
    supabase, data.autoescola_id, aluno, 'reagendamento',
    `Aluno remarcou aula pelo app: ${aluno.name} (Doc: ${aluno.document_id}) — de ${dataBR(de.date)} às ${de.time_slot} (${de.instrutor}) para ${dataBR(para.date)} às ${para.time_slot} (${para.instrutor})`,
    { agendamento_id: agendamentoId, de, para }
  )

  revalidatePath('/', 'layout')
  return { success: true }
}
