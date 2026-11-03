'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { bloqueioArea } from '@/lib/permissoes.server'
import { aulasFuturasDoAluno } from '@/lib/aulasFuturas.server'
import type { AulaFutura } from '@/lib/vinculoInstrutor'
import { getPainelAutoescolaId } from './authPainel'
import type { ActionResult } from '../types'

/** Aulas agendadas de hoje em diante do aluno (aba Dados: vínculo com instrutor). */
export async function getAulasFuturasAluno(autoescola_id: string, student_id: string): Promise<ActionResult<AulaFutura[]>> {
  const erro = await bloqueioArea('cadastros', 'ver')
  if (erro) return { success: false, error: erro }
  if ((await getPainelAutoescolaId()) !== autoescola_id) return { success: false, error: 'Sessão inválida.' }

  const supabase = createServiceClient()
  const { data: aluno } = await supabase.from('students').select('document_id').eq('id', student_id).eq('autoescola_id', autoescola_id).maybeSingle()
  if (!aluno) return { success: false, error: 'Aluno não encontrado.' }
  return { success: true, data: await aulasFuturasDoAluno(supabase, autoescola_id, aluno.document_id) }
}
