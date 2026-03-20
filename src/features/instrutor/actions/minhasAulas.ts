'use server'

import { createServiceClient } from '@/lib/supabase/server'
import type { ActionResult } from '@/features/painel/types'

export interface AulaInstrutor {
  id: string
  date: string
  time_slot: string
  student_name: string
  student_document: string | null
  cpf_cnh: string | null
  instructorCategory: string | null
  status: string
  notes: string | null
  autoescola_id: string
  creditos_usados: number | null
  creditos_total: number | null
}

export interface DiaSemana {
  date: string
  label: string // e.g. "SEG", "TER"
  dayNum: number
  total: number
  pendentes: number
}

export async function getMinhasAulasHoje(
  instructor_name: string,
  autoescola_id: string,
  date?: string
): Promise<AulaInstrutor[]> {
  const supabase = createServiceClient()
  const targetDate = date ?? new Date().toISOString().split('T')[0]

  const { data } = await supabase
    .from('agendamentos')
    .select('id, date, time_slot, student_name, student_document, cpf_cnh, instructorCategory, status, notes, autoescola_id')
    .eq('autoescola_id', autoescola_id)
    .eq('instructor_name', instructor_name)
    .eq('date', targetDate)
    .neq('status', 'cancelled')
    .order('time_slot')

  if (!data) return []

  // Busca créditos dos alunos
  const documentos = data
    .map((a) => a.cpf_cnh ?? a.student_document)
    .filter(Boolean) as string[]

  const { data: students } = documentos.length
    ? await supabase
        .from('students')
        .select('id, document_id')
        .in('document_id', documentos)
        .eq('autoescola_id', autoescola_id)
    : { data: [] }

  const studentIds = (students ?? []).map((s) => s.id)

  const { data: creditos } = studentIds.length
    ? await supabase
        .from('student_credits')
        .select('student_id, aulas_disponiveis, aulas_cat_a, aulas_cat_b, aulas_cat_c, aulas_cat_d, aulas_cat_e')
        .in('student_id', studentIds)
    : { data: [] }

  const creditoMap = new Map<string, { disponiveis: number; total: number }>(
    (creditos ?? []).map((c) => [
      c.student_id,
      {
        disponiveis: c.aulas_disponiveis ?? 0,
        total:
          (c.aulas_cat_a ?? 0) +
          (c.aulas_cat_b ?? 0) +
          (c.aulas_cat_c ?? 0) +
          (c.aulas_cat_d ?? 0) +
          (c.aulas_cat_e ?? 0),
      },
    ])
  )

  const studentDocMap = new Map<string, string>(
    (students ?? []).map((s) => [s.document_id, s.id])
  )

  return data.map((a) => {
    const doc = a.cpf_cnh ?? a.student_document
    const studentId = doc ? studentDocMap.get(doc) : undefined
    const cred = studentId ? creditoMap.get(studentId) : undefined
    return {
      ...a,
      creditos_usados: cred ? cred.total - cred.disponiveis : null,
      creditos_total: cred ? cred.total : null,
    }
  })
}

export async function getMapaSemanal(
  instructor_name: string,
  autoescola_id: string,
  weekStartDate?: string
): Promise<DiaSemana[]> {
  const supabase = createServiceClient()

  // Se weekStartDate fornecido, usa ele; senão calcula a segunda-feira da semana atual
  const start = weekStartDate
    ? new Date(weekStartDate + 'T12:00:00')
    : (() => {
        const today = new Date()
        const day = today.getDay()
        const diff = day === 0 ? -6 : 1 - day
        const monday = new Date(today)
        monday.setDate(today.getDate() + diff)
        return monday
      })()

  const dates: string[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    dates.push(d.toISOString().split('T')[0])
  }

  const { data } = await supabase
    .from('agendamentos')
    .select('date, status')
    .eq('autoescola_id', autoescola_id)
    .eq('instructor_name', instructor_name)
    .gte('date', dates[0])
    .lte('date', dates[6])
    .neq('status', 'cancelled')

  const countMap = new Map<string, { total: number; pendentes: number }>()
  for (const row of data ?? []) {
    const entry = countMap.get(row.date) ?? { total: 0, pendentes: 0 }
    entry.total++
    if (row.status === 'scheduled') entry.pendentes++
    countMap.set(row.date, entry)
  }

  const DIAS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB']

  return dates.map((date) => {
    const d = new Date(date + 'T12:00:00')
    const counts = countMap.get(date) ?? { total: 0, pendentes: 0 }
    return {
      date,
      label: DIAS[d.getDay()],
      dayNum: d.getDate(),
      total: counts.total,
      pendentes: counts.pendentes,
    }
  })
}

export async function atualizarStatusAula(
  agendamento_id: string,
  status: 'completed' | 'absent' | 'cancelled',
  instructor_name: string,
  autoescola_id: string
): Promise<ActionResult> {
  const supabase = createServiceClient()

  const { error } = await supabase
    .from('agendamentos')
    .update({ status })
    .eq('id', agendamento_id)
    .eq('autoescola_id', autoescola_id)

  if (error) return { success: false, error: error.message }

  const actionLabels: Record<string, string> = {
    completed: 'finalizou a aula',
    absent: 'registrou falta',
    cancelled: 'desmarcou a aula',
  }

  await supabase.from('activity_logs_painel').insert({
    username: instructor_name,
    action_type: 'agendamento',
    description: `Instrutor ${instructor_name} ${actionLabels[status] ?? 'atualizou'} (agendamento ${agendamento_id})`,
    autoescola_id,
  })

  return { success: true, data: undefined }
}
