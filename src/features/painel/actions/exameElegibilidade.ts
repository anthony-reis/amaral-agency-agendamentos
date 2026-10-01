'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { palavrasLegadoPara, campoCreditoPorCodigo } from '@/lib/getDisponibilidadePorCodigo'
import { listarCategorias } from '@/features/admin/actions/categorias'
import { AULAS_MINIMAS_PARA_EXAME } from '@/lib/examConstants'
import type { CodigoCNH } from '@/features/admin/categorias-config'

export async function contarAulasConcluidasPorCategoria(
  autoescola_id: string,
  document_id: string,
  categoria_codigo: string
): Promise<number> {
  if (!document_id) return 0
  const supabase = createServiceClient()
  const palavras = palavrasLegadoPara(categoria_codigo as CodigoCNH)

  const { count } = await supabase
    .from('agendamentos')
    .select('id', { count: 'exact', head: true })
    .eq('autoescola_id', autoescola_id)
    .eq('cpf_cnh', document_id)
    .eq('status', 'completed')
    .eq('tipo', 'aula')
    .in('instructorCategory', palavras)

  return count ?? 0
}

export async function getSituacaoCreditosCategoria(
  student_id: string,
  categoria_codigo: string
): Promise<number> {
  const supabase = createServiceClient()
  const campo = campoCreditoPorCodigo(categoria_codigo as CodigoCNH)
  const { data } = await supabase
    .from('student_credits')
    .select(campo)
    .eq('student_id', student_id)
    .maybeSingle()

  if (!data) return 0
  return (data as unknown as Record<string, number>)[campo] ?? 0
}

export interface CategoriaElegivelExame {
  codigo: string
  nome: string
  elegivel: boolean
  aulasConcluidas: number
}

/**
 * Categorias configuradas na autoescola, com elegibilidade calculada pra
 * solicitar/agendar exame (>= AULAS_MINIMAS_PARA_EXAME concluídas naquela
 * categoria). Compartilhado entre o fluxo de solicitação do aluno e o
 * agendamento direto pelo painel.
 */
export async function listarCategoriasElegiveisExame(
  autoescola_id: string,
  document_id: string
): Promise<CategoriaElegivelExame[]> {
  const categorias = await listarCategorias(autoescola_id)

  return Promise.all(
    categorias.map(async (c) => {
      const aulasConcluidas = await contarAulasConcluidasPorCategoria(autoescola_id, document_id, c.codigo)
      return {
        codigo: c.codigo,
        nome: c.nome,
        elegivel: aulasConcluidas >= AULAS_MINIMAS_PARA_EXAME,
        aulasConcluidas,
      }
    })
  )
}
