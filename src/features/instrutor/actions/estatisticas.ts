'use server'

import { createServiceClient } from '@/lib/supabase/server'

export interface EstatisticaMes {
  mes: string // 'YYYY-MM'
  label: string // 'jun/26'
  total: number
  concluidas: number
}

export interface EstatisticasInstrutor {
  concluidas: number
  desmarcadas: number
  faltas: number
  agendadas: number
  em_andamento: number
  total: number
  taxaConclusao: number // 0–100
  porMes: EstatisticaMes[]
  // KM (alinhado com getKmStats)
  kmTotal: number
  kmMedia: number
  aulasComKm: number
  kmInconsistencias: number
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
    .select('date, status, km_inicial, km_final, km_rodado')
    .eq('autoescola_id', autoescola_id)
    .eq('instructor_name', instructor_name)
    .gte('date', filtro.date_start)
    .lte('date', filtro.date_end)

  if (error) throw new Error(error.message)

  const rows = data ?? []

  const concluidas = rows.filter((r) => r.status === 'completed').length
  const desmarcadas = rows.filter((r) => r.status === 'cancelled').length
  const faltas = rows.filter((r) => r.status === 'absent').length
  const agendadas = rows.filter((r) => r.status === 'scheduled' || r.status === 'confirmed').length
  const em_andamento = rows.filter((r) => r.status === 'in_progress').length
  const total = rows.length

  // Mesma fórmula de taxa em getDesempenhoInstrutores
  const baseTaxa = concluidas + faltas + desmarcadas
  const taxaConclusao = baseTaxa > 0 ? Math.round((concluidas / baseTaxa) * 100) : 0

  // Agendamentos por mês (cronológico)
  const mesMap = new Map<string, { total: number; concluidas: number }>()
  for (const r of rows) {
    const mes = (r.date ?? '').slice(0, 7) // 'YYYY-MM'
    if (!mes) continue
    if (!mesMap.has(mes)) mesMap.set(mes, { total: 0, concluidas: 0 })
    const e = mesMap.get(mes)!
    e.total++
    if (r.status === 'completed') e.concluidas++
  }
  const porMes: EstatisticaMes[] = Array.from(mesMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([mes, v]) => ({ mes, label: labelMes(mes), total: v.total, concluidas: v.concluidas }))

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

  return {
    concluidas,
    desmarcadas,
    faltas,
    agendadas,
    em_andamento,
    total,
    taxaConclusao,
    porMes,
    kmTotal,
    kmMedia,
    aulasComKm: aulasComKmRows.length,
    kmInconsistencias,
  }
}
