'use server'

import { createServiceClient } from '@/lib/supabase/server'

export interface AlunoStats {
  aulasConcluidas: number
  tentativasExame: number
  faltas: number
  kmTotal: number
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

export interface DashboardAluno {
  stats: AlunoStats
  aulas: AulaCalendario[]
  ano: number
  mes: number
}

/**
 * Estatísticas + aulas do mês numa única chamada ao Postgres (função aluno_dashboard).
 * Antes eram 4 consultas (2 por action) e 2 invocações a cada abertura do /aluno.
 */
export async function getDashboardAluno(
  autoescola_id: string,
  documentId: string,
  ano: number,
  mes: number
): Promise<DashboardAluno> {
  const { data, error } = await createServiceClient().rpc('aluno_dashboard', {
    p_autoescola_id: autoescola_id,
    p_doc: documentId,
    p_ano: ano,
    p_mes: mes,
  })
  if (error) throw new Error(error.message)
  const r = (data ?? {}) as { stats?: Partial<AlunoStats>; aulas?: AulaCalendario[] }
  return {
    stats: {
      aulasConcluidas: r.stats?.aulasConcluidas ?? 0,
      tentativasExame: r.stats?.tentativasExame ?? 0,
      faltas: r.stats?.faltas ?? 0,
      kmTotal: r.stats?.kmTotal ?? 0,
    },
    aulas: r.aulas ?? [],
    ano,
    mes,
  }
}

export async function getAlunoStats(autoescola_id: string, documentId: string): Promise<AlunoStats> {
  const hoje = new Date()
  return (await getDashboardAluno(autoescola_id, documentId, hoje.getFullYear(), hoje.getMonth() + 1)).stats
}

export async function getAgendamentosMes(
  autoescola_id: string,
  documentId: string,
  ano: number,
  mes: number
): Promise<AulaCalendario[]> {
  return (await getDashboardAluno(autoescola_id, documentId, ano, mes)).aulas
}
