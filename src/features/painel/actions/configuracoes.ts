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
  /** Instrutor pode antecipar uma aula do dia para um horário vago antes dele. */
  pode_antecipar: boolean
}

const DEFAULT_CONFIG: InstructorConfig = {
  pode_dar_falta: true,
  pode_desmarcar: true,
  pode_finalizar: true,
  mostrar_telefone: true,
  registrar_km: false,
  mostrar_hora_aula: true,
  pode_antecipar: false,
}

const DEFAULT_REAGENDAMENTO_MIN_HORAS = 2

/** Nomes das ações para a Auditoria. */
const ROTULO_ACAO_INSTRUTOR: Record<keyof InstructorConfig, string> = {
  pode_dar_falta: 'Dar falta',
  pode_desmarcar: 'Desmarcar aula',
  pode_finalizar: 'Finalizar aula',
  mostrar_telefone: 'Mostrar telefone do aluno',
  registrar_km: 'Registrar KM por aula',
  mostrar_hora_aula: 'Mostrar hora/aula',
  pode_antecipar: 'Antecipar aula',
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

  const anterior = await getInstructorConfig(autoescola_id)
  const supabase = createServiceClient()
  const { error } = await supabase
    .from('autoescolas')
    .update({ instructor_config: config })
    .eq('id', autoescola_id)

  if (error) return { success: false, error: error.message }

  const mudancas = (Object.keys(ROTULO_ACAO_INSTRUTOR) as (keyof InstructorConfig)[])
    .filter((k) => anterior[k] !== config[k])
    .map((k) => `${ROTULO_ACAO_INSTRUTOR[k]} ${config[k] ? 'ativado' : 'desativado'}`)
  if (mudancas.length > 0) {
    await supabase.from('activity_logs_painel').insert({
      username: await getCurrentUsername(),
      action_type: 'configuracao',
      description: `Ações do instrutor alteradas — ${mudancas.join('; ')}`,
      autoescola_id,
    })
  }

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

/** Opção "vincular aluno ao instrutor": aluno vinculado só agenda com o próprio instrutor. */
export async function getVincularAlunoInstrutor(autoescola_id: string): Promise<boolean> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('autoescolas')
    .select('vincular_aluno_instrutor')
    .eq('id', autoescola_id)
    .single()
  return data?.vincular_aluno_instrutor === true
}

export async function salvarVincularAlunoInstrutor(
  autoescola_id: string,
  ativo: boolean,
  escola: string
): Promise<{ success: boolean; error?: string }> {
  const guard = await assertPodeEditar('sistema')
  if (!guard.ok) return { success: false, error: guard.error }

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('autoescolas')
    .update({ vincular_aluno_instrutor: ativo })
    .eq('id', autoescola_id)
  if (error) return { success: false, error: error.message }

  await supabase.from('activity_logs_painel').insert({
    username: await getCurrentUsername(),
    action_type: 'configuracao',
    description: `Vínculo aluno–instrutor ${ativo ? 'ativado' : 'desativado'}`,
    autoescola_id,
  })

  revalidatePath(`/${escola}/painel/configuracoes`)
  revalidatePath(`/${escola}/painel/alunos`)
  return { success: true }
}
