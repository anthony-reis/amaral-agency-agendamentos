import 'server-only'

import type { createServiceClient } from '@/lib/supabase/server'
import { normalizarModalidade, type AulaFutura, type TotalInstrutor } from '@/lib/vinculoInstrutor'

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

/**
 * Com quem o aluno tem aulas, por modalidade: concluídas + agendadas/confirmadas
 * (canceladas e faltas não contam). Base da sugestão "quem mais tem aulas".
 */
export async function totaisPorInstrutor(supabase: Supabase, autoescola_id: string, document_id: string): Promise<TotalInstrutor[]> {
  const { data } = await supabase
    .from('agendamentos')
    .select('date, instructor_name, instructorCategory, status')
    .eq('autoescola_id', autoescola_id)
    .in('status', ['completed', ...STATUS_ATIVOS])
    .or(`student_document.eq.${document_id},cpf_cnh.eq.${document_id}`)
    .limit(2000)

  const hoje = hojeBRT()
  const mapa = new Map<string, TotalInstrutor>()
  for (const a of data ?? []) {
    const categoria = normalizarModalidade(a.instructorCategory)
    if (!categoria || !a.instructor_name) continue
    const chave = `${categoria}|${a.instructor_name}`
    const t = mapa.get(chave) ?? { categoria, instrutor: a.instructor_name, qtd: 0, concluidas: 0, futuras: 0, proxima: null }
    t.qtd += 1
    if (a.status === 'completed') t.concluidas += 1
    else if (a.date >= hoje) {
      t.futuras += 1
      if (!t.proxima || a.date < t.proxima) t.proxima = a.date
    }
    mapa.set(chave, t)
  }
  return [...mapa.values()]
}
