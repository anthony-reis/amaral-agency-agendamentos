import { createServiceClient } from '@/lib/supabase/server'
import { horariosDoInstrutorNoDia, isoWeekday, bloqueioAplicaAoInstrutor } from './horariosDia'

export interface InstructorDisponivel {
  nome: string
  aulasMinistradas: number
  horarios: string[]
}

// Converte dia ISO (1=Seg…7=Dom) para JS getDay() (0=Dom…6=Sáb)
function isoWeekdayToJs(iso: number): number {
  return iso === 7 ? 0 : iso
}

// Normaliza vehicle_type do banco para 'CARRO' | 'MOTO' | 'TODOS'
// DB usa: 'car', 'moto', 'motorcycle', 'TODOS' (e variações)
function normalizeVehicleType(vt: string): string {
  if (!vt) return 'TODOS'
  const u = vt.toUpperCase()
  if (u === 'CAR' || u === 'CARRO') return 'CARRO'
  if (u === 'MOTO' || u === 'MOTORCYCLE') return 'MOTO'
  return u // 'TODOS' ou outros
}

// Suporta weekdays como array JSON ou string JSON (ex: "[1,2,3,4,5]")
// Normaliza strings numéricas para número (ex: ["6"] → [6])
function parseWeekdays(weekdays: unknown): number[] {
  let arr: unknown[]
  if (Array.isArray(weekdays)) {
    arr = weekdays
  } else if (typeof weekdays === 'string') {
    try { arr = JSON.parse(weekdays) } catch { return [] }
  } else {
    return []
  }
  return arr.map((v) => Number(v)).filter((v) => !isNaN(v))
}

/**
 * Core availability logic — shared by both student booking and bulk scheduling.
 * Not a server action; can be safely imported by other server-only modules.
 */
export async function getDisponibilidade(
  autoescolaId: string,
  date: string,
  category: string,
  cambio?: 'MANUAL' | 'AUTOMATICO' | null
): Promise<InstructorDisponivel[]> {
  const supabase = createServiceClient()

  // Todas as consultas são independentes: rodam em paralelo (antes, em sequência).
  const [
    { data: instructorsAll },
    { data: timeSlots },
    { data: agendamentos },
    { data: blocked },
    { data: stats },
  ] = await Promise.all([
    // Instrutores da categoria (ou AMBOS)
    supabase
      .from('instructors')
      .select('id, name, category, cambio')
      .eq('autoescola_id', autoescolaId)
      .or(`category.eq.${category},category.eq.AMBOS`),
    // Horários ativos
    supabase
      .from('horarios_disponiveis')
      .select('horario, instrutor, dias_semana, data')
      .eq('autoescola_id', autoescolaId)
      .eq('ativo', true),
    // Agendamentos do dia (não cancelados)
    supabase
      .from('agendamentos')
      .select('time_slot, instructor_name, status')
      .eq('autoescola_id', autoescolaId)
      .eq('date', date)
      .neq('status', 'cancelled'),
    // Bloqueios: data exata OU recorrentes (status no banco é 'Bloqueado')
    supabase
      .from('blockedTimeSlots')
      .select('time_slot, instructor, vehicle_type, weekdays, date')
      .eq('autoescola_id', autoescolaId)
      .eq('status', 'Bloqueado')
      .or(`date.eq.${date},date.eq.RECORRENTE_DIA_SEMANA`),
    // Aulas concluídas por instrutor: contagem feita no Postgres (antes baixava todas as linhas)
    supabase.rpc('aulas_concluidas_por_instrutor', { p_autoescola_id: autoescolaId }),
  ])

  // Câmbio do aluno: instrutor sem câmbio definido atende qualquer um
  const instructors = cambio
    ? (instructorsAll ?? []).filter((i) => !i.cambio || i.cambio === cambio)
    : instructorsAll

  if (!instructors || instructors.length === 0) return []

  const dayOfWeek = new Date(date + 'T12:00:00').getDay() // local noon avoids TZ edge cases

  const instructorStats: Record<string, number> = {}
  for (const row of (stats ?? []) as { instructor_name: string; total: number }[]) {
    instructorStats[row.instructor_name] = row.total
  }

  return instructors
    .map((inst) => {
      const nome = inst.name

      // Horários próprios do instrutor têm prioridade sobre os globais; dias_semana restringe por dia
      const baseTimes = horariosDoInstrutorNoDia(timeSlots ?? [], nome, isoWeekday(date), date)

      // Already booked slots for this instructor on this date
      const bookedForInst = (agendamentos ?? [])
        .filter((a) => a.instructor_name === nome)
        .map((a) => a.time_slot)

      // Blocks that apply to this instructor
      const blocksForInst = (blocked ?? []).filter((b) => {
        // Instructor filter: if block targets a specific instructor, must match
        if (!bloqueioAplicaAoInstrutor(b.instructor, nome)) return false

        // Vehicle type: normalize DB values ('car'→'CARRO', 'moto'/'motorcycle'→'MOTO', 'TODOS'→wildcard)
        const vt = normalizeVehicleType(b.vehicle_type)
        if (vt !== 'TODOS' && vt !== category.toUpperCase()) return false

        // Specific date block
        if (b.date === date) return true

        // Recurring block: check if today's weekday is in the block's weekdays array (ISO 1=Seg…7=Dom)
        if (b.date === 'RECORRENTE_DIA_SEMANA') {
          const wds = parseWeekdays(b.weekdays).map(isoWeekdayToJs)
          return wds.includes(dayOfWeek)
        }

        return false
      })

      // Full day block: DB uses 'TODOS', legacy code used 'DIA_INTEIRO'
      const dayBlocked = blocksForInst.some(
        (b) => b.time_slot === 'TODOS' || b.time_slot === 'DIA_INTEIRO'
      )
      if (dayBlocked) return { nome, aulasMinistradas: instructorStats[nome] || 0, horarios: [] }

      // APOS_HH:MM — block all slots >= that time
      const aposBlock = blocksForInst.find((b) => b.time_slot?.startsWith('APOS_'))
      const aposCorte = aposBlock ? aposBlock.time_slot.replace('APOS_', '') : null

      const exactBlockedTimes = blocksForInst
        .filter((b) => !b.time_slot?.startsWith('APOS_'))
        .map((b) => b.time_slot)

      const availableTimes = baseTimes.filter((t) => {
        if (bookedForInst.includes(t)) return false
        if (exactBlockedTimes.includes(t)) return false
        if (aposCorte && t >= aposCorte) return false
        return true
      })

      return { nome, aulasMinistradas: instructorStats[nome] || 0, horarios: availableTimes.sort() }
    })
    .filter((inst) => inst.horarios.length > 0)
}
