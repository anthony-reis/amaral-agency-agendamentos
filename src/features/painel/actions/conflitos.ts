'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getCurrentUsername, assertPodeEditar } from './authPainel'
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
    const { data: insts } = await supabase.from('instructors').select('name, category').eq('autoescola_id', autoescola_id)
    const catMap = new Map((insts ?? []).map((i) => [i.name, i.category]))

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
      if (!row.instructor_name) continue
      const realCat = catMap.get(row.instructor_name) ?? row.instructorCategory ?? ''
      const key = `${row.instructor_name}|${row.date}|${row.time_slot}`
      if (!mapInst.has(key)) {
        mapInst.set(key, { ids: [], alunos: [], studentDocs: [], categories: [], instructor_name: row.instructor_name, date: row.date, time_slot: row.time_slot })
      }
      const entry = mapInst.get(key)!
      entry.ids.push(row.id)
      entry.alunos.push(row.student_name)
      entry.studentDocs.push(row.student_document ?? row.cpf_cnh ?? '')
      if (realCat && !entry.categories.includes(realCat)) {
        entry.categories.push(realCat)
      }
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

    // Group by aluno+date+time_slot (duplicate same-slot)
    const mapAluno = new Map<string, {
      ids: string[]
      student_name: string
      studentDocs: string[]
      categories: string[]
      instructorNames: string[]
      date: string
      time_slot: string
      aulas: typeof allActive
    }>()
    for (const row of allActive) {
      const key = `${row.student_name}|${row.date}|${row.time_slot}`
      if (!mapAluno.has(key)) {
        mapAluno.set(key, { ids: [], student_name: row.student_name, studentDocs: [], categories: [], instructorNames: [], date: row.date, time_slot: row.time_slot, aulas: [] })
      }
      const entry = mapAluno.get(key)!
      entry.ids.push(row.id)
      entry.studentDocs.push(row.student_document ?? row.cpf_cnh ?? '')
      if (row.instructor_name) {
        const realCat = catMap.get(row.instructor_name) ?? row.instructorCategory ?? ''
        if (realCat && !entry.categories.includes(realCat)) {
          entry.categories.push(realCat)
        }
      }
      entry.aulas.push(row)
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

    // Group by aluno+date (2+ classes on the same DAY, regardless of time_slot)
    const mapAlunoDia = new Map<string, {
      ids: string[]
      student_name: string
      studentDocs: string[]
      categories: string[]
      instructorNames: string[]
      timeSlots: string[]
      date: string
    }>()
    for (const row of allActive) {
      const doc = row.student_document ?? row.cpf_cnh ?? row.student_name
      const key = `${doc}|${row.date}`
      if (!mapAlunoDia.has(key)) {
        mapAlunoDia.set(key, {
          ids: [],
          student_name: row.student_name,
          studentDocs: [],
          categories: [],
          instructorNames: [],
          timeSlots: [],
          date: row.date,
        })
      }
      const entry = mapAlunoDia.get(key)!
      entry.ids.push(row.id)
      entry.studentDocs.push(row.student_document ?? row.cpf_cnh ?? '')
      entry.timeSlots.push(row.time_slot)
      const realCat = row.instructor_name
        ? (catMap.get(row.instructor_name) ?? row.instructorCategory ?? '')
        : (row.instructorCategory ?? '')
      entry.categories.push(realCat)
      entry.instructorNames.push(row.instructor_name ?? '')
    }
    for (const [, v] of mapAlunoDia) {
      if (v.ids.length > 1) {
        // Only add if not already captured as same-slot duplicate
        const alreadyCaptured = conflitos.some(
          c => c.type === 'aluno' && c.student_name === v.student_name && c.date === v.date
            && c.ids.length === v.ids.length && c.ids.every(id => v.ids.includes(id))
        )
        if (!alreadyCaptured) {
          conflitos.push({
            type: 'aluno_dia',
            student_name: v.student_name,
            date: v.date,
            time_slot: v.timeSlots.join(', '),
            total: v.ids.length,
            ids: v.ids,
            studentDocs: v.studentDocs,
            categories: v.categories,
            instructorNames: v.instructorNames,
            timeSlots: v.timeSlots,
          })
        }
      }
    }
  }

  return conflitos
}

export async function resolverConflito(
  agendamentoId: string,
  autoescola_id: string
): Promise<void> {
  const guard = await assertPodeEditar()
  if (!guard.ok) throw new Error(guard.error)

  const supabase = createServiceClient()

  // Fetch the agendamento to get student info for credit refund
  const { data: agendamento } = await supabase
    .from('agendamentos')
    .select('student_document, cpf_cnh, instructorCategory, instructor_name, autoescola_id, date, time_slot')
    .eq('id', agendamentoId)
    .eq('autoescola_id', autoescola_id)
    .single()

  // Cancel the agendamento
  await supabase
    .from('agendamentos')
    .update({ status: 'cancelled' })
    .eq('id', agendamentoId)
    .eq('autoescola_id', autoescola_id)

  // Refund credit to the student
  if (agendamento) {
    const doc = agendamento.student_document ?? agendamento.cpf_cnh
    const { data: inst } = agendamento.instructor_name ? await supabase.from('instructors').select('category').eq('name', agendamento.instructor_name).eq('autoescola_id', agendamento.autoescola_id).single() : { data: null }
    const trueCat = inst?.category ?? agendamento.instructorCategory
    const cat = trueCat
    const creditField = cat === 'MOTO' ? 'aulas_cat_a' : 'aulas_cat_b'

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
          .select(creditField)
          .eq('student_id', student.id)
          .single()

          if (creds) {
            const current = (creds as Record<string, number>)[creditField] ?? 0
            await supabase
              .from('student_credits')
              .update({ [creditField]: current + 1 })
              .eq('student_id', student.id)

            // Registrar log de atividade
            const userAct = await getCurrentUsername()
            const dateBR = agendamento.date.split('-').reverse().join('/')
            await supabase.from('activity_logs_painel').insert({
              username: userAct,
              action_type: 'cancelamento',
              description: `Conflito resolvido: agendamento em ${dateBR} às ${agendamento.time_slot} foi cancelado e 1 crédito de ${trueCat} devolvido ao aluno.`,
              metadata: { agendamento_id: agendamentoId },
              autoescola_id,
            })
          }
        }
      }
    }

  // ESSENCIAL: Revalidar o cache para que o calendário e a disponibilidade reflitam a liberação do horário
  revalidatePath('/', 'layout')
}
