'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { getDisponibilidade } from '@/lib/getDisponibilidade'

export async function fetchDisponibilidade(
  autoescolaId: string,
  date: string,
  category: string
) {
  return getDisponibilidade(autoescolaId, date, category)
}

export async function criarAgendamento(data: {
  autoescola_id: string; // Add this since we need to bypass the null constraint
  date: string;
  timeSlot: string;
  instructorName: string;
  category: string;
  studentId: string;
  studentName: string;
  studentDocument: string;
}) {
  const supabase = createServiceClient()
  
  // Insert agendamento
  const { error: insertError } = await supabase
    .from('agendamentos')
    .insert({
      autoescola_id: data.autoescola_id, // include autoescola_id to fix constraint!
      date: data.date,
      time_slot: data.timeSlot,
      instructor_name: data.instructorName,
      instructorCategory: data.category,
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
  
  // Note: we might need to decrement using RPC or 2-step since there's no RLS.
  // 2-step:
  const { data: currentCreds } = await supabase
    .from('student_credits')
    .select(rpcCat)
    .eq('student_id', data.studentId)
    .single()
    
  if (currentCreds) {
    const credsAny = currentCreds as any
    await supabase
      .from('student_credits')
      .update({ [rpcCat]: Math.max(0, credsAny[rpcCat] - 1) })
      .eq('student_id', data.studentId)
  }

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

  // 1. Fetch old agendamento to get existing category
  const { data: oldAgendamento, error: fetchError } = await supabase
    .from('agendamentos')
    .select('instructorCategory')
    .eq('id', agendamentoId)
    .single()

  if (fetchError || !oldAgendamento) {
    throw new Error('Agendamento original não encontrado.')
  }

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
      const credsAny = currentCreds as any
      const currentNewCatAmount = credsAny[rpcNewCat] ?? 0
      
      if (currentNewCatAmount < 1) {
        throw new Error(`Créditos insuficientes para reagendar como ${data.category === 'CARRO' ? 'Carro' : 'Moto'}.`)
      }

      await supabase
        .from('student_credits')
        .update({
          [rpcOldCat]: (credsAny[rpcOldCat] ?? 0) + 1,
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
      instructorCategory: data.category,
      status: 'scheduled',
      notes: 'Reagendado pelo app do aluno'
    })
    .eq('id', agendamentoId)

  if (updateError) {
    throw new Error(updateError.message)
  }

  return { success: true }
}
