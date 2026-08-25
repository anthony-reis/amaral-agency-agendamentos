'use server'

import { createServiceClient } from '@/lib/supabase/server'

export interface ResultadoExameRow {
  id: string
  date: string
  time_slot: string
  student_name: string
  student_document: string | null
  student_phone: string | null
  instructor_name: string | null
  categoria: string | null
  status: string
  resultado_exame: 'aprovado' | 'reprovado' | null
}

export type ResultadoFiltro = 'TODOS' | 'aprovado' | 'reprovado' | 'pendente'

export async function listarResultadosExame(
  autoescola_id: string,
  filtro?: { resultado?: ResultadoFiltro; categoria?: string; dateStart?: string; dateEnd?: string; aluno?: string }
): Promise<ResultadoExameRow[]> {
  const supabase = createServiceClient()

  let query = supabase
    .from('agendamentos')
    .select('id, date, time_slot, student_name, student_document, cpf_cnh, instructor_name, instructorCategory, status, resultado_exame')
    .eq('autoescola_id', autoescola_id)
    .eq('tipo', 'banca')
    // Uma banca com resultado já marcado sempre aparece, mesmo se o
    // agendamento tiver sido cancelado depois — o resultado é o que importa
    // pra revenda. Só escondemos canceladas SEM resultado (nunca aconteceram).
    .or('resultado_exame.not.is.null,status.neq.cancelled')
    .order('date', { ascending: false })
    .order('time_slot', { ascending: false })

  if (filtro?.categoria) query = query.eq('instructorCategory', filtro.categoria)
  if (filtro?.dateStart) query = query.gte('date', filtro.dateStart)
  if (filtro?.dateEnd) query = query.lte('date', filtro.dateEnd)
  if (filtro?.resultado === 'aprovado' || filtro?.resultado === 'reprovado') {
    query = query.eq('resultado_exame', filtro.resultado)
  } else if (filtro?.resultado === 'pendente') {
    query = query.is('resultado_exame', null)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)

  const studentDocs = Array.from(
    new Set((data ?? []).map((r) => r.cpf_cnh ?? r.student_document).filter((d): d is string => !!d))
  )
  const { data: students } = studentDocs.length
    ? await supabase.from('students').select('document_id, phone').eq('autoescola_id', autoescola_id).in('document_id', studentDocs)
    : { data: [] }
  const phoneMap = new Map((students ?? []).map((s) => [s.document_id, s.phone]))

  let rows: ResultadoExameRow[] = (data ?? []).map((r) => ({
    id: r.id,
    date: r.date,
    time_slot: r.time_slot,
    student_name: r.student_name,
    student_document: r.cpf_cnh ?? r.student_document,
    student_phone: phoneMap.get(r.cpf_cnh ?? r.student_document ?? '') ?? null,
    instructor_name: r.instructor_name,
    categoria: r.instructorCategory,
    status: r.status,
    resultado_exame: r.resultado_exame as 'aprovado' | 'reprovado' | null,
  }))

  if (filtro?.aluno) {
    const termo = filtro.aluno.toLowerCase()
    rows = rows.filter(
      (r) => r.student_name.toLowerCase().includes(termo) || (r.student_document ?? '').includes(termo)
    )
  }

  return rows
}
