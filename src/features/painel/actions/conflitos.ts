'use server'

import { createServiceClient } from '@/lib/supabase/server'
import type { Conflito } from '../types'

export async function detectarConflitos(autoescola_id: string): Promise<Conflito[]> {
  const supabase = createServiceClient()

  // Conflito por instrutor: mesmo instrutor, mesma data, mesmo horário, mais de 1 agendamento ativo
  const { data: porInstrutor } = await supabase.rpc('detectar_conflitos_instrutor', {
    p_autoescola_id: autoescola_id,
  })

  // Fallback: manual query if RPC not available
  const { data: allActive } = await supabase
    .from('agendamentos')
    .select('id, instructor_name, student_name, date, time_slot, status')
    .eq('autoescola_id', autoescola_id)
    .not('status', 'in', '("cancelled")')
    .not('instructor_name', 'is', null)

  const conflitos: Conflito[] = []

  if (allActive) {
    // Group by instrutor+date+time_slot
    const map = new Map<string, { ids: string[]; alunos: string[]; instructor_name: string; date: string; time_slot: string }>()
    for (const row of allActive) {
      const key = `${row.instructor_name}|${row.date}|${row.time_slot}`
      if (!map.has(key)) {
        map.set(key, { ids: [], alunos: [], instructor_name: row.instructor_name, date: row.date, time_slot: row.time_slot })
      }
      const entry = map.get(key)!
      entry.ids.push(row.id)
      entry.alunos.push(row.student_name)
    }
    for (const [, v] of map) {
      if (v.ids.length > 1) {
        conflitos.push({
          type: 'instrutor',
          instructor_name: v.instructor_name,
          date: v.date,
          time_slot: v.time_slot,
          total: v.ids.length,
          ids: v.ids,
          alunos: v.alunos,
        })
      }
    }

    // Group by aluno+date+time_slot
    const mapAluno = new Map<string, { ids: string[]; student_name: string; date: string; time_slot: string }>()
    for (const row of allActive) {
      const key = `${row.student_name}|${row.date}|${row.time_slot}`
      if (!mapAluno.has(key)) {
        mapAluno.set(key, { ids: [], student_name: row.student_name, date: row.date, time_slot: row.time_slot })
      }
      mapAluno.get(key)!.ids.push(row.id)
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
  await supabase
    .from('agendamentos')
    .update({ status: 'cancelled' })
    .eq('id', idParaCancelar)
    .eq('autoescola_id', autoescola_id)
}
