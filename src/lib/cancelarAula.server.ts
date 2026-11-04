import 'server-only'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'
import { registrarCancelamentoAula } from '@/lib/atividadeAluno.server'
import type { ActionResult } from '@/features/painel/types'

/**
 * Cancela uma aula: marca como cancelada, bloqueia o horário (opcional), devolve
 * o crédito e registra histórico, auditoria e aviso ao aluno. NÃO checa quem
 * chama: quem usa precisa validar a sessão (painel ou instrutor) antes.
 */
export async function cancelarAulaCore(
  id: string,
  autoescola_id: string,
  options: { blockSlot: boolean; reason?: string; feito_por: string }
): Promise<ActionResult> {
  const supabase = createServiceClient()

  try {
    // 1. Buscar o agendamento atual
    const { data: ag, error: fetchErr } = await supabase
      .from('agendamentos')
      .select('id, status, cpf_cnh, student_document, student_name, instructorCategory, instructor_name, date, time_slot')
      .eq('id', id)
      .eq('autoescola_id', autoescola_id)
      .single()

    if (fetchErr || !ag) throw new Error('Agendamento não encontrado.')
    if (ag.status === 'cancelled') return { success: true, data: undefined }

    // 2. Atualizar o agendamento com o status e a justificativa
    const { error: updateErr } = await supabase
      .from('agendamentos')
      .update({ 
        status: 'cancelled',
        cancel_reason: options.reason || null,
        is_blocked_on_cancel: options.blockSlot
      })
      .eq('id', id)

    if (updateErr) throw new Error(updateErr.message)

    // 3. Se solicitado, criar o bloqueio no horário
    if (options.blockSlot) {
      const { error: blockErr } = await supabase
        .from('blockedTimeSlots')
        .insert({
          autoescola_id,
          date: ag.date,
          time_slot: ag.time_slot,
          instructor: ag.instructor_name,
          vehicle_type: ag.instructorCategory || 'CARRO',
          reason: options.reason || 'Cancelamento com bloqueio',
          status: 'Bloqueado',
          weekdays: []
        })
      
      if (blockErr) console.error('Erro ao criar bloqueio:', blockErr.message)
    }

    // 4. Devolver crédito ao aluno
    let creditoDevolvido = false
    const { data: inst } = ag.instructor_name ? await supabase.from('instructors').select('category').eq('name', ag.instructor_name).eq('autoescola_id', autoescola_id).single() : { data: null }
    const trueCategory = inst?.category ?? ag.instructorCategory
    const doc = ag.cpf_cnh ?? ag.student_document
    const creditField = trueCategory === 'MOTO' ? 'aulas_cat_a' : 'aulas_cat_b'

    if (doc) {
      const { data: student } = await supabase
        .from('students')
        .select('id')
        .eq('document_id', doc)
        .eq('autoescola_id', autoescola_id)
        .single()

      if (student) {
        const { data: creds } = await supabase
          .from('student_credits')
          .select(creditField)
          .eq('student_id', student.id)
          .single()

        if (creds) {
          const current = (creds as Record<string, number>)[creditField] ?? 0
          await supabase
            .from('student_credits')
            .update({ [creditField]: current + 1 })
            .eq('student_id', student.id)

          creditoDevolvido = true
        }
      }
    }

    await registrarCancelamentoAula(supabase, autoescola_id, ag, {
      feito_por: options.feito_por,
      motivo: options.reason,
      creditoDevolvido,
      bloqueou: options.blockSlot,
    })

    revalidatePath('/', 'layout')
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Erro ao cancelar agendamento' }
  }
}
