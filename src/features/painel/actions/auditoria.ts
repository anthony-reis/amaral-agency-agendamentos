'use server'

import { createServiceClient } from '@/lib/supabase/server'
import type { LogAtividade, LogStats } from '../types'

export interface AuditoriaFilter {
  autoescola_id: string
  dateStart?: string
  dateEnd?: string
  username?: string
  action_type?: string
  search?: string
  limit?: number
  offset?: number
}

export async function listarLogs(
  filter: AuditoriaFilter
): Promise<{ data: LogAtividade[]; total: number }> {
  const supabase = createServiceClient()
  const limit = filter.limit ?? 30
  const offset = filter.offset ?? 0

  let query = supabase
    .from('activity_logs_painel')
    .select('*', { count: 'exact' })
    .eq('autoescola_id', filter.autoescola_id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (filter.dateStart) query = query.gte('created_at', `${filter.dateStart}T00:00:00`)
  if (filter.dateEnd) query = query.lte('created_at', `${filter.dateEnd}T23:59:59`)
  if (filter.username && filter.username !== 'TODOS') query = query.eq('username', filter.username)
  if (filter.action_type && filter.action_type !== 'TODAS') query = query.eq('action_type', filter.action_type)
  if (filter.search) query = query.ilike('description', `%${filter.search}%`)

  const { data, error, count } = await query
  if (error) throw new Error(error.message)
  return { data: (data ?? []) as LogAtividade[], total: count ?? 0 }
}

export async function getLogStats(
  autoescola_id: string,
  dateStart: string,
  dateEnd: string
): Promise<LogStats> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('activity_logs_painel')
    .select('action_type')
    .eq('autoescola_id', autoescola_id)
    .gte('created_at', `${dateStart}T00:00:00`)
    .lte('created_at', `${dateEnd}T23:59:59`)

  if (error) throw new Error(error.message)

  const rows = data ?? []
  return {
    total: rows.length,
    logins: rows.filter((r) => r.action_type === 'login').length,
    usuarios: rows.filter((r) => r.action_type === 'usuarios' || r.action_type === 'usuario').length,
    agendamentos: rows.filter((r) => r.action_type === 'agendamento' || r.action_type === 'agendamentos').length,
    creditos: rows.filter((r) => r.action_type === 'creditos' || r.action_type === 'credito').length,
    alunos: rows.filter((r) => r.action_type === 'aluno' || r.action_type === 'alunos').length,
    bloqueios: rows.filter((r) => r.action_type === 'bloqueio' || r.action_type === 'bloqueios').length,
  }
}

export async function listarUsuariosPainel(autoescola_id: string): Promise<string[]> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('activity_logs_painel')
    .select('username')
    .eq('autoescola_id', autoescola_id)

  const unique = [...new Set((data ?? []).map((r) => r.username))]
  return unique.sort()
}
