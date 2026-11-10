import 'server-only'

import { createServiceClient } from '@/lib/supabase/server'
import { normalizarModalidade, rotuloModalidade, type Modalidade } from '@/lib/vinculoInstrutor'

export type VinculosDoAluno = Partial<Record<Modalidade, { id: string; name: string }>>

/**
 * Instrutor vinculado ao aluno em cada modalidade (Carro/Moto). Vazio quando a
 * opção está desligada na autoescola (aba Sistema) ou o aluno não tem vínculo.
 */
export async function vinculosDoAluno(autoescola_id: string, studentId: string | null | undefined): Promise<VinculosDoAluno> {
  if (!studentId) return {}
  const supabase = createServiceClient()

  const { data: escola } = await supabase
    .from('autoescolas')
    .select('vincular_aluno_instrutor')
    .eq('id', autoescola_id)
    .maybeSingle()
  if (escola?.vincular_aluno_instrutor !== true) return {}

  const { data } = await supabase
    .from('aluno_instrutores')
    .select('categoria, instrutor:instructors(id, name)')
    .eq('student_id', studentId)
    .eq('autoescola_id', autoescola_id)

  const vinculos: VinculosDoAluno = {}
  for (const row of data ?? []) {
    const instrutor = (Array.isArray(row.instrutor) ? row.instrutor[0] : row.instrutor) as { id: string; name: string } | null
    const m = normalizarModalidade(row.categoria)
    if (m && instrutor) vinculos[m] = instrutor
  }
  return vinculos
}

/** Instrutor vinculado na modalidade da aula, ou null quando não há restrição. */
export async function instrutorVinculadoDoAluno(
  autoescola_id: string,
  studentId: string | null | undefined,
  categoria: string | null | undefined
): Promise<{ id: string; name: string } | null> {
  const m = normalizarModalidade(categoria)
  if (!m) return null
  return (await vinculosDoAluno(autoescola_id, studentId))[m] ?? null
}

/** Mensagem de erro se o aluno é vinculado a outro instrutor nesta modalidade, ou null se liberado. */
export async function bloqueioInstrutorVinculado(
  autoescola_id: string,
  studentId: string | null | undefined,
  instructorName: string,
  categoria: string | null | undefined
): Promise<string | null> {
  const vinculado = await instrutorVinculadoDoAluno(autoescola_id, studentId, categoria)
  if (!vinculado || vinculado.name === instructorName) return null
  const m = normalizarModalidade(categoria)
  return `Nas aulas de ${m ? rotuloModalidade(m) : 'esta modalidade'} você faz suas aulas com o instrutor ${vinculado.name}. Não é possível agendar ou remarcar com outro instrutor.`
}
