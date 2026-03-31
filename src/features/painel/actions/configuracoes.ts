'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface InstructorConfig {
  pode_dar_falta: boolean
  pode_desmarcar: boolean
  pode_finalizar: boolean
  mostrar_telefone: boolean
}

const DEFAULT_CONFIG: InstructorConfig = {
  pode_dar_falta: true,
  pode_desmarcar: true,
  pode_finalizar: true,
  mostrar_telefone: true,
}

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

export async function salvarInstructorConfig(
  autoescola_id: string,
  config: InstructorConfig,
  escola: string
): Promise<{ success: boolean; error?: string }> {
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
