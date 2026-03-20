'use server'

import { getDisponibilidade } from '@/lib/getDisponibilidade'
import { createServiceClient } from '@/lib/supabase/server'

// Feriados nacionais fixos (MM-DD)
const FERIADOS_FIXOS = new Set([
  '01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '11-20', '12-25',
])

function isNonWorkday(d: Date): boolean {
  const dow = d.getDay()
  if (dow === 0 || dow === 6) return true
  const mmdd = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return FERIADOS_FIXOS.has(mmdd)
}

export interface DiaDisponivel {
  date: string
  label: string // e.g. "Seg, 23/06"
  instrutores: Array<{ nome: string; horarios: string[] }>
}

export async function buscarDisponibilidadeMassa(
  autoescola_id: string,
  startDate: string,
  category: string,
  daysNeeded: number,
  instructorFilter?: string
): Promise<DiaDisponivel[]> {
  const result: DiaDisponivel[] = []
  const current = new Date(startDate + 'T12:00:00')
  const maxScan = 90
  let scanned = 0

  const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  while (result.length < daysNeeded && scanned < maxScan) {
    const dateStr = current.toISOString().split('T')[0]

    if (!isNonWorkday(current)) {
      const disponivel = await getDisponibilidade(autoescola_id, dateStr, category)
      const filtered = instructorFilter
        ? disponivel.filter((i) => i.nome === instructorFilter)
        : disponivel

      const withSlots = filtered.filter((i) => i.horarios.length > 0)
      if (withSlots.length > 0) {
        result.push({
          date: dateStr,
          label: `${DIAS[current.getDay()]}, ${String(current.getDate()).padStart(2, '0')}/${String(current.getMonth() + 1).padStart(2, '0')}`,
          instrutores: withSlots.map((i) => ({ nome: i.nome, horarios: i.horarios })),
        })
      }
    }

    current.setDate(current.getDate() + 1)
    scanned++
  }

  return result
}

export interface AgendamentoMassaItem {
  date: string
  timeSlot: string
  instructorName: string
}

export async function criarAgendamentosMassa(data: {
  autoescola_id: string
  studentId: string
  studentName: string
  studentDocument: string
  category: string
  agendamentos: AgendamentoMassaItem[]
}): Promise<{ success: boolean; created: number; error?: string }> {
  const supabase = createServiceClient()
  const rpcCat = data.category === 'CARRO' ? 'aulas_cat_b' : 'aulas_cat_a'

  // Verificar créditos disponíveis
  const { data: creds } = await supabase
    .from('student_credits')
    .select(rpcCat)
    .eq('student_id', data.studentId)
    .single()

  const available = creds ? (creds as Record<string, number>)[rpcCat] ?? 0 : 0
  if (available < data.agendamentos.length) {
    return {
      success: false,
      created: 0,
      error: `Créditos insuficientes. Disponível: ${available}, Solicitado: ${data.agendamentos.length}`,
    }
  }

  // Inserir todos os agendamentos em lote
  const rows = data.agendamentos.map((a) => ({
    autoescola_id: data.autoescola_id,
    date: a.date,
    time_slot: a.timeSlot,
    instructor_name: a.instructorName,
    instructorCategory: data.category,
    student_name: data.studentName,
    student_document: data.studentDocument,
    cpf_cnh: data.studentDocument,
    status: 'scheduled',
    notes: 'Agendado em massa pelo painel',
  }))

  const { error: insertError } = await supabase.from('agendamentos').insert(rows)
  if (insertError) return { success: false, created: 0, error: insertError.message }

  // Deduzir créditos
  const newValue = Math.max(0, available - data.agendamentos.length)
  await supabase
    .from('student_credits')
    .update({ [rpcCat]: newValue })
    .eq('student_id', data.studentId)

  // Log de auditoria
  await supabase.from('activity_logs_painel').insert({
    username: 'painel',
    action_type: 'agendamento',
    description: `Agendamento em massa: ${data.agendamentos.length} aulas para ${data.studentName} (${data.category})`,
    autoescola_id: data.autoescola_id,
  })

  return { success: true, created: data.agendamentos.length }
}
