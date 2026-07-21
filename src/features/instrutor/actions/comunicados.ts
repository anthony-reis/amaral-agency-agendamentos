'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'
import type { Comunicado } from '@/features/painel/types'

export async function buscarComunicadosNaoLidosInstrutor(
  autoescola_id: string,
  instructor_id: string
): Promise<Comunicado[]> {
  const supabase = createServiceClient()

  const { data: comunicados } = await supabase
    .from('comunicados')
    .select('*')
    .eq('autoescola_id', autoescola_id)
    .in('publico', ['instrutores', 'ambos'])
    .order('created_at', { ascending: true })

  if (!comunicados || comunicados.length === 0) return []

  const ids = comunicados.map((c) => c.id)

  const { data: lidos } = await supabase
    .from('comunicados_lidos_instrutor')
    .select('comunicado_id')
    .eq('instructor_id', instructor_id)
    .in('comunicado_id', ids)

  const lidosSet = new Set((lidos ?? []).map((r) => r.comunicado_id))

  return comunicados.filter((c) => !lidosSet.has(c.id))
}

export async function marcarComunicadoComoLidoInstrutor(
  comunicado_id: string,
  autoescola_id: string,
  instructor_id: string,
  escola: string
): Promise<void> {
  const supabase = createServiceClient()

  await supabase.from('comunicados_lidos_instrutor').upsert(
    { comunicado_id, autoescola_id, instructor_id },
    { onConflict: 'comunicado_id,instructor_id', ignoreDuplicates: true }
  )

  revalidatePath(`/${escola}/instrutor`, 'layout')
}

export async function buscarTodosComunicadosInstrutor(
  autoescola_id: string,
  instructor_id: string
): Promise<(Comunicado & { lido: boolean })[]> {
  const supabase = createServiceClient()

  const { data: comunicados } = await supabase
    .from('comunicados')
    .select('*')
    .eq('autoescola_id', autoescola_id)
    .in('publico', ['instrutores', 'ambos'])
    .order('created_at', { ascending: false })

  if (!comunicados || comunicados.length === 0) return []

  const ids = comunicados.map((c) => c.id)

  const { data: lidos } = await supabase
    .from('comunicados_lidos_instrutor')
    .select('comunicado_id')
    .eq('instructor_id', instructor_id)
    .in('comunicado_id', ids)

  const lidosSet = new Set((lidos ?? []).map((r) => r.comunicado_id))

  return comunicados.map((c) => ({ ...c, lido: lidosSet.has(c.id) }))
}
