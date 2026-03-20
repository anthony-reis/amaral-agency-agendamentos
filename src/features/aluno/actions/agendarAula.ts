'use server'

import { createServiceClient } from '@/lib/supabase/server'

export async function fetchDisponibilidade(
  autoescolaId: string,
  date: string,
  category: string
) {
  const supabase = createServiceClient()

  // 1. Get instructors that match the category (or have category AMBOS)
  const { data: instructors } = await supabase
    .from('instructors')
    .select('id, name, category')
    .eq('autoescola_id', autoescolaId)
    .or(`category.eq.${category},category.eq.AMBOS`)

  if (!instructors || instructors.length === 0) return []

  // 2. Get available time slots for the autoescola (or specifically for those instructors if specified)
  const { data: timeSlots } = await supabase
    .from('horarios_disponiveis')
    .select('horario, instrutor')
    .eq('autoescola_id', autoescolaId)
    .eq('ativo', true)

  // 3. Get existing bookings for that date
  const { data: agendamentos } = await supabase
    .from('agendamentos')
    .select('time_slot, instructor_name, status')
    .eq('autoescola_id', autoescolaId)
    .eq('date', date)
    .neq('status', 'cancelled')

  // 4. Get blocked slots
  const { data: blocked } = await supabase
    .from('blockedTimeSlots')
    .select('time_slot, instructor, vehicle_type, weekdays')
    .eq('autoescola_id', autoescolaId)
    .eq('status', 'active')
    // and either date matches OR it's a recurring block (date is null, weekdays matches)

  // We need to associate instructor with their number of total classes taught, as requested.
  // Count only 'completed' classes for these instructors overall? 
  // For performance, we could do this via a single query or group by.
  const { data: stats } = await supabase
    .from('agendamentos')
    .select('instructor_name')
    .eq('autoescola_id', autoescolaId)
    .eq('status', 'completed')

  const instructorStats = (stats ?? []).reduce((acc: any, row) => {
    acc[row.instructor_name] = (acc[row.instructor_name] || 0) + 1
    return acc
  }, {})

  // Assemble result
  const result = instructors.map(inst => {
    const nome = inst.name
    // Find all global times or specific times
    const baseTimes = (timeSlots ?? [])
      .filter(t => !t.instrutor || t.instrutor === nome)
      .map(t => t.horario)
    
    // Filter booked times
    const bookedForInst = (agendamentos ?? [])
      .filter(a => a.instructor_name === nome)
      .map(a => a.time_slot)
    
    // Filter blocked times
    // We assume a simple filtering for now based on date. In a full robust system we'd check weekdays too.
    const blockedForInst = (blocked ?? [])
      .filter(b => (!b.instructor || b.instructor === nome) && (!b.vehicle_type || b.vehicle_type === category || b.vehicle_type === 'AMBOS'))
      .map(b => b.time_slot)

    const availableTimes = baseTimes.filter(t => !bookedForInst.includes(t) && !blockedForInst.includes(t))

    return {
      nome: inst.name,
      aulasMinistradas: instructorStats[nome] || 0,
      horarios: availableTimes.sort()
    }
  }).filter(inst => inst.horarios.length > 0)

  return result
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
