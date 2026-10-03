import { describe, expect, it } from 'vitest'
import { buscarExamesBancaAgendados } from '../exameBanca'
import { formatarExameBanca } from '../exameBancaTypes'

type Row = { date: string; time_slot: string; instructor_name: string | null; cpf_cnh: string | null; student_document: string | null }

// Query builder mínimo: registra os filtros e devolve as linhas já ordenadas
// (a ordenação real é feita pelo banco via .order()).
function fakeSupabase(rows: Row[]) {
  const chamadas: { metodo: string; args: unknown[] }[] = []
  const builder: Record<string, unknown> = {}
  for (const metodo of ['select', 'eq', 'in', 'gte', 'or', 'order']) {
    builder[metodo] = (...args: unknown[]) => {
      chamadas.push({ metodo, args })
      return builder
    }
  }
  builder.then = (resolve: (v: { data: Row[] }) => void) => resolve({ data: rows })
  const supabase = { from: () => builder } as never
  return { supabase, chamadas }
}

describe('buscarExamesBancaAgendados', () => {
  it('retorna o exame mais próximo por documento, casando cpf_cnh ou student_document', async () => {
    const { supabase, chamadas } = fakeSupabase([
      { date: '2026-10-10', time_slot: '08:00', instructor_name: 'João', cpf_cnh: '111', student_document: null },
      { date: '2026-10-20', time_slot: '09:00', instructor_name: 'João', cpf_cnh: '111', student_document: null },
      { date: '2026-10-15', time_slot: '10:00', instructor_name: null, cpf_cnh: null, student_document: '222' },
    ])

    const mapa = await buscarExamesBancaAgendados(supabase, 'esc-1', ['111', '222', '333'], '2026-10-05')

    expect(mapa.get('111')).toEqual({ date: '2026-10-10', time_slot: '08:00', instructor_name: 'João' })
    expect(mapa.get('222')).toEqual({ date: '2026-10-15', time_slot: '10:00', instructor_name: null })
    expect(mapa.has('333')).toBe(false)

    expect(chamadas).toContainEqual({ metodo: 'eq', args: ['tipo', 'banca'] })
    expect(chamadas).toContainEqual({ metodo: 'in', args: ['status', ['scheduled', 'confirmed']] })
    expect(chamadas).toContainEqual({ metodo: 'gte', args: ['date', '2026-10-05'] })
  })

  it('ignora documentos que não são só dígitos (filtro .or do PostgREST)', async () => {
    const { supabase, chamadas } = fakeSupabase([])
    await buscarExamesBancaAgendados(supabase, 'esc-1', ['111', '1),cpf_cnh.neq.(x', ''], '2026-10-05')
    const or = chamadas.find((c) => c.metodo === 'or')
    expect(or?.args[0]).toBe('cpf_cnh.in.(111),student_document.in.(111)')
  })

  it('não consulta o banco sem documentos válidos', async () => {
    const { supabase, chamadas } = fakeSupabase([])
    const mapa = await buscarExamesBancaAgendados(supabase, 'esc-1', ['abc'], '2026-10-05')
    expect(mapa.size).toBe(0)
    expect(chamadas).toHaveLength(0)
  })
})

describe('formatarExameBanca', () => {
  it('formata dia/mês e horário', () => {
    expect(formatarExameBanca({ date: '2026-10-09', time_slot: '07:30', instructor_name: null })).toBe('09/10 às 07:30')
  })
})
