import 'server-only'

import type { createServiceClient } from '@/lib/supabase/server'
import type { ExameBancaAgendado } from '@/lib/exameBancaTypes'

/**
 * Próximo exame de banca (agendamento tipo "banca" ainda não realizado nem
 * cancelado) de cada aluno, a partir de `aPartirDe` (YYYY-MM-DD). Usado para
 * sinalizar e proteger as aulas de quem vai fazer exame.
 *
 * Retorna Map<documento, exame>; o documento casa com cpf_cnh ou
 * student_document do agendamento.
 */
export async function buscarExamesBancaAgendados(
  supabase: ReturnType<typeof createServiceClient>,
  autoescola_id: string,
  documentos: string[],
  aPartirDe: string
): Promise<Map<string, ExameBancaAgendado>> {
  const mapa = new Map<string, ExameBancaAgendado>()
  // Documentos vão para um filtro .or() do PostgREST — só dígitos.
  const docs = Array.from(new Set(documentos.filter((d) => /^\d+$/.test(d))))
  if (docs.length === 0) return mapa

  const docList = docs.join(',')
  const { data } = await supabase
    .from('agendamentos')
    .select('date, time_slot, instructor_name, cpf_cnh, student_document')
    .eq('autoescola_id', autoescola_id)
    .eq('tipo', 'banca')
    .in('status', ['scheduled', 'confirmed'])
    .gte('date', aPartirDe)
    .or(`cpf_cnh.in.(${docList}),student_document.in.(${docList})`)
    .order('date', { ascending: true })
    .order('time_slot', { ascending: true })

  for (const row of data ?? []) {
    const exame = { date: row.date, time_slot: row.time_slot, instructor_name: row.instructor_name ?? null }
    for (const doc of [row.cpf_cnh, row.student_document]) {
      if (doc && docs.includes(doc) && !mapa.has(doc)) mapa.set(doc, exame)
    }
  }
  return mapa
}
