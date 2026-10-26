import 'server-only'

import { createServiceClient } from '@/lib/supabase/server'
import { janelaAbertaAgora, MSG_FORA_DO_HORARIO, normalizarJanela, type JanelaAgendamento } from '@/lib/janelaAgendamento'

export async function getJanelaAgendamento(autoescola_id: string): Promise<JanelaAgendamento | null> {
  const supabase = createServiceClient()
  const { data } = await supabase.from('autoescolas').select('janela_agendamento').eq('id', autoescola_id).single()
  return normalizarJanela(data?.janela_agendamento)
}

/** Para as actions do aluno: mensagem de erro se agora está fora da janela, senão null. */
export async function bloqueioJanelaAgendamento(autoescola_id: string): Promise<string | null> {
  return janelaAbertaAgora(await getJanelaAgendamento(autoescola_id)) ? null : MSG_FORA_DO_HORARIO
}
