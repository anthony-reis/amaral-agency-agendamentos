'use server'

import { createServiceClient } from '@/lib/supabase/server'

export interface AlunoStats {
  aulasConcluidas: number
  tentativasExame: number
  faltas: number
  kmTotal: number
}

const AGENDAMENTO_COLS = 'id, date, time_slot, instructor_name, instructorCategory, status, tipo, km_rodado'

// Agendamentos vinculam ao aluno por CPF/CNH (TEXT), não por FK — precisa
// consultar tanto `student_document` quanto `cpf_cnh` e deduplicar por id
// (mesma convenção usada em minhas-aulas/page.tsx).
function dedupPorId<T extends { id: string }>(a: T[], b: T[]): T[] {
  return Array.from(new Map([...a, ...b].map((x) => [x.id, x])).values())
}

export async function getAlunoStats(autoescola_id: string, documentId: string): Promise<AlunoStats> {
  const supabase = createServiceClient()

  const [{ data: byDoc }, { data: byCpf }] = await Promise.all([
    supabase
      .from('agendamentos')
      .select(AGENDAMENTO_COLS)
      .eq('autoescola_id', autoescola_id)
      .eq('student_document', documentId)
      .neq('status', 'cancelled'),
    supabase
      .from('agendamentos')
      .select(AGENDAMENTO_COLS)
      .eq('autoescola_id', autoescola_id)
      .eq('cpf_cnh', documentId)
      .neq('status', 'cancelled'),
  ])

  const agendamentos = dedupPorId(byDoc ?? [], byCpf ?? [])

  let aulasConcluidas = 0
  let tentativasExame = 0
  let faltas = 0
  let kmTotal = 0

  for (const a of agendamentos) {
    const tipo = (a.tipo as 'aula' | 'banca' | null) ?? 'aula'
    if (a.status === 'completed') {
      if (tipo === 'banca') tentativasExame++
      else aulasConcluidas++
      kmTotal += a.km_rodado ?? 0
    } else if (a.status === 'absent') {
      faltas++
    }
  }

  return { aulasConcluidas, tentativasExame, faltas, kmTotal }
}

export interface AulaCalendario {
  id: string
  date: string
  time_slot: string
  status: string
  tipo: 'aula' | 'banca'
  instructor_name: string | null
  instructorCategory: string | null
}

export async function getAgendamentosMes(
  autoescola_id: string,
  documentId: string,
  ano: number,
  mes: number
): Promise<AulaCalendario[]> {
  const dateStart = `${ano}-${String(mes).padStart(2, '0')}-01`
  const lastDay = new Date(ano, mes, 0).getDate()
  const dateEnd = `${ano}-${String(mes).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  const supabase = createServiceClient()

  const [{ data: byDoc }, { data: byCpf }] = await Promise.all([
    supabase
      .from('agendamentos')
      .select(AGENDAMENTO_COLS)
      .eq('autoescola_id', autoescola_id)
      .eq('student_document', documentId)
      .neq('status', 'cancelled')
      .gte('date', dateStart)
      .lte('date', dateEnd),
    supabase
      .from('agendamentos')
      .select(AGENDAMENTO_COLS)
      .eq('autoescola_id', autoescola_id)
      .eq('cpf_cnh', documentId)
      .neq('status', 'cancelled')
      .gte('date', dateStart)
      .lte('date', dateEnd),
  ])

  const agendamentos = dedupPorId(byDoc ?? [], byCpf ?? [])

  return agendamentos
    .map((a) => ({
      id: a.id,
      date: a.date,
      time_slot: a.time_slot,
      status: a.status,
      tipo: ((a.tipo as 'aula' | 'banca' | null) ?? 'aula') as 'aula' | 'banca',
      instructor_name: a.instructor_name,
      instructorCategory: a.instructorCategory,
    }))
    .sort((a, b) => a.date.localeCompare(b.date) || a.time_slot.localeCompare(b.time_slot))
}
