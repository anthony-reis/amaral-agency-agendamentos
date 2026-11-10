'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { bloqueioArea } from '@/lib/permissoes.server'
import { aulasFuturasDoAluno, totaisPorInstrutor } from '@/lib/aulasFuturas.server'
import type { AulaFutura, TotalInstrutor } from '@/lib/vinculoInstrutor'
import { getPainelAutoescolaId } from './authPainel'
import type { ActionResult } from '../types'

export interface DadosVinculoAluno {
  /** Aulas agendadas de hoje em diante. */
  futuras: AulaFutura[]
  /** Aulas por instrutor e modalidade (concluídas + agendadas), base da sugestão. */
  totais: TotalInstrutor[]
}

/** Aulas do aluno para o bloco "Instrutor responsável" (aba Dados). */
export async function getDadosVinculoAluno(autoescola_id: string, student_id: string): Promise<ActionResult<DadosVinculoAluno>> {
  const erro = await bloqueioArea('cadastros', 'ver')
  if (erro) return { success: false, error: erro }
  if ((await getPainelAutoescolaId()) !== autoescola_id) return { success: false, error: 'Sessão inválida.' }

  const supabase = createServiceClient()
  const { data: aluno } = await supabase.from('students').select('document_id').eq('id', student_id).eq('autoescola_id', autoescola_id).maybeSingle()
  if (!aluno) return { success: false, error: 'Aluno não encontrado.' }

  const [futuras, totais] = await Promise.all([
    aulasFuturasDoAluno(supabase, autoescola_id, aluno.document_id),
    totaisPorInstrutor(supabase, autoescola_id, aluno.document_id),
  ])
  return { success: true, data: { futuras, totais } }
}
