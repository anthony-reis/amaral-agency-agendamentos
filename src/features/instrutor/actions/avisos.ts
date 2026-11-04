'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { getInstructorSession } from './authInstrutor'
import type { TipoAviso } from '@/lib/tiposAviso'

function filtroValidade(): string {
  const h20 = new Date(Date.now() - 20 * 3600_000).toISOString()
  return `tipo.neq.lembrete_dia,and(tipo.eq.lembrete_dia,created_at.gte.${h20})`
}

export interface AvisoInstrutor {
  id: string
  tipo: TipoAviso
  titulo: string
  mensagem: string
  created_at: string
}

/** Avisos não vistos do instrutor logado (identificado pela sessão, nunca pelo cliente). */
export async function buscarMeusAvisosInstrutor(escola: string): Promise<AvisoInstrutor[]> {
  const session = await getInstructorSession(escola)
  if (!session) return []
  const { data, error } = await createServiceClient()
    .from('avisos_instrutor')
    .select('id, tipo, titulo, mensagem, created_at')
    .eq('autoescola_id', session.autoescola_id)
    .eq('instructor_id', session.instructorId)
    .is('lido_em', null)
    .or(filtroValidade())
    .order('created_at', { ascending: true })
    .limit(10)
  if (error) return []
  return (data ?? []) as AvisoInstrutor[]
}

export async function marcarAvisosInstrutorLidos(escola: string, ids: string[]): Promise<void> {
  const session = await getInstructorSession(escola)
  if (!session || ids.length === 0) return
  await createServiceClient()
    .from('avisos_instrutor')
    .update({ lido_em: new Date().toISOString() })
    .eq('autoescola_id', session.autoescola_id)
    .eq('instructor_id', session.instructorId)
    .in('id', ids)
    .is('lido_em', null)
}
