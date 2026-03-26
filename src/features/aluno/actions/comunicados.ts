'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'
import type { Comunicado } from '@/features/painel/types'

export async function buscarComunicadosNaoLidos(
  autoescola_id: string,
  student_document: string
): Promise<Comunicado[]> {
  const supabase = createServiceClient()

  const { data: comunicados } = await supabase
    .from('comunicados')
    .select('*')
    .eq('autoescola_id', autoescola_id)
    .order('created_at', { ascending: true })

  if (!comunicados || comunicados.length === 0) return []

  const ids = comunicados.map((c) => c.id)

  const { data: lidos } = await supabase
    .from('comunicados_lidos')
    .select('comunicado_id')
    .eq('student_document', student_document)
    .in('comunicado_id', ids)

  const lidosSet = new Set((lidos ?? []).map((r) => r.comunicado_id))

  return comunicados.filter((c) => !lidosSet.has(c.id))
}

export async function marcarComunicadoComoLido(
  comunicado_id: string,
  autoescola_id: string,
  student_document: string,
  escola: string
): Promise<void> {
  const supabase = createServiceClient()

  await supabase.from('comunicados_lidos').upsert(
    { comunicado_id, autoescola_id, student_document },
    { onConflict: 'comunicado_id,student_document', ignoreDuplicates: true }
  )

  revalidatePath(`/${escola}/aluno`, 'layout')
}

export async function buscarTodosComunicados(
  autoescola_id: string,
  student_document: string
): Promise<(Comunicado & { lido: boolean })[]> {
  const supabase = createServiceClient()

  const { data: comunicados } = await supabase
    .from('comunicados')
    .select('*')
    .eq('autoescola_id', autoescola_id)
    .order('created_at', { ascending: false })

  if (!comunicados || comunicados.length === 0) return []

  const ids = comunicados.map((c) => c.id)

  const { data: lidos } = await supabase
    .from('comunicados_lidos')
    .select('comunicado_id')
    .eq('student_document', student_document)
    .in('comunicado_id', ids)

  const lidosSet = new Set((lidos ?? []).map((r) => r.comunicado_id))

  return comunicados.map((c) => ({ ...c, lido: lidosSet.has(c.id) }))
}
