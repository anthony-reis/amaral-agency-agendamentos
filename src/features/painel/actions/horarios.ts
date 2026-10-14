'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { getCurrentUsername, assertPodeEditar } from './authPainel'
import type { HorarioDisponivel, ActionResult } from '../types'
import { conflitoComBloqueio, mensagemConflito, parseWeekdaysIso, conflitoComHorario, mensagemConflitoHorario, bloqueiosParaData, type BloqueioSemanalLinha } from '@/lib/horariosDia'

const HORARIO_RE = /^([01]\d|2[0-3]):[0-5]\d$/
const NOMES_DIAS = ['', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const DATA_RE = /^\d{4}-\d{2}-\d{2}$/

const hojeSP = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
const formatarData = (d: string) => d.split('-').reverse().join('/')

/** null = ok; senão a mensagem de erro para uma data de horário pontual. */
function erroDeData(data: string): string | null {
  if (!DATA_RE.test(data) || isNaN(new Date(data + 'T12:00:00').getTime())) return 'Data inválida.'
  if (data < hojeSP()) return 'Escolha uma data de hoje em diante.'
  return null
}

/** Ordena/dedup e converte "todos os 7 dias" ou vazio em null (= todos os dias). */
function normalizarDias(dias: number[] | null | undefined): number[] | null {
  const u = [...new Set((dias ?? []).filter((d) => Number.isInteger(d) && d >= 1 && d <= 7))].sort()
  return u.length === 0 || u.length === 7 ? null : u
}

async function carregarBloqueiosSemanais(autoescola_id: string): Promise<BloqueioSemanalLinha[]> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('blockedTimeSlots')
    .select('instructor, vehicle_type, time_slot, weekdays, reason')
    .eq('autoescola_id', autoescola_id)
    .eq('status', 'Bloqueado')
    .eq('date', 'RECORRENTE_DIA_SEMANA')
  return (data ?? []).map((b) => ({ ...b, weekdays: parseWeekdaysIso(b.weekdays) }))
}

/** Bloqueios que valem numa data específica: semanais do dia da semana + pontuais daquela data. */
async function carregarBloqueiosDaData(autoescola_id: string, data: string): Promise<BloqueioSemanalLinha[]> {
  const supabase = createServiceClient()
  const { data: rows } = await supabase
    .from('blockedTimeSlots')
    .select('instructor, vehicle_type, time_slot, weekdays, reason, date')
    .eq('autoescola_id', autoescola_id)
    .eq('status', 'Bloqueado')
    .or(`date.eq.${data},date.eq.RECORRENTE_DIA_SEMANA`)
  return bloqueiosParaData(
    data,
    (rows ?? []).map((b) => ({ ...b, date: b.date === 'RECORRENTE_DIA_SEMANA' ? null : b.date, weekdays: parseWeekdaysIso(b.weekdays) }))
  )
}

async function categoriaDoInstrutor(autoescola_id: string, instrutor: string | null): Promise<string> {
  if (!instrutor) return 'AMBOS'
  const supabase = createServiceClient()
  const { data } = await supabase.from('instructors').select('category').eq('autoescola_id', autoescola_id).eq('name', instrutor).maybeSingle()
  return data?.category ?? 'AMBOS'
}

/** Mensagem de erro se o horário cair em cima de um bloqueio semanal; null se estiver livre. */
async function erroDeBloqueio(autoescola_id: string, instrutor: string | null, horario: string, dias: number[] | null, data?: string | null): Promise<string | null> {
  const [bloqueios, categoria] = await Promise.all([
    data ? carregarBloqueiosDaData(autoescola_id, data) : carregarBloqueiosSemanais(autoescola_id),
    categoriaDoInstrutor(autoescola_id, instrutor),
  ])
  const c = conflitoComBloqueio(horario, data ? bloqueios[0]?.weekdays ?? dias : dias, instrutor, categoria, bloqueios)
  return c ? `${mensagemConflito(horario, c)}${data ? ` (${formatarData(data)})` : ''}` : null
}

/** Mensagem de erro se o horário ocupar o intervalo de outro horário do mesmo instrutor (ou do global) nos mesmos dias. */
async function erroDeSobreposicao(
  autoescola_id: string,
  instrutor: string | null,
  horario: string,
  dias: number[] | null,
  ignorarId?: string,
  dataPontual?: string | null
): Promise<string | null> {
  const supabase = createServiceClient()
  let q = supabase.from('horarios_disponiveis').select('id, horario, dias_semana, data').eq('autoescola_id', autoescola_id)
  q = instrutor ? q.eq('instrutor', instrutor) : q.is('instrutor', null)
  const { data } = await q
  const c = conflitoComHorario(horario, dias, (data ?? []) as Array<{ id: string; horario: string; dias_semana: number[] | null; data: string | null }>, ignorarId, dataPontual)
  return c ? mensagemConflitoHorario(horario, c) : null
}

function descreverDias(dias: number[] | null): string {
  return dias ? dias.map((d) => NOMES_DIAS[d]).join(', ') : 'todos os dias'
}

export async function listarHorarios(autoescola_id: string): Promise<HorarioDisponivel[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('horarios_disponiveis')
    .select('*')
    .eq('autoescola_id', autoescola_id)
    .order('instrutor', { nullsFirst: true })
    .order('ordem')

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function criarHorario(
  horario: string,
  instrutor: string | null,
  autoescola_id: string,
  diasSemana: number[] | null = null,
  dataPontual: string | null = null
): Promise<ActionResult<HorarioDisponivel>> {
  const guard = await assertPodeEditar('operacao')
  if (!guard.ok) return { success: false, error: guard.error }

  if (!HORARIO_RE.test(horario.trim())) return { success: false, error: 'Horário inválido. Use HH:MM (ex: 13:10).' }
  if (dataPontual) {
    const erroData = erroDeData(dataPontual)
    if (erroData) return { success: false, error: erroData }
  }
  const dias = dataPontual ? null : normalizarDias(diasSemana)

  const conflito = await erroDeBloqueio(autoescola_id, instrutor, horario.trim(), dias, dataPontual)
  if (conflito) return { success: false, error: conflito }

  const sobreposto = await erroDeSobreposicao(autoescola_id, instrutor, horario.trim(), dias, undefined, dataPontual)
  if (sobreposto) return { success: false, error: sobreposto }

  const supabase = createServiceClient()

  // Get next ordem for this instrutor
  const { data: existing } = await supabase
    .from('horarios_disponiveis')
    .select('ordem')
    .eq('autoescola_id', autoescola_id)
    .eq('instrutor', instrutor ?? '')
    .order('ordem', { ascending: false })
    .limit(1)

  const nextOrdem = existing && existing.length > 0 ? existing[0].ordem + 1 : 1

  const { data, error } = await supabase
    .from('horarios_disponiveis')
    .insert({
      horario: horario.trim(),
      instrutor,
      ordem: nextOrdem,
      ativo: true,
      dias_semana: dias,
      data: dataPontual,
      autoescola_id,
    })
    .select()
    .single()

  if (error) return { success: false, error: 'Erro ao criar horário.' }

  const userAct = await getCurrentUsername()
  await supabase.from('activity_logs_painel').insert({
    username: userAct,
    action_type: 'usuarios',
    description: `Horário criado: ${horario.trim()} para ${instrutor || 'GERAL'} (${dataPontual ? `só em ${formatarData(dataPontual)}` : descreverDias(dias)})`,
    autoescola_id,
  })

  return { success: true, data }
}

export async function toggleHorario(
  id: string,
  ativo: boolean,
  autoescola_id: string
): Promise<ActionResult> {
  const guard = await assertPodeEditar('operacao')
  if (!guard.ok) return { success: false, error: guard.error }

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('horarios_disponiveis')
    .update({ ativo })
    .eq('id', id)
    .eq('autoescola_id', autoescola_id)

  if (error) return { success: false, error: 'Erro ao atualizar horário.' }

  const userAct = await getCurrentUsername()
  await supabase.from('activity_logs_painel').insert({
    username: userAct,
    action_type: 'usuarios',
    description: `Horário (ID: ${id}) ${ativo ? 'ativado' : 'desativado'}`,
    autoescola_id,
  })

  return { success: true, data: undefined }
}

export async function excluirHorario(
  id: string,
  autoescola_id: string
): Promise<ActionResult> {
  const guard = await assertPodeEditar('operacao')
  if (!guard.ok) return { success: false, error: guard.error }

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('horarios_disponiveis')
    .delete()
    .eq('id', id)
    .eq('autoescola_id', autoescola_id)

  if (error) return { success: false, error: 'Erro ao excluir horário.' }

  const userAct = await getCurrentUsername()
  await supabase.from('activity_logs_painel').insert({
    username: userAct,
    action_type: 'usuarios',
    description: `Horário excluído (ID: ${id})`,
    autoescola_id,
  })

  return { success: true, data: undefined }
}

export async function atualizarHorario(
  id: string,
  input: { horario: string; dias_semana: number[] | null; data?: string | null },
  autoescola_id: string
): Promise<ActionResult<HorarioDisponivel>> {
  const guard = await assertPodeEditar('operacao')
  if (!guard.ok) return { success: false, error: guard.error }

  const horario = input.horario.trim()
  if (!HORARIO_RE.test(horario)) return { success: false, error: 'Horário inválido. Use HH:MM (ex: 13:10).' }

  const supabase = createServiceClient()
  const { data: atual } = await supabase
    .from('horarios_disponiveis')
    .select('instrutor, data')
    .eq('id', id)
    .eq('autoescola_id', autoescola_id)
    .single()
  if (!atual) return { success: false, error: 'Horário não encontrado.' }

  // Horário pontual continua pontual (só a data pode mudar); recorrente continua recorrente.
  const dataFinal: string | null = atual.data ? (input.data ?? atual.data) : null
  if (dataFinal && dataFinal !== atual.data) {
    const erroData = erroDeData(dataFinal)
    if (erroData) return { success: false, error: erroData }
  }
  const dias = dataFinal ? null : normalizarDias(input.dias_semana)

  const conflito = await erroDeBloqueio(autoescola_id, atual.instrutor, horario, dias, dataFinal)
  if (conflito) return { success: false, error: conflito }
  const sobreposto = await erroDeSobreposicao(autoescola_id, atual.instrutor, horario, dias, id, dataFinal)
  if (sobreposto) return { success: false, error: sobreposto }

  const { data, error } = await supabase
    .from('horarios_disponiveis')
    .update({ horario, dias_semana: dias, data: dataFinal })
    .eq('id', id)
    .eq('autoescola_id', autoescola_id)
    .select()
    .single()

  if (error || !data) return { success: false, error: 'Erro ao atualizar horário.' }

  const userAct = await getCurrentUsername()
  await supabase.from('activity_logs_painel').insert({
    username: userAct,
    action_type: 'usuarios',
    description: `Horário atualizado: ${horario} para ${data.instrutor || 'GERAL'} (${dataFinal ? `só em ${formatarData(dataFinal)}` : descreverDias(dias)})`,
    autoescola_id,
  })

  return { success: true, data }
}

/** Dá ao instrutor uma agenda própria a partir dos horários ativos do global (que passa a ser só o cardápio). */
export async function copiarGlobalParaInstrutor(
  instrutor: string,
  autoescola_id: string
): Promise<ActionResult<HorarioDisponivel[]>> {
  const guard = await assertPodeEditar('operacao')
  if (!guard.ok) return { success: false, error: guard.error }

  const supabase = createServiceClient()
  const { data: globais } = await supabase
    .from('horarios_disponiveis')
    .select('horario, ordem, dias_semana')
    .eq('autoescola_id', autoescola_id)
    .is('instrutor', null)
    .is('data', null)
    .eq('ativo', true)

  const { count } = await supabase
    .from('horarios_disponiveis')
    .select('id', { count: 'exact', head: true })
    .eq('autoescola_id', autoescola_id)
    .eq('instrutor', instrutor)
  if ((count ?? 0) > 0) return { success: false, error: 'Este instrutor já tem horários próprios.' }
  if (!globais || globais.length === 0) return { success: false, error: 'Não há horários globais para copiar.' }

  const [bloqueios, categoria] = await Promise.all([carregarBloqueiosSemanais(autoescola_id), categoriaDoInstrutor(autoescola_id, instrutor)])
  const livres = globais.filter((g) => !conflitoComBloqueio(g.horario, g.dias_semana, instrutor, categoria, bloqueios))
  if (livres.length === 0) return { success: false, error: 'Todos os horários globais caem em bloqueios deste instrutor.' }

  const { data, error } = await supabase
    .from('horarios_disponiveis')
    .insert(livres.map((g) => ({ horario: g.horario, ordem: g.ordem, dias_semana: g.dias_semana, ativo: true, instrutor, autoescola_id })))
    .select()
  if (error || !data) return { success: false, error: 'Erro ao copiar horários.' }

  const userAct = await getCurrentUsername()
  await supabase.from('activity_logs_painel').insert({
    username: userAct,
    action_type: 'usuarios',
    description: `Agenda própria criada para ${instrutor} a partir do global (${data.length} horários)`,
    autoescola_id,
  })
  return { success: true, data }
}

/**
 * Move só a ocorrência de um dia (arrastar na agenda): se o horário vale vários dias, ele continua
 * nos outros e um novo horário é criado para o dia de destino; se vale só aquele dia, é atualizado no lugar.
 */
export async function moverOcorrenciaHorario(
  id: string,
  input: { diaOrigem: number; novoHorario: string; diaDestino: number; dataDestino?: string },
  autoescola_id: string
): Promise<ActionResult<{ atualizado: HorarioDisponivel; criado: HorarioDisponivel | null }>> {
  const guard = await assertPodeEditar('operacao')
  if (!guard.ok) return { success: false, error: guard.error }

  const { diaOrigem, diaDestino } = input
  const novoHorario = input.novoHorario.trim()
  if (!HORARIO_RE.test(novoHorario)) return { success: false, error: 'Horário inválido. Use HH:MM (ex: 13:10).' }
  if (![diaOrigem, diaDestino].every((d) => Number.isInteger(d) && d >= 1 && d <= 7)) {
    return { success: false, error: 'Dia da semana inválido.' }
  }

  const supabase = createServiceClient()
  const { data: atual } = await supabase
    .from('horarios_disponiveis')
    .select('*')
    .eq('id', id)
    .eq('autoescola_id', autoescola_id)
    .single()
  if (!atual) return { success: false, error: 'Horário não encontrado.' }

  // Horário pontual: muda de hora e/ou de data, sempre no lugar
  if (atual.data) {
    const dataFinal = input.dataDestino ?? atual.data
    if (novoHorario === atual.horario && dataFinal === atual.data) return { success: true, data: { atualizado: atual, criado: null } }
    if (dataFinal !== atual.data) {
      const erroData = erroDeData(dataFinal)
      if (erroData) return { success: false, error: erroData }
    }
    const bloqueadoP = await erroDeBloqueio(autoescola_id, atual.instrutor, novoHorario, null, dataFinal)
    if (bloqueadoP) return { success: false, error: bloqueadoP }
    const sobrepostoP = await erroDeSobreposicao(autoescola_id, atual.instrutor, novoHorario, null, id, dataFinal)
    if (sobrepostoP) return { success: false, error: sobrepostoP }
    const { data: movido, error: erroMover } = await supabase
      .from('horarios_disponiveis')
      .update({ horario: novoHorario, data: dataFinal })
      .eq('id', id)
      .eq('autoescola_id', autoescola_id)
      .select()
      .single()
    if (erroMover || !movido) return { success: false, error: 'Erro ao mover horário.' }
    const userP = await getCurrentUsername()
    await supabase.from('activity_logs_painel').insert({
      username: userP,
      action_type: 'usuarios',
      description: `Horário pontual movido: ${atual.horario} (${formatarData(atual.data)}) → ${novoHorario} (${formatarData(dataFinal)}) de ${atual.instrutor || 'GERAL'}`,
      autoescola_id,
    })
    return { success: true, data: { atualizado: movido, criado: null } }
  }

  const diasAtuais: number[] = atual.dias_semana && atual.dias_semana.length > 0 ? atual.dias_semana : [1, 2, 3, 4, 5, 6, 7]
  if (!diasAtuais.includes(diaOrigem)) return { success: false, error: 'Esse horário não vale nesse dia.' }
  if (novoHorario === atual.horario && diaOrigem === diaDestino) {
    return { success: true, data: { atualizado: atual, criado: null } }
  }

  // Valida só o destino (os outros dias do horário não mudam)
  const bloqueado = await erroDeBloqueio(autoescola_id, atual.instrutor, novoHorario, [diaDestino])
  if (bloqueado) return { success: false, error: bloqueado }
  const sobreposto = await erroDeSobreposicao(autoescola_id, atual.instrutor, novoHorario, [diaDestino], diaDestino === diaOrigem ? id : undefined)
  if (sobreposto) return { success: false, error: sobreposto }

  const userAct = await getCurrentUsername()
  const log = (descricao: string) =>
    supabase.from('activity_logs_painel').insert({ username: userAct, action_type: 'usuarios', description: descricao, autoescola_id })

  // Vale só aquele dia: atualiza no lugar
  if (diasAtuais.length === 1) {
    const { data, error } = await supabase
      .from('horarios_disponiveis')
      .update({ horario: novoHorario, dias_semana: [diaDestino] })
      .eq('id', id)
      .eq('autoescola_id', autoescola_id)
      .select()
      .single()
    if (error || !data) return { success: false, error: 'Erro ao mover horário.' }
    await log(`Horário movido: ${atual.horario} → ${novoHorario} (${NOMES_DIAS[diaOrigem]} → ${NOMES_DIAS[diaDestino]}) de ${atual.instrutor || 'GERAL'}`)
    return { success: true, data: { atualizado: data, criado: null } }
  }

  // Vale vários dias: cria a ocorrência nova e tira o dia de origem do original
  const { data: criado, error: erroCriar } = await supabase
    .from('horarios_disponiveis')
    .insert({
      horario: novoHorario,
      instrutor: atual.instrutor,
      ordem: atual.ordem,
      ativo: atual.ativo,
      dias_semana: [diaDestino],
      autoescola_id,
    })
    .select()
    .single()
  if (erroCriar || !criado) return { success: false, error: 'Erro ao mover horário.' }

  const restantes = diasAtuais.filter((d) => d !== diaOrigem)
  const { data: atualizado, error: erroAtualizar } = await supabase
    .from('horarios_disponiveis')
    .update({ dias_semana: restantes.length === 7 ? null : restantes })
    .eq('id', id)
    .eq('autoescola_id', autoescola_id)
    .select()
    .single()
  if (erroAtualizar || !atualizado) {
    await supabase.from('horarios_disponiveis').delete().eq('id', criado.id).eq('autoescola_id', autoescola_id)
    return { success: false, error: 'Erro ao mover horário.' }
  }

  await log(`Horário movido (só um dia): ${atual.horario} → ${novoHorario} (${NOMES_DIAS[diaOrigem]} → ${NOMES_DIAS[diaDestino]}) de ${atual.instrutor || 'GERAL'}`)
  return { success: true, data: { atualizado, criado } }
}
