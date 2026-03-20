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
