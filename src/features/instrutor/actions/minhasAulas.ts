'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/features/painel/types'
import { cancelarAgendamentoComOpcoes } from '@/features/painel/actions/agendamentos'

export interface AulaInstrutor {
  id: string
  date: string
  time_slot: string
  student_name: string
  student_document: string | null
  cpf_cnh: string | null
  instructorCategory: string | null
  status: string
  notes: string | null
  autoescola_id: string
  aulas_concluidas: number
  aulas_agendadas: number
  creditos_disponiveis: number | null
  creditos_total: number | null
  phone: string | null
  km_inicial: number | null
  km_final: number | null
  km_rodado: number | null
}

export interface DiaSemana {
  date: string
  label: string // e.g. "SEG", "TER"
  dayNum: number
  total: number
  pendentes: number
}

export async function getMinhasAulasHoje(
  instructor_name: string,
  autoescola_id: string,
  date?: string
): Promise<AulaInstrutor[]> {
  const supabase = createServiceClient()
  const targetDate = date ?? new Date().toISOString().split('T')[0]

  const { data: agendamentos } = await supabase
    .from('agendamentos')
    .select('id, date, time_slot, student_name, student_document, cpf_cnh, instructorCategory, status, notes, autoescola_id, km_inicial, km_final, km_rodado')
    .eq('autoescola_id', autoescola_id)
    .eq('instructor_name', instructor_name)
    .eq('date', targetDate)
    .neq('status', 'cancelled')
    .order('time_slot')

  if (!agendamentos) return []

  const { data: inst } = await supabase
    .from('instructors')
    .select('category')
    .eq('name', instructor_name)
    .eq('autoescola_id', autoescola_id)
    .single()

  const trueCat = inst?.category ?? 'CARRO' // Default to 'CARRO' if category not found

  const documentos = agendamentos
    .map((a) => a.cpf_cnh ?? a.student_document)
    .filter(Boolean) as string[]

  // Busca aulas concluídas e agendadas diretamente em agendamentos (sem depender da tabela students)
  const concluidasMap = new Map<string, number>()
  const agendadasMap = new Map<string, number>()
  if (documentos.length) {
    const docList = documentos.join(',')
    const { data: histData } = await supabase
      .from('agendamentos')
      .select('cpf_cnh, student_document, status')
      .eq('autoescola_id', autoescola_id)
      .or(`cpf_cnh.in.(${docList}),student_document.in.(${docList})`)
      .in('status', ['completed', 'scheduled', 'confirmed'])
    for (const row of histData ?? []) {
      const doc = row.cpf_cnh ?? row.student_document
      if (!doc) continue
      if (row.status === 'completed') {
        concluidasMap.set(doc, (concluidasMap.get(doc) ?? 0) + 1)
      } else {
        agendadasMap.set(doc, (agendadasMap.get(doc) ?? 0) + 1)
      }
    }
  }

  // Busca créditos via students → student_credits
  const { data: students } = documentos.length
    ? await supabase
        .from('students')
        .select('id, document_id, phone')
        .in('document_id', documentos)
        .eq('autoescola_id', autoescola_id)
    : { data: [] }

  const studentIds = (students ?? []).map((s) => s.id)

  const { data: creditos } = studentIds.length
    ? await supabase
        .from('student_credits')
        .select('student_id, aulas_disponiveis, aulas_cat_a, aulas_cat_b, aulas_cat_c, aulas_cat_d, aulas_cat_e')
        .in('student_id', studentIds)
    : { data: [] }

  const creditoMap = new Map<string, { disponiveis: number; total: number }>(
    (creditos ?? []).map((c) => [
      c.student_id,
      {
        disponiveis: c.aulas_disponiveis ?? 0,
        total:
          (c.aulas_cat_a ?? 0) +
          (c.aulas_cat_b ?? 0) +
          (c.aulas_cat_c ?? 0) +
          (c.aulas_cat_d ?? 0) +
          (c.aulas_cat_e ?? 0),
      },
    ])
  )

  const studentDocMap = new Map<string, { id: string; phone: string | null }>(
    (students ?? []).map((s) => [s.document_id, { id: s.id, phone: s.phone ?? null }])
  )

  return agendamentos.map((a) => {
    const doc = a.cpf_cnh ?? a.student_document
    const student = doc ? studentDocMap.get(doc) : undefined
    const cred = student ? creditoMap.get(student.id) : undefined
    return {
      ...a,
      instructorCategory: trueCat,
      aulas_concluidas: doc ? (concluidasMap.get(doc) ?? 0) : 0,
      aulas_agendadas: doc ? (agendadasMap.get(doc) ?? 0) : 0,
      creditos_disponiveis: cred != null ? cred.disponiveis : null,
      creditos_total: cred ? cred.total : null,
      phone: student?.phone ?? null,
      km_inicial: a.km_inicial ?? null,
      km_final: a.km_final ?? null,
      km_rodado: a.km_rodado ?? null,
    }
  })
}

export async function getMapaSemanal(
  instructor_name: string,
  autoescola_id: string,
  weekStartDate?: string
): Promise<DiaSemana[]> {
  const supabase = createServiceClient()

  // Se weekStartDate fornecido, usa ele; senão calcula a segunda-feira da semana atual
  const start = weekStartDate
    ? new Date(weekStartDate + 'T12:00:00')
    : (() => {
        const today = new Date()
        const day = today.getDay()
        const diff = day === 0 ? -6 : 1 - day
        const monday = new Date(today)
        monday.setDate(today.getDate() + diff)
        return monday
      })()

  const dates: string[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    dates.push(d.toISOString().split('T')[0])
  }

  const { data } = await supabase
    .from('agendamentos')
    .select('date, status')
    .eq('autoescola_id', autoescola_id)
    .eq('instructor_name', instructor_name)
    .gte('date', dates[0])
    .lte('date', dates[6])
    .neq('status', 'cancelled')

  const countMap = new Map<string, { total: number; pendentes: number }>()
  for (const row of data ?? []) {
    const entry = countMap.get(row.date) ?? { total: 0, pendentes: 0 }
    entry.total++
    if (row.status === 'scheduled' || row.status === 'in_progress') entry.pendentes++
    countMap.set(row.date, entry)
  }

  const DIAS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB']

  return dates.map((date) => {
    const d = new Date(date + 'T12:00:00')
    const counts = countMap.get(date) ?? { total: 0, pendentes: 0 }
    return {
      date,
      label: DIAS[d.getDay()],
      dayNum: d.getDate(),
      total: counts.total,
      pendentes: counts.pendentes,
    }
  })
}

export async function finalizarAula(
  agendamento_id: string,
  photoDataURL: string,
  signatureDataURL: string,
  instructor_name: string,
  autoescola_id: string
): Promise<ActionResult> {
  const supabase = createServiceClient()

  if (!photoDataURL || !photoDataURL.startsWith('data:image')) return { success: false, error: 'Foto obrigatória.' }
  if (!signatureDataURL || signatureDataURL === 'data:,') return { success: false, error: 'Assinatura obrigatória.' }

  // Detecta extensão/tipo a partir do data URL (ex: data:image/jpeg;base64,...)
  const photoMime = photoDataURL.split(';')[0].replace('data:', '') || 'image/jpeg'
  const ext = photoMime.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg'

  const fotoPath = `${autoescola_id}/${agendamento_id}/foto.${ext}`
  const assinaturaPath = `${autoescola_id}/${agendamento_id}/assinatura.png`

  // Upload da foto (base64 → buffer)
  const photoBase64 = photoDataURL.replace(/^data:image\/[a-z]+;base64,/, '')
  const fotoBuffer = Buffer.from(photoBase64, 'base64')
  const { error: fotoError } = await supabase.storage
    .from('aulas-finalizadas')
    .upload(fotoPath, fotoBuffer, { contentType: photoMime, upsert: true })

  if (fotoError) return { success: false, error: 'Erro ao fazer upload da foto.' }

  const { data: { publicUrl: photoUrl } } = supabase.storage
    .from('aulas-finalizadas')
    .getPublicUrl(fotoPath)

  // Upload da assinatura (base64 PNG → buffer)
  const base64Data = signatureDataURL.replace(/^data:image\/png;base64,/, '')
  const sigBuffer = Buffer.from(base64Data, 'base64')
  const { error: sigError } = await supabase.storage
    .from('aulas-finalizadas')
    .upload(assinaturaPath, sigBuffer, { contentType: 'image/png', upsert: true })

  if (sigError) return { success: false, error: 'Erro ao salvar assinatura.' }

  const { data: { publicUrl: signatureUrl } } = supabase.storage
    .from('aulas-finalizadas')
    .getPublicUrl(assinaturaPath)

  // Atualiza agendamento
  const { error } = await supabase
    .from('agendamentos')
    .update({ status: 'completed', photo_url: photoUrl, signature_url: signatureUrl })
    .eq('id', agendamento_id)
    .eq('autoescola_id', autoescola_id)

  if (error) return { success: false, error: error.message }

  await supabase.from('activity_logs_painel').insert({
    username: instructor_name,
    action_type: 'agendamento',
    description: `Instrutor ${instructor_name} finalizou a aula com evidências (foto + assinatura) — agendamento ${agendamento_id}`,
    autoescola_id,
  })

  revalidatePath('/', 'layout')
  return { success: true, data: undefined }
}

export async function iniciarAula(
  agendamento_id: string,
  km_inicial: number,
  instructor_name: string,
  autoescola_id: string
): Promise<ActionResult> {
  if (!Number.isInteger(km_inicial) || km_inicial < 0) {
    return { success: false, error: 'KM inicial inválido.' }
  }

  const supabase = createServiceClient()

  const { data: ag, error: fetchError } = await supabase
    .from('agendamentos')
    .select('id, status')
    .eq('id', agendamento_id)
    .eq('autoescola_id', autoescola_id)
    .single()

  if (fetchError || !ag) return { success: false, error: 'Agendamento não encontrado.' }
  if (!['scheduled', 'confirmed'].includes(ag.status)) {
    return { success: false, error: 'Aula não pode ser iniciada neste status.' }
  }

  const { error } = await supabase
    .from('agendamentos')
    .update({ status: 'in_progress', km_inicial, iniciado_at: new Date().toISOString() })
    .eq('id', agendamento_id)
    .eq('autoescola_id', autoescola_id)

  if (error) return { success: false, error: error.message }

  await supabase.from('activity_logs_painel').insert({
    username: instructor_name,
    action_type: 'agendamento',
    description: `Instrutor ${instructor_name} iniciou a aula com KM ${km_inicial} (agendamento ${agendamento_id})`,
    metadata: { agendamento_id, km_inicial },
    autoescola_id,
  })

  revalidatePath('/', 'layout')
  return { success: true, data: undefined }
}

export async function atualizarStatusAula(
  agendamento_id: string,
  status: 'completed' | 'absent' | 'cancelled',
  instructor_name: string,
  autoescola_id: string,
  options?: { reason?: string; blockSlot?: boolean }
): Promise<ActionResult> {
  const supabase = createServiceClient()

  if (status === 'cancelled') {
    return cancelarAgendamentoComOpcoes(agendamento_id, autoescola_id, {
      blockSlot: options?.blockSlot || false,
      reason: options?.reason
    })
  }

  // Fetch agendamento to get student doc + category (needed for credit refund)
  const { data: agendamento, error: fetchError } = await supabase
    .from('agendamentos')
    .select('cpf_cnh, student_document, instructorCategory, instructor_name, autoescola_id')
    .eq('id', agendamento_id)
    .eq('autoescola_id', autoescola_id)
    .single()

  if (fetchError || !agendamento) return { success: false, error: 'Agendamento não encontrado.' }

  const { error } = await supabase
    .from('agendamentos')
    .update({ status })
    .eq('id', agendamento_id)
    .eq('autoescola_id', autoescola_id)

  if (error) return { success: false, error: error.message }



  const actionLabels: Record<string, string> = {
    completed: 'finalizou a aula',
    absent: 'registrou falta',
    cancelled: 'desmarcou a aula',
  }

  await supabase.from('activity_logs_painel').insert({
    username: instructor_name,
    action_type: 'agendamento',
    description: `Instrutor ${instructor_name} ${actionLabels[status] ?? 'atualizou'} (agendamento ${agendamento_id})`,
    autoescola_id,
  })

  revalidatePath('/', 'layout')
  return { success: true, data: undefined }
}
