'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { normalizarJanela, resumoJanela, validarJanela, type JanelaAgendamento } from '@/lib/janelaAgendamento'
import { assertPodeEditar, getCurrentUsername } from './authPainel'

export interface InstructorConfig {
  pode_dar_falta: boolean
  pode_desmarcar: boolean
  pode_finalizar: boolean
  mostrar_telefone: boolean
  registrar_km: boolean
  mostrar_hora_aula: boolean
}

const DEFAULT_CONFIG: InstructorConfig = {
  pode_dar_falta: true,
  pode_desmarcar: true,
  pode_finalizar: true,
  mostrar_telefone: true,
  registrar_km: false,
  mostrar_hora_aula: true,
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
  const guard = await assertPodeEditar('sistema')
  if (!guard.ok) return { success: false, error: guard.error }

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('autoescolas')
    .update({ instructor_config: config })
    .eq('id', autoescola_id)

  if (error) return { success: false, error: error.message }

  revalidatePath(`/${escola}/painel/configuracoes`)
  revalidatePath(`/${escola}/instrutor`)
  revalidatePath(`/${escola}/instrutor/estatisticas`)
  return { success: true }
}

export async function salvarReagendamentoMinHoras(
  autoescola_id: string,
  horas: number,
  escola: string
): Promise<{ success: boolean; error?: string }> {
  const guard = await assertPodeEditar('sistema')
  if (!guard.ok) return { success: false, error: guard.error }

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('autoescolas')
    .update({ reagendamento_min_horas: horas })
    .eq('id', autoescola_id)

  if (error) return { success: false, error: error.message }

  revalidatePath(`/${escola}/painel/regras-reagendamento`)
  revalidatePath(`/${escola}/aluno/minhas-aulas`)
  return { success: true }
}

export async function salvarJanelaAgendamento(
  autoescola_id: string,
  janela: JanelaAgendamento,
  escola: string
): Promise<{ success: boolean; error?: string }> {
  const guard = await assertPodeEditar('sistema')
  if (!guard.ok) return { success: false, error: guard.error }

  const limpa = normalizarJanela(janela)
  if (!limpa) return { success: false, error: 'Configuração inválida.' }
  const erro = validarJanela(limpa)
  if (erro) return { success: false, error: erro }

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('autoescolas')
    .update({ janela_agendamento: limpa })
    .eq('id', autoescola_id)
  if (error) return { success: false, error: error.message }

  await supabase.from('activity_logs_painel').insert({
    username: await getCurrentUsername(),
    action_type: 'travamento',
    description: limpa.ativo
      ? `Travamento de agendamento ativado — aluno agenda somente em: ${resumoJanela(limpa).join('; ')}`
      : 'Travamento de agendamento desativado — aluno pode agendar a qualquer hora',
    autoescola_id,
  })

  revalidatePath(`/${escola}/painel/travamentos`)
  revalidatePath(`/${escola}/aluno/agendar`)
  return { success: true }
}
