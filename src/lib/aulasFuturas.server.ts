import 'server-only'

import type { createServiceClient } from '@/lib/supabase/server'
import type { AulaFutura } from '@/lib/vinculoInstrutor'

type Supabase = ReturnType<typeof createServiceClient>

const SELECT = 'id, date, time_slot, instructor_name, instructorCategory, status, student_document, cpf_cnh'
const STATUS_ATIVOS = ['scheduled', 'confirmed']

/** Hoje (YYYY-MM-DD) em Brasília. */
export function hojeBRT(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
}

/** Aulas agendadas (não canceladas/concluídas) de hoje em diante do aluno, pelo CPF/CNH. */
export async function aulasFuturasDoAluno(supabase: Supabase, autoescola_id: string, document_id: string): Promise<AulaFutura[]> {
  const { data } = await supabase
    .from('agendamentos')
    .select(SELECT)
    .eq('autoescola_id', autoescola_id)
    .gte('date', hojeBRT())
    .in('status', STATUS_ATIVOS)
    .or(`student_document.eq.${document_id},cpf_cnh.eq.${document_id}`)
    .order('date', { ascending: true })
    .order('time_slot', { ascending: true })
  return (data ?? []).map(({ student_document: _a, cpf_cnh: _b, ...aula }) => aula as AulaFutura)
}

/** Todas as aulas futuras ativas da escola, agrupadas por CPF/CNH do aluno (para a tabela). */
export async function aulasFuturasPorDocumento(supabase: Supabase, autoescola_id: string): Promise<Map<string, AulaFutura[]>> {
  const { data } = await supabase
    .from('agendamentos')
    .select(SELECT)
    .eq('autoescola_id', autoescola_id)
    .gte('date', hojeBRT())
    .in('status', STATUS_ATIVOS)
    .limit(5000)
  const mapa = new Map<string, AulaFutura[]>()
  for (const { student_document, cpf_cnh, ...aula } of data ?? []) {
    const doc = student_document || cpf_cnh
    if (!doc) continue
    mapa.set(doc, [...(mapa.get(doc) ?? []), aula as AulaFutura])
  }
  return mapa
}
