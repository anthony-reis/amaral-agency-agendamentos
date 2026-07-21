'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { assertPodeEditar } from './authPainel'

export interface InstructorConfig {
  pode_dar_falta: boolean
  pode_desmarcar: boolean
  pode_finalizar: boolean
  mostrar_telefone: boolean
  registrar_km: boolean
}

const DEFAULT_CONFIG: InstructorConfig = {
  pode_dar_falta: true,
  pode_desmarcar: true,
  pode_finalizar: true,
  mostrar_telefone: true,
  registrar_km: false,
}

const DEFAULT_REAGENDAMENTO_MIN_HORAS = 2

export async function getInstructorConfig(autoescola_id: string): Promise<InstructorConfig> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('autoescolas')
    .select('instructor_config')
    .eq('id', autoescola_id)
    .single()

  if (!data?.instructor_config) return DEFAULT_CONFIG
  return { ...DEFAULT_CONFIG, ...(data.instructor_config as Partial<InstructorConfig>) }
}

export async function getReagendamentoMinHoras(autoescola_id: string): Promise<number> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('autoescolas')
    .select('reagendamento_min_horas')
    .eq('id', autoescola_id)
    .single()

  return data?.reagendamento_min_horas ?? DEFAULT_REAGENDAMENTO_MIN_HORAS
}

export async function salvarInstructorConfig(
  autoescola_id: string,
  config: InstructorConfig,
  escola: string
): Promise<{ success: boolean; error?: string }> {
  const guard = await assertPodeEditar()
  if (!guard.ok) return { success: false, error: guard.error }

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('autoescolas')
    .update({ instructor_config: config })
    .eq('id', autoescola_id)

  if (error) return { success: false, error: error.message }

  revalidatePath(`/${escola}/painel/configuracoes`)
  revalidatePath(`/${escola}/instrutor`)
  return { success: true }
}

export async function salvarReagendamentoMinHoras(
  autoescola_id: string,
  horas: number,
  escola: string
): Promise<{ success: boolean; error?: string }> {
  const guard = await assertPodeEditar()
  if (!guard.ok) return { success: false, error: guard.error }

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('autoescolas')
    .update({ reagendamento_min_horas: horas })
    .eq('id', autoescola_id)

  if (error) return { success: false, error: error.message }

  revalidatePath(`/${escola}/painel/configuracoes`)
  revalidatePath(`/${escola}/aluno/minhas-aulas`)
  return { success: true }
}
