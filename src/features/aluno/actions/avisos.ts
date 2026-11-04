'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'
import type { TipoAviso } from '@/lib/tiposAviso'

/** Lembretes perdem o sentido com o tempo: não mostra "daqui a pouco" horas depois. */
function filtroValidade(): string {
  const h = (n: number) => new Date(Date.now() - n * 3600_000).toISOString()
  return `tipo.not.in.(lembrete_hora,lembrete_dia),and(tipo.eq.lembrete_hora,created_at.gte.${h(3)}),and(tipo.eq.lembrete_dia,created_at.gte.${h(20)})`
}

export interface AvisoAluno {
  id: string
  tipo: TipoAviso
  titulo: string
  mensagem: string
  created_at: string
}

/** Avisos ainda não vistos do aluno logado (aula desmarcada/remarcada pela escola). */
export async function buscarAvisosNaoLidos(autoescola_id: string, student_id: string): Promise<AvisoAluno[]> {
  const { data, error } = await createServiceClient()
    .from('avisos_aluno')
    .select('id, tipo, titulo, mensagem, created_at')
    .eq('autoescola_id', autoescola_id)
    .eq('student_id', student_id)
    .is('lido_em', null)
    .or(filtroValidade())
    .order('created_at', { ascending: false })
    .limit(10)
  // Tabela ainda não criada (migration pendente) ou erro: simplesmente sem avisos
  if (error) return []
  return (data ?? []) as AvisoAluno[]
}

export async function marcarAvisosComoLidos(ids: string[], escola: string): Promise<void> {
  // O aluno vem do cookie, nunca do cliente
  const studentId = (await cookies()).get('student_id')?.value
  if (!studentId || ids.length === 0) return
  await createServiceClient()
    .from('avisos_aluno')
    .update({ lido_em: new Date().toISOString() })
    .eq('student_id', studentId)
    .in('id', ids)
    .is('lido_em', null)
  revalidatePath(`/${escola}/aluno`, 'layout')
}

/** Avisos não vistos do aluno logado (identificado só pelo cookie). */
export async function buscarMeusAvisos(): Promise<AvisoAluno[]> {
  const studentId = (await cookies()).get('student_id')?.value
  if (!studentId) return []
  const { data, error } = await createServiceClient()
    .from('avisos_aluno')
    .select('id, tipo, titulo, mensagem, created_at')
    .eq('student_id', studentId)
    .is('lido_em', null)
    .or(filtroValidade())
    .order('created_at', { ascending: true })
    .limit(10)
  if (error) return []
  return (data ?? []) as AvisoAluno[]
}
