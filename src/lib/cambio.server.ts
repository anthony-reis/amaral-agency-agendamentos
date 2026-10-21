import 'server-only'

import { createServiceClient } from '@/lib/supabase/server'
import { autoescolaTemFeature } from '@/lib/features.server'
import { parseCambio, labelCambio, type Cambio } from '@/lib/cambio'

/**
 * Câmbio que restringe os instrutores de carro para este aluno, ou null quando
 * não há restrição (módulo desligado, categoria MOTO ou aluno sem câmbio definido).
 */
export async function cambioDoAluno(
  autoescola_id: string,
  studentId: string | null | undefined,
  category: string
): Promise<Cambio | null> {
  if (!studentId || category.toUpperCase() !== 'CARRO') return null
  if (!(await autoescolaTemFeature(autoescola_id, 'separar_cambio'))) return null

  const supabase = createServiceClient()
  const { data } = await supabase
    .from('students')
    .select('cambio')
    .eq('id', studentId)
    .eq('autoescola_id', autoescola_id)
    .maybeSingle()
  return parseCambio(data?.cambio)
}

/** Mensagem de erro se o instrutor não atende o câmbio do aluno, ou null se liberado. */
export async function bloqueioCambio(
  autoescola_id: string,
  studentId: string | null | undefined,
  category: string,
  instructorName: string
): Promise<string | null> {
  const cambio = await cambioDoAluno(autoescola_id, studentId, category)
  if (!cambio) return null

  const supabase = createServiceClient()
  const { data } = await supabase
    .from('instructors')
    .select('cambio')
    .eq('autoescola_id', autoescola_id)
    .eq('name', instructorName)
    .maybeSingle()
  const instrutor = parseCambio(data?.cambio)
  if (instrutor && instrutor !== cambio) {
    return `Este aluno faz aulas com carro ${labelCambio(cambio).toLowerCase()}. ${instructorName} é de carro ${labelCambio(instrutor).toLowerCase()}.`
  }
  return null
}
