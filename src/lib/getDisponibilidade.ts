import { createServiceClient } from '@/lib/supabase/server'

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
function parseWeekdays(weekdays: unknown): number[] {
  if (Array.isArray(weekdays)) return weekdays as number[]
  if (typeof weekdays === 'string') {
    try { return JSON.parse(weekdays) as number[] } catch { return [] }
  }
  return []
}

/**
 * Core availability logic — shared by both student booking and bulk scheduling.
 * Not a server action; can be safely imported by other server-only modules.
 */
export async function getDisponibilidade(
  autoescolaId: string,
  date: string,
  category: string
): Promise<InstructorDisponivel[]> {
  const supabase = createServiceClient()

  // 1. Instructors matching category or AMBOS
  const { data: instructors } = await supabase
    .from('instructors')
    .select('id, name, category')
    .eq('autoescola_id', autoescolaId)
    .or(`category.eq.${category},category.eq.AMBOS`)

  if (!instructors || instructors.length === 0) return []

  // 2. Available time slots (active)
  const { data: timeSlots } = await supabase
    .from('horarios_disponiveis')
    .select('horario, instrutor')
    .eq('autoescola_id', autoescolaId)
    .eq('ativo', true)

  // 3. Existing bookings for that date (non-cancelled)
  const { data: agendamentos } = await supabase
    .from('agendamentos')
    .select('time_slot, instructor_name, status')
    .eq('autoescola_id', autoescolaId)
    .eq('date', date)
    .neq('status', 'cancelled')

  // 4. Blocked slots: exact date OR recurring (date = 'RECORRENTE_DIA_SEMANA')
  //    status in DB is 'Bloqueado' (not 'active')
  const { data: blocked } = await supabase
    .from('blockedTimeSlots')
    .select('time_slot, instructor, vehicle_type, weekdays, date')
    .eq('autoescola_id', autoescolaId)
    .eq('status', 'Bloqueado')
    .or(`date.eq.${date},date.eq.RECORRENTE_DIA_SEMANA`)

  const dayOfWeek = new Date(date + 'T12:00:00').getDay() // local noon avoids TZ edge cases

  // 5. Stats (total completed classes per instructor)
  const { data: stats } = await supabase
    .from('agendamentos')
    .select('instructor_name')
    .eq('autoescola_id', autoescolaId)
    .eq('status', 'completed')

  const instructorStats = (stats ?? []).reduce((acc: Record<string, number>, row) => {
    acc[row.instructor_name] = (acc[row.instructor_name] || 0) + 1
    return acc
  }, {})

  return instructors
    .map((inst) => {
      const nome = inst.name

      // Instructor-specific slots take priority over global slots
      const instSpecific = (timeSlots ?? []).filter((t) => t.instrutor === nome).map((t) => t.horario)
      const globalSlots = (timeSlots ?? []).filter((t) => !t.instrutor).map((t) => t.horario)
      const baseTimes = [...new Set(instSpecific.length > 0 ? instSpecific : globalSlots)]

      // Already booked slots for this instructor on this date
      const bookedForInst = (agendamentos ?? [])
        .filter((a) => a.instructor_name === nome)
        .map((a) => a.time_slot)

      // Blocks that apply to this instructor
      const blocksForInst = (blocked ?? []).filter((b) => {
        // Instructor filter: if block targets a specific instructor, must match
        if (b.instructor && b.instructor !== nome) return false

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

      const blockedTimes = blocksForInst.map((b) => b.time_slot)
      const availableTimes = baseTimes.filter(
        (t) => !bookedForInst.includes(t) && !blockedTimes.includes(t)
      )

      return { nome, aulasMinistradas: instructorStats[nome] || 0, horarios: availableTimes.sort() }
    })
    .filter((inst) => inst.horarios.length > 0)
}
