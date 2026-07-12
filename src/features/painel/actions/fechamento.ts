'use server'

import { createServiceClient } from '@/lib/supabase/server'

export interface FechamentoAula {
  id: string
  date: string
  time_slot: string
  student_name: string
  instructor_name: string | null
  instructorCategory: string | null
  km_inicial: number | null
  km_final: number | null
  km_rodado: number | null
  status: string
}

export interface FechamentoInstrutor {
  instructor_name: string
  categoria: string | null
  total_aulas: number
  km_total: number
  km_medio: number
  aulas: FechamentoAula[]
  valor_hora_aula: number | null
  valor_total_pagar: number | null
}

export interface FechamentoMensalData {
  mes: number
  ano: number
  total_aulas: number
  km_total: number
  instrutores: FechamentoInstrutor[]
  valor_total_pagar_geral: number
}

export async function getFechamentoMensal(
  autoescola_id: string,
  mes: number,
  ano: number
): Promise<FechamentoMensalData> {
  const supabase = createServiceClient()

  const dateStart = `${ano}-${String(mes).padStart(2, '0')}-01`
  const lastDay = new Date(ano, mes, 0).getDate()
  const dateEnd = `${ano}-${String(mes).padStart(2, '0')}-${lastDay}`

  const { data } = await supabase
    .from('agendamentos')
    .select('id, date, time_slot, student_name, instructor_name, instructorCategory, km_inicial, km_final, km_rodado, status')
    .eq('autoescola_id', autoescola_id)
    .eq('status', 'completed')
    .gte('date', dateStart)
    .lte('date', dateEnd)
    .not('instructor_name', 'is', null)
    .order('date', { ascending: true })
    .order('time_slot', { ascending: true })

  const { data: insts } = await supabase
    .from('instructors')
    .select('name, category, valor_hora_aula')
    .eq('autoescola_id', autoescola_id)
  const catMap = new Map((insts ?? []).map((i) => [i.name, i.category]))
  // Postgres `numeric` chega como string via PostgREST — normaliza para number.
  const valorMap = new Map(
    (insts ?? []).map((i) => [i.name, i.valor_hora_aula != null ? Number(i.valor_hora_aula) : null])
  )

  const rows = (data ?? []) as FechamentoAula[]

  const map = new Map<string, FechamentoInstrutor>()
  for (const row of rows) {
    const key = row.instructor_name!
    if (!map.has(key)) {
      map.set(key, {
        instructor_name: key,
        categoria: catMap.get(key) ?? row.instructorCategory,
        total_aulas: 0,
        km_total: 0,
        km_medio: 0,
        aulas: [],
        valor_hora_aula: valorMap.get(key) ?? null,
        valor_total_pagar: null,
      })
    }
    const entry = map.get(key)!
    entry.total_aulas++
    entry.km_total += row.km_rodado ?? 0
    entry.aulas.push(row)
  }

  const instrutores = Array.from(map.values()).map((e) => ({
    ...e,
    km_medio: e.total_aulas > 0 ? Math.round(e.km_total / e.total_aulas) : 0,
    valor_total_pagar: e.valor_hora_aula != null ? e.valor_hora_aula * e.total_aulas : null,
  })).sort((a, b) => b.km_total - a.km_total)

  const valor_total_pagar_geral = instrutores.reduce((acc, i) => acc + (i.valor_total_pagar ?? 0), 0)

  return {
    mes,
    ano,
    total_aulas: rows.length,
    km_total: rows.reduce((acc, r) => acc + (r.km_rodado ?? 0), 0),
    instrutores,
    valor_total_pagar_geral,
  }
}

