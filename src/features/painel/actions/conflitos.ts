'use server'

import { createServiceClient } from '@/lib/supabase/server'
import type { Conflito } from '../types'

export async function detectarConflitos(autoescola_id: string): Promise<Conflito[]> {
  const supabase = createServiceClient()

  const { data: allActive } = await supabase
    .from('agendamentos')
    .select('id, instructor_name, student_name, student_document, cpf_cnh, instructorCategory, date, time_slot, status')
    .eq('autoescola_id', autoescola_id)
    .not('status', 'in', '("cancelled")')
    .not('instructor_name', 'is', null)

  const conflitos: Conflito[] = []

  if (allActive) {
    // Group by instrutor+date+time_slot
    const mapInst = new Map<string, {
      ids: string[]
      alunos: string[]
      studentDocs: string[]
      categories: string[]
      instructor_name: string
      date: string
      time_slot: string
    }>()
    for (const row of allActive) {
      const key = `${row.instructor_name}|${row.date}|${row.time_slot}`
      if (!mapInst.has(key)) {
        mapInst.set(key, { ids: [], alunos: [], studentDocs: [], categories: [], instructor_name: row.instructor_name, date: row.date, time_slot: row.time_slot })
      }
      const entry = mapInst.get(key)!
      entry.ids.push(row.id)
      entry.alunos.push(row.student_name)
      entry.studentDocs.push(row.student_document ?? row.cpf_cnh ?? '')
      entry.categories.push(row.instructorCategory ?? '')
    }
    for (const [, v] of mapInst) {
      if (v.ids.length > 1) {
        conflitos.push({
          type: 'instrutor',
          instructor_name: v.instructor_name,
          date: v.date,
          time_slot: v.time_slot,
          total: v.ids.length,
          ids: v.ids,
          alunos: v.alunos,
          studentDocs: v.studentDocs,
          categories: v.categories,
        })
      }
    }

    // Group by aluno+date+time_slot
    const mapAluno = new Map<string, {
      ids: string[]
      student_name: string
      studentDocs: string[]
      categories: string[]
      instructorNames: string[]
      date: string
      time_slot: string
    }>()
    for (const row of allActive) {
      const key = `${row.student_name}|${row.date}|${row.time_slot}`
      if (!mapAluno.has(key)) {
        mapAluno.set(key, { ids: [], student_name: row.student_name, studentDocs: [], categories: [], instructorNames: [], date: row.date, time_slot: row.time_slot })
      }
      const entry = mapAluno.get(key)!
      entry.ids.push(row.id)
      entry.studentDocs.push(row.student_document ?? row.cpf_cnh ?? '')
      entry.categories.push(row.instructorCategory ?? '')
      entry.instructorNames.push(row.instructor_name)
    }
    for (const [, v] of mapAluno) {
      if (v.ids.length > 1) {
        conflitos.push({
          type: 'aluno',
          student_name: v.student_name,
          date: v.date,
          time_slot: v.time_slot,
          total: v.ids.length,
          ids: v.ids,
          studentDocs: v.studentDocs,
          categories: v.categories,
          instructorNames: v.instructorNames,
        })
      }
    }
  }

  return conflitos
}

export async function resolverConflito(
  idParaCancelar: string,
  autoescola_id: string
): Promise<void> {
  const supabase = createServiceClient()

  // Fetch the agendamento to get student info for credit refund
  const { data: agendamento } = await supabase
    .from('agendamentos')
    .select('student_document, cpf_cnh, instructorCategory')
    .eq('id', idParaCancelar)
    .eq('autoescola_id', autoescola_id)
    .single()

  // Cancel the agendamento
  await supabase
    .from('agendamentos')
    .update({ status: 'cancelled' })
    .eq('id', idParaCancelar)
    .eq('autoescola_id', autoescola_id)

  // Refund credit to the student
  if (agendamento) {
    const doc = agendamento.student_document ?? agendamento.cpf_cnh
    const cat = agendamento.instructorCategory
    const rpcCat = cat === 'CARRO' ? 'aulas_cat_b' : 'aulas_cat_a'

    if (doc) {
      // Find student by document
      const { data: student } = await supabase
        .from('students')
        .select('id')
        .eq('document_id', doc)
        .eq('autoescola_id', autoescola_id)
        .single()

      if (student) {
        // Fetch current credits
        const { data: creds } = await supabase
          .from('student_credits')
          .select(rpcCat)
          .eq('student_id', student.id)
          .single()

        if (creds) {
          const current = (creds as Record<string, number>)[rpcCat] ?? 0
          await supabase
            .from('student_credits')
            .update({ [rpcCat]: current + 1 })
            .eq('student_id', student.id)
        }
      }
    }
  }
}
