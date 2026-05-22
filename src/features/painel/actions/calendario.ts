'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getCurrentUsername } from './authPainel'

export interface DiaCalendario {
  date: string          // 'YYYY-MM-DD'
  total: number
  bloqueado: boolean
}

export interface InstrutorDia {
  instructor_name: string
  total: number
  category: string
}

export interface SlotDia {
  horario: string
  bloqueado: boolean
  agendamento: {
    id: string
    student_name: string
    student_phone: string | null
    student_email: string | null
    cpf_cnh: string | null
    status: string
    instructorCategory: string | null
    notes: string | null
  } | null
}

export async function getCalendarioData(
  autoescola_id: string,
  year: number,
  month: number // 1-based
): Promise<DiaCalendario[]> {
  const supabase = createServiceClient()
  const monthStr = String(month).padStart(2, '0')
  const prefix = `${year}-${monthStr}`
  const daysInMonthEarly = new Date(year, month, 0).getDate()
  const dateFrom = `${prefix}-01`
  const dateTo = `${prefix}-${String(daysInMonthEarly).padStart(2, '0')}`

  const { data: agendamentos } = await supabase
    .from('agendamentos')
    .select('date')
    .eq('autoescola_id', autoescola_id)
    .gte('date', dateFrom)
    .lte('date', dateTo)
    .neq('status', 'cancelled')

  const { data: bloqueios } = await supabase
    .from('blockedTimeSlots')
    .select('date')
    .eq('autoescola_id', autoescola_id)
    .gte('date', dateFrom)
    .lte('date', dateTo)

  const contagem = new Map<string, number>()
  for (const a of agendamentos ?? []) {
    contagem.set(a.date, (contagem.get(a.date) ?? 0) + 1)
  }

  const diasBloqueados = new Set((bloqueios ?? []).map((b) => b.date))

  const result: DiaCalendario[] = []
  for (let d = 1; d <= daysInMonthEarly; d++) {
    const dayStr = String(d).padStart(2, '0')
    const date = `${prefix}-${dayStr}`
    result.push({
      date,
      total: contagem.get(date) ?? 0,
      bloqueado: diasBloqueados.has(date),
    })
  }

  return result
}

export async function getInstrutoresDoDia(
  autoescola_id: string,
  date: string
): Promise<InstrutorDia[]> {
  const supabase = createServiceClient()

  const [{ data: ags }, { data: instructors }] = await Promise.all([
    supabase
      .from('agendamentos')
      .select('instructor_name')
      .eq('autoescola_id', autoescola_id)
      .eq('date', date)
      .neq('status', 'cancelled'),
    supabase
      .from('instructors')
      .select('name, category')
      .eq('autoescola_id', autoescola_id),
  ])

  const counts = new Map<string, number>()
  for (const a of ags ?? []) {
    const name = a.instructor_name ?? '(sem instrutor)'
    counts.set(name, (counts.get(name) ?? 0) + 1)
  }

  return (instructors ?? [])
    .map((inst) => ({
      instructor_name: inst.name,
      total: counts.get(inst.name) ?? 0,
      category: inst.category,
    }))
    .sort((a, b) => a.instructor_name.localeCompare(b.instructor_name))
}

// ── Helpers (mesma lógica de getDisponibilidade) ──────────────────────────────

function isoWeekdayToJs(iso: number): number {
  return iso === 7 ? 0 : iso
}

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

function normalizeVehicleType(vt: string): string {
  if (!vt) return 'TODOS'
  const u = vt.toUpperCase()
  if (u === 'CAR' || u === 'CARRO') return 'CARRO'
  if (u === 'MOTO' || u === 'MOTORCYCLE') return 'MOTO'
  return u
}

// ─────────────────────────────────────────────────────────────────────────────

export async function getSlotsDoDia(
  autoescola_id: string,
  date: string,
  instructor_name: string,
  instructor_category: string
): Promise<SlotDia[]> {
  const supabase = createServiceClient()

  // 1. Horários ativos
  const { data: horariosRaw } = await supabase
    .from('horarios_disponiveis')
    .select('horario, ordem, instrutor')
    .eq('autoescola_id', autoescola_id)
    .eq('ativo', true)
    .order('ordem', { ascending: true })

  // Horários específicos do instrutor têm prioridade; senão usa globais
  const especificos = (horariosRaw ?? []).filter((h) => h.instrutor === instructor_name).map((h) => h.horario)
  const globais = (horariosRaw ?? []).filter((h) => !h.instrutor).map((h) => h.horario)
  const baseSlots = especificos.length > 0 ? especificos : globais
  const baseSet = new Set(baseSlots)

  // Ordem para sort
  const slotOrdem = new Map<string, number>()
  for (const h of horariosRaw ?? []) {
    if (!slotOrdem.has(h.horario)) slotOrdem.set(h.horario, h.ordem)
  }

  // 2. Bloqueios: data exata OU recorrente — mesma lógica de getDisponibilidade
  const { data: blocked } = await supabase
    .from('blockedTimeSlots')
    .select('time_slot, instructor, vehicle_type, weekdays, date')
    .eq('autoescola_id', autoescola_id)
    .eq('status', 'Bloqueado')
    .or(`date.eq.${date},date.eq.RECORRENTE_DIA_SEMANA`)

  const dayOfWeek = new Date(date + 'T12:00:00').getDay()

  const blocksForInst = (blocked ?? []).filter((b) => {
    if (b.instructor && b.instructor !== instructor_name) return false
    const vt = normalizeVehicleType(b.vehicle_type)
    if (vt !== 'TODOS' && vt !== instructor_category.toUpperCase()) return false
    if (b.date === date) return true
    if (b.date === 'RECORRENTE_DIA_SEMANA') {
      const wds = parseWeekdays(b.weekdays).map(isoWeekdayToJs)
      return wds.includes(dayOfWeek)
    }
    return false
  })

  // Dia inteiro bloqueado?
  const diaInteiroBloqueado = blocksForInst.some(
    (b) => b.time_slot === 'TODOS' || b.time_slot === 'DIA_INTEIRO'
  )

  // APOS_HH:MM — bloqueia todos os slots >= corte
  const aposBlock = blocksForInst.find((b) => b.time_slot?.startsWith('APOS_'))
  const aposCorte = aposBlock ? aposBlock.time_slot.replace('APOS_', '') : null

  const blockedSlots = new Set(
    blocksForInst.filter((b) => !b.time_slot?.startsWith('APOS_')).map((b) => b.time_slot)
  )

  // 3. Agendamentos existentes do instrutor nesse dia (todos os status para exibir)
  const { data: agsRaw } = await supabase
    .from('agendamentos')
    .select('id, time_slot, student_name, cpf_cnh, student_document, status, instructorCategory, notes')
    .eq('autoescola_id', autoescola_id)
    .eq('date', date)
    .eq('instructor_name', instructor_name)

  const { data: instData } = await supabase
    .from('instructors')
    .select('category')
    .eq('name', instructor_name)
    .eq('autoescola_id', autoescola_id)
    .single()
  const trueCat = instData?.category ?? instructor_category

  // 4. Contatos dos alunos
  const documents = (agsRaw ?? [])
    .map((a) => a.cpf_cnh ?? a.student_document)
    .filter((d): d is string => !!d)

  const contactMap = new Map<string, { phone: string | null; email: string | null }>()
  if (documents.length > 0) {
    const { data: students } = await supabase
      .from('students')
      .select('document_id, phone, email')
      .eq('autoescola_id', autoescola_id)
      .in('document_id', documents)
    for (const s of students ?? []) {
      if (s.document_id) contactMap.set(s.document_id, { phone: s.phone, email: s.email })
    }
  }

  type AgsRow = NonNullable<typeof agsRaw>[number]
  const agBySlot = new Map<string, AgsRow>()
  for (const ag of agsRaw ?? []) {
    const existing = agBySlot.get(ag.time_slot)
    // Registros ativos têm prioridade sobre cancelados
    if (!existing || (existing.status === 'cancelled' && ag.status !== 'cancelled')) {
      agBySlot.set(ag.time_slot, ag)
    }
  }

  // 5. União de slots: base + agendamentos ativos fora do base
  // Com horários específicos: mostra apenas esses slots + agendamentos ativos fora deles (booking real não pode sumir)
  // Com horários globais: agendamentos em qualquer horário aparecem (edição manual / migração)
  const allSlots = new Set<string>(baseSet)
  for (const ag of agsRaw ?? []) {
    if (allSlots.has(ag.time_slot)) continue
    // Só adiciona slots fora do base se: não há específicos (usa global) OU o agendamento está ativo
    if (especificos.length === 0 || ag.status !== 'cancelled') {
      allSlots.add(ag.time_slot)
      if (!slotOrdem.has(ag.time_slot)) slotOrdem.set(ag.time_slot, 9999)
    }
  }

  const sorted = Array.from(allSlots).sort((a, b) => a.localeCompare(b))

  return sorted.map((horario) => {
    const ag = agBySlot.get(horario)

    // Bloqueado (dia inteiro, slot específico ou APOS_) — mas se há agendamento ativo, mostra mesmo assim
    const slotBloqueado = blockedSlots.has(horario) || (aposCorte !== null && horario >= aposCorte)
    const isBloqueado =
      diaInteiroBloqueado
        ? !ag || ag.status === 'cancelled'
        : slotBloqueado && (!ag || ag.status === 'cancelled')

    if (!ag || ag.status === 'cancelled') {
      return { horario, bloqueado: isBloqueado, agendamento: null }
    }

    const docKey = ag.cpf_cnh ?? ag.student_document ?? ''
    const contact = contactMap.get(docKey)

    return {
      horario,
      bloqueado: false,
      agendamento: {
        id: ag.id,
        student_name: ag.student_name,
        student_phone: contact?.phone ?? null,
        student_email: contact?.email ?? null,
        cpf_cnh: ag.cpf_cnh,
        status: ag.status,
        instructorCategory: trueCat,
        notes: ag.notes,
      },
    }
  })
}

export async function atualizarStatusAgendamento(
  id: string,
  status: 'scheduled' | 'confirmed' | 'completed' | 'absent' | 'cancelled'
): Promise<{ error: string | null }> {
  const supabase = createServiceClient()

  const { data: ag, error: fetchErr } = await supabase
    .from('agendamentos')
    .select('status, autoescola_id, cpf_cnh, student_document, instructorCategory, instructor_name')
    .eq('id', id)
    .single()

  if (fetchErr || !ag) return { error: fetchErr?.message ?? 'Agendamento não encontrado' }

  const { error } = await supabase
    .from('agendamentos')
    .update({ status })
    .eq('id', id)

  if (error) return { error: error.message }

  // Devolver crédito se estiver cancelando um agendamento antes não cancelado
  if (status === 'cancelled' && ag.status !== 'cancelled') {
    const { data: inst } = ag.instructor_name ? await supabase.from('instructors').select('category').eq('name', ag.instructor_name).eq('autoescola_id', ag.autoescola_id).single() : { data: null }
    const trueCategory = inst?.category ?? ag.instructorCategory

    const doc = ag.cpf_cnh ?? ag.student_document
    const creditField = trueCategory === 'MOTO' ? 'aulas_cat_a' : 'aulas_cat_b'

    if (doc) {
      const { data: student } = await supabase
        .from('students')
        .select('id')
        .eq('autoescola_id', ag.autoescola_id)
        .eq('document_id', doc)
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
          
          const userAct = await getCurrentUsername()
          await supabase.from('activity_logs_painel').insert({
              username: userAct,
              action_type: 'cancelamento',
              description: `Cancelamento de aula pelo calendário: devolvido 1 crédito de ${trueCategory} para aluno com doc ${doc}.`,
              metadata: { agendamento_id: id },
              autoescola_id: ag.autoescola_id,
            })
        }
      }
    }
  }

  revalidatePath('/', 'layout')
  return { error: null }
}

export interface AlunoParaAgendar {
  id: string
  name: string
  document_id: string
  phone: string | null
  creditos: {
    aulas_cat_a: number
    aulas_cat_b: number
    aulas_disponiveis: number
  } | null
}

export async function listarAlunosParaAgendar(
  autoescola_id: string
): Promise<AlunoParaAgendar[]> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('students')
    .select('id, name, document_id, phone, creditos:student_credits(aulas_cat_a, aulas_cat_b, aulas_disponiveis)')
    .eq('autoescola_id', autoescola_id)
    .order('name', { ascending: true })

  return (data ?? []).map((row) => ({
    ...row,
    creditos: Array.isArray(row.creditos) ? row.creditos[0] ?? null : row.creditos ?? null,
  })) as AlunoParaAgendar[]
}

export async function agendarAulaCalendario(data: {
  autoescola_id: string
  date: string
  time_slot: string
  instructor_name: string
  instructor_category: string
  student_id: string
  student_name: string
  student_document: string
}): Promise<{ error: string | null }> {
  const supabase = createServiceClient()

  const { data: inst } = await supabase.from('instructors').select('category').eq('name', data.instructor_name).eq('autoescola_id', data.autoescola_id).single()
  const trueCategory = inst?.category ?? data.instructor_category

  const creditField = trueCategory === 'MOTO' ? 'aulas_cat_a' : 'aulas_cat_b'

  // Verificar crédito
  const { data: creds } = await supabase
    .from('student_credits')
    .select(creditField)
    .eq('student_id', data.student_id)
    .single()

  const available = creds ? (creds as Record<string, number>)[creditField] ?? 0 : 0
  if (available <= 0) {
    return { error: `Aluno sem créditos disponíveis para ${trueCategory === 'CARRO' ? 'Carro' : 'Moto'}.` }
  }

  // Verificar conflito no slot
  const { data: conflict } = await supabase
    .from('agendamentos')
    .select('id')
    .eq('autoescola_id', data.autoescola_id)
    .eq('date', data.date)
    .eq('time_slot', data.time_slot)
    .eq('instructor_name', data.instructor_name)
    .neq('status', 'cancelled')
    .maybeSingle()

  if (conflict) return { error: 'Horário já ocupado.' }

  // Inserir agendamento
  const { data: newAgendamento, error: insertError } = await supabase.from('agendamentos').insert({
    autoescola_id: data.autoescola_id,
    date: data.date,
    time_slot: data.time_slot,
    instructor_name: data.instructor_name,
    instructorCategory: trueCategory,
    student_name: data.student_name,
    student_document: data.student_document,
    cpf_cnh: data.student_document,
    status: 'scheduled',
  }).select('id').single()

  if (insertError) return { error: insertError.message }
  const agendamentoId = newAgendamento?.id

  // Deduzir crédito
  await supabase
    .from('student_credits')
    .update({ [creditField]: Math.max(0, available - 1) })
    .eq('student_id', data.student_id)

  const userAct = await getCurrentUsername()
  const dateBR = data.date.split('-').reverse().join('/')
  // Log
  await supabase.from('activity_logs_painel').insert({
    username: userAct,
    action_type: 'agendamento',
    description: `Agendamento criado para aluno ${data.student_name} em ${dateBR} ${data.time_slot}.`,
    metadata: { agendamento_id: agendamentoId },
    autoescola_id: data.autoescola_id,
  })

  revalidatePath('/', 'layout')
  return { error: null }
}
