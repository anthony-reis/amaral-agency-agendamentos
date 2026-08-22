import 'server-only'

import { createServiceClient } from './supabase/server'
import { getDisponibilidade } from './getDisponibilidade'

const FERIADOS_FIXOS = new Set([
  '01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '11-20', '12-25',
])

function isNonWorkday(d: Date): boolean {
  const dow = d.getDay()
  if (dow === 0) return true
  const mmdd = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return FERIADOS_FIXOS.has(mmdd)
}

export interface ReservarProximasAulasInput {
  autoescola_id: string
  student_id: string
  instructor_name: string
  category: string
  startDate: string // dia seguinte à última aula do pacote recém-agendado
  quantidade: number
}

/**
 * Reserva (via blockedTimeSlots) os próximos N horários livres do mesmo
 * instrutor pro mesmo aluno, logo após o fim de um pacote agendado em massa —
 * segura o horário dele pra dar tempo do atendente tentar uma revenda antes
 * de o slot ficar disponível pra qualquer outro aluno.
 */
export async function reservarProximasAulas(input: ReservarProximasAulasInput): Promise<number> {
  const { autoescola_id, student_id, instructor_name, category, startDate, quantidade } = input
  if (quantidade <= 0) return 0

  const supabase = createServiceClient()
  const reservas: { date: string; time_slot: string }[] = []
  const current = new Date(startDate + 'T12:00:00')
  const maxScan = 90
  let scanned = 0

  while (reservas.length < quantidade && scanned < maxScan) {
    const dateStr = current.toISOString().split('T')[0]
    if (!isNonWorkday(current)) {
      const disponivel = await getDisponibilidade(autoescola_id, dateStr, category)
      const doInstrutor = disponivel.find((i) => i.nome === instructor_name)
      if (doInstrutor && doInstrutor.horarios.length > 0) {
        reservas.push({ date: dateStr, time_slot: doInstrutor.horarios[0] })
      }
    }
    current.setDate(current.getDate() + 1)
    scanned++
  }

  if (reservas.length === 0) return 0

  const grupoId = crypto.randomUUID()
  const rows = reservas.map((r) => ({
    autoescola_id,
    date: r.date,
    time_slot: r.time_slot,
    vehicle_type: category,
    instructor: instructor_name,
    reason: 'Reserva pós-pacote (revenda)',
    status: 'Bloqueado',
    reserva_grupo_id: grupoId,
    reserva_student_id: student_id,
  }))

  await supabase.from('blockedTimeSlots').insert(rows)
  return rows.length
}

interface ReservaRow {
  id: string
  date: string
  instructor: string | null
  reserva_grupo_id: string
  reserva_student_id: string | null
  created_at: string
}

/**
 * Libera (apaga) grupos de reserva pós-pacote vencidos: se já houve uma nova
 * venda/agendamento pro mesmo aluno com o mesmo instrutor depois da reserva
 * ter sido criada (revenda feita), ou se faltam menos de 48h pro último
 * horário reservado (revenda não aconteceu a tempo), o grupo inteiro é
 * liberado. Chamada de forma oportunista sempre que a disponibilidade é
 * consultada — não depende de nenhum job/cron rodando sozinho.
 */
export async function liberarReservasVencidas(autoescola_id: string): Promise<void> {
  const supabase = createServiceClient()

  const { data: reservas } = await supabase
    .from('blockedTimeSlots')
    .select('id, date, instructor, reserva_grupo_id, reserva_student_id, created_at')
    .eq('autoescola_id', autoescola_id)
    .not('reserva_grupo_id', 'is', null)

  const rows = (reservas ?? []) as ReservaRow[]
  if (rows.length === 0) return

  const grupos = new Map<string, ReservaRow[]>()
  for (const r of rows) {
    const key = r.reserva_grupo_id
    if (!grupos.has(key)) grupos.set(key, [])
    grupos.get(key)!.push(r)
  }

  const agora = Date.now()
  const idsParaLiberar: string[] = []

  for (const linhas of grupos.values()) {
    const ultimaData = linhas.reduce((max, r) => (r.date > max ? r.date : max), linhas[0].date)
    const prazoMs = new Date(ultimaData + 'T00:00:00').getTime() - 48 * 60 * 60 * 1000
    const dentroDoPrazo = agora < prazoMs

    if (dentroDoPrazo) {
      // Ainda tem tempo antes do prazo — só libera se a revenda já aconteceu
      const primeira = linhas[0]
      if (!primeira.reserva_student_id || !primeira.instructor) continue

      const { count } = await supabase
        .from('agendamentos')
        .select('id', { count: 'exact', head: true })
        .eq('autoescola_id', autoescola_id)
        .eq('student_id', primeira.reserva_student_id)
        .eq('instructor_name', primeira.instructor)
        .neq('status', 'cancelled')
        .gt('created_at', primeira.created_at)

      if (!count) continue // sem revenda ainda e dentro do prazo — mantém a reserva
    }

    idsParaLiberar.push(...linhas.map((l) => l.id))
  }

  if (idsParaLiberar.length > 0) {
    await supabase.from('blockedTimeSlots').delete().in('id', idsParaLiberar)
  }
}
