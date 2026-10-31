import 'server-only'

import { createServiceClient } from '@/lib/supabase/server'

/**
 * Instrutor ao qual o aluno está vinculado, ou null quando não há restrição:
 * opção desligada na autoescola (aba Sistema) ou aluno sem instrutor vinculado.
 */
export async function instrutorVinculadoDoAluno(
  autoescola_id: string,
  studentId: string | null | undefined
): Promise<{ id: string; name: string } | null> {
  if (!studentId) return null
  const supabase = createServiceClient()

  const { data: escola } = await supabase
    .from('autoescolas')
    .select('vincular_aluno_instrutor')
    .eq('id', autoescola_id)
    .maybeSingle()
  if (escola?.vincular_aluno_instrutor !== true) return null

  const { data: aluno } = await supabase
    .from('students')
    .select('instrutor_id')
    .eq('id', studentId)
    .eq('autoescola_id', autoescola_id)
    .maybeSingle()
  if (!aluno?.instrutor_id) return null

  const { data: instrutor } = await supabase
    .from('instructors')
    .select('id, name')
    .eq('id', aluno.instrutor_id)
    .eq('autoescola_id', autoescola_id)
    .maybeSingle()
  return instrutor ?? null
}

/** Mensagem de erro se o aluno é vinculado a outro instrutor, ou null se liberado. */
export async function bloqueioInstrutorVinculado(
  autoescola_id: string,
  studentId: string | null | undefined,
  instructorName: string
): Promise<string | null> {
  const vinculado = await instrutorVinculadoDoAluno(autoescola_id, studentId)
  if (!vinculado || vinculado.name === instructorName) return null
  return `Você faz suas aulas com o instrutor ${vinculado.name}. Não é possível agendar ou remarcar com outro instrutor.`
}
