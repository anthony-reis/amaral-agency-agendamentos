import { describe, expect, it } from 'vitest'
import { agruparPorInstrutor, mensagemVinculoImpossivel, rotuloAulas, vinculoImpossivel, type AulaFutura } from '../vinculoInstrutor'

const aula = (id: string, date: string, time_slot: string, instructor_name: string): AulaFutura => ({
  id, date, time_slot, instructor_name, instructorCategory: 'CARRO', status: 'scheduled',
})

describe('vínculo aluno ↔ instrutor', () => {
  it('sem aulas ou com um só instrutor pode vincular', () => {
    expect(vinculoImpossivel(agruparPorInstrutor([]))).toBe(false)
    const g = agruparPorInstrutor([aula('1', '2026-11-05', '10:00', 'Rafael'), aula('2', '2026-11-09', '09:00', 'Rafael')])
    expect(vinculoImpossivel(g)).toBe(false)
    expect(g).toHaveLength(1)
    expect(g[0].aulas).toHaveLength(2)
  })

  it('com instrutores diferentes não pode vincular e agrupa por instrutor, do que tem mais aulas', () => {
    const g = agruparPorInstrutor([
      aula('1', '2026-11-06', '14:00', 'Camila'),
      aula('2', '2026-11-09', '09:00', 'Rafael'),
      aula('3', '2026-11-05', '10:00', 'Rafael'),
    ])
    expect(vinculoImpossivel(g)).toBe(true)
    expect(g.map((x) => x.instrutor)).toEqual(['Rafael', 'Camila'])
    expect(g[0].aulas.map((a) => a.id)).toEqual(['3', '2']) // ordenadas por data
    expect(mensagemVinculoImpossivel(g)).toContain('2 instrutores diferentes (Rafael: 2 aulas · Camila: 1 aula)')
  })

  it('rótulo de aulas no singular e plural', () => {
    expect(rotuloAulas(1)).toBe('1 aula')
    expect(rotuloAulas(0)).toBe('0 aulas')
    expect(rotuloAulas(3)).toBe('3 aulas')
  })
})
