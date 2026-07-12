'use server'

import { createServiceClient } from '@/lib/supabase/server'

export interface EstatisticaBarra {
  label: string // 'Sem 1' ou 'jun/26'
  concluidas: number
  desmarcadas: number
  faltas: number
}

export interface AulaConcluidaDetalhe {
  id: string
  date: string
  time_slot: string
  student_name: string
}

export interface EstatisticasInstrutor {
  concluidas: number
  desmarcadas: number
  faltas: number
  agendadas: number
  em_andamento: number
  total: number
  taxaConclusao: number // 0–100
  serie: EstatisticaBarra[]
  granularidade: 'semana' | 'mes'
  // KM (alinhado com getKmStats)
  kmTotal: number
  kmMedia: number
  aulasComKm: number
  kmInconsistencias: number
  // Hora/Aula (opcional — só preenchido quando o admin define um valor)
  valorHoraAula: number | null
  valorTotalReceber: number | null
  aulasConcluidasDetalhe: AulaConcluidaDetalhe[]
}

export interface EstatisticasFiltro {
  date_start: string // YYYY-MM-DD
  date_end: string // YYYY-MM-DD
}

const MESES_PT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

// Distância máxima plausível para uma aula prática (km). Acima disso é erro de
// digitação no hodômetro (ex.: km_final com um dígito a mais) e é descartado da média.
const KM_MAX_AULA = 200

function labelMes(mes: string): string {
  // mes = 'YYYY-MM'
  const [ano, m] = mes.split('-')
  const idx = parseInt(m, 10) - 1
  return `${MESES_PT[idx] ?? '?'}/${ano.slice(2)}`
}

export async function getEstatisticasInstrutor(
  instructor_name: string,
  autoescola_id: string,
  filtro: EstatisticasFiltro
): Promise<EstatisticasInstrutor> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('agendamentos')
    .select('id, date, time_slot, student_name, status, km_inicial, km_final, km_rodado')
    .eq('autoescola_id', autoescola_id)
    .eq('instructor_name', instructor_name)
    .gte('date', filtro.date_start)
    .lte('date', filtro.date_end)

  if (error) throw new Error(error.message)

  const rows = data ?? []

  const { data: instrutorRow } = await supabase
    .from('instructors')
    .select('valor_hora_aula')
    .eq('autoescola_id', autoescola_id)
    .eq('name', instructor_name)
    .maybeSingle()

  // Postgres `numeric` chega como string via PostgREST — normaliza para number.
  const valorHoraAula = instrutorRow?.valor_hora_aula != null ? Number(instrutorRow.valor_hora_aula) : null

  const concluidas = rows.filter((r) => r.status === 'completed').length
  const desmarcadas = rows.filter((r) => r.status === 'cancelled').length
  const faltas = rows.filter((r) => r.status === 'absent').length
  const agendadas = rows.filter((r) => r.status === 'scheduled' || r.status === 'confirmed').length
  const em_andamento = rows.filter((r) => r.status === 'in_progress').length
  const total = rows.length

  // Mesma fórmula de taxa em getDesempenhoInstrutores
  const baseTaxa = concluidas + faltas + desmarcadas
  const taxaConclusao = baseTaxa > 0 ? Math.round((concluidas / baseTaxa) * 100) : 0

  // Granularidade do gráfico: períodos curtos (≤ ~45 dias, como "este mês"/"mês
  // passado") são quebrados em semanas; períodos longos, em meses.
  const spanDias =
    Math.round(
      (new Date(filtro.date_end + 'T12:00:00').getTime() - new Date(filtro.date_start + 'T12:00:00').getTime()) / 86400000
    ) + 1
  const granularidade: 'semana' | 'mes' = spanDias <= 45 ? 'semana' : 'mes'

  function acumular(map: Map<string, { concluidas: number; desmarcadas: number; faltas: number }>, key: string, status: string) {
    if (!map.has(key)) map.set(key, { concluidas: 0, desmarcadas: 0, faltas: 0 })
    const e = map.get(key)!
    if (status === 'completed') e.concluidas++
    else if (status === 'cancelled') e.desmarcadas++
    else if (status === 'absent') e.faltas++
  }

  let serie: EstatisticaBarra[]
  if (granularidade === 'semana') {
    // 4 semanas por dia-do-mês: 1–7, 8–14, 15–21, 22–fim
    const semMap = new Map<string, { concluidas: number; desmarcadas: number; faltas: number }>()
    for (const r of rows) {
      const dia = parseInt((r.date ?? '').slice(8, 10), 10)
      if (!dia) continue
      const wk = Math.min(Math.floor((dia - 1) / 7), 3)
      acumular(semMap, String(wk), r.status)
    }
    serie = [0, 1, 2, 3].map((i) => {
      const v = semMap.get(String(i)) ?? { concluidas: 0, desmarcadas: 0, faltas: 0 }
      return { label: `Sem ${i + 1}`, ...v }
    })
  } else {
    const mesMap = new Map<string, { concluidas: number; desmarcadas: number; faltas: number }>()
    for (const r of rows) {
      const mes = (r.date ?? '').slice(0, 7) // 'YYYY-MM'
      if (!mes) continue
      acumular(mesMap, mes, r.status)
    }
    serie = Array.from(mesMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([mes, v]) => ({ label: labelMes(mes), ...v }))
  }

  // KM — distância por aula = km_final - km_inicial (nunca o valor total do
  // hodômetro). Só conta aulas concluídas com leitura inicial e final válidas e
  // diferença dentro de uma faixa plausível; outliers de digitação são descartados.
  const concluidasRows = rows.filter((r) => r.status === 'completed')
  const aulasComKmRows = concluidasRows.filter(
    (r) =>
      r.km_inicial != null &&
      r.km_final != null &&
      r.km_final - r.km_inicial > 0 &&
      r.km_final - r.km_inicial <= KM_MAX_AULA
  )
  const kmTotal = aulasComKmRows.reduce((acc, r) => acc + (r.km_final! - r.km_inicial!), 0)
  const kmMedia = aulasComKmRows.length > 0 ? Math.round(kmTotal / aulasComKmRows.length) : 0
  // Aulas iniciadas (têm km_inicial) cuja quilometragem ficou inválida/absurda.
  const kmInconsistencias = concluidasRows.filter(
    (r) =>
      r.km_inicial != null &&
      (r.km_final == null || r.km_final - r.km_inicial <= 0 || r.km_final - r.km_inicial > KM_MAX_AULA)
  ).length

  const aulasConcluidasDetalhe: AulaConcluidaDetalhe[] = concluidasRows
    .map((r) => ({
      id: r.id,
      date: r.date,
      time_slot: r.time_slot,
      student_name: r.student_name,
    }))
    .sort((a, b) => a.date.localeCompare(b.date) || a.time_slot.localeCompare(b.time_slot))

  const valorTotalReceber = valorHoraAula != null ? valorHoraAula * concluidas : null

  return {
    concluidas,
    desmarcadas,
    faltas,
    agendadas,
    em_andamento,
    total,
    taxaConclusao,
    serie,
    granularidade,
    kmTotal,
    kmMedia,
    aulasComKm: aulasComKmRows.length,
    kmInconsistencias,
    valorHoraAula,
    valorTotalReceber,
    aulasConcluidasDetalhe,
  }
}
