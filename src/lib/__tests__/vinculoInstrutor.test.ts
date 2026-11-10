import { describe, expect, it } from 'vitest'
import {
  agruparPorInstrutor, aulasDaModalidade, instrutorServe, mensagemVinculoImpossivel, normalizarModalidade, rotuloAulas, sugerirInstrutor,
  vinculoImpossivel, type AulaFutura, type TotalInstrutor,
} from '../vinculoInstrutor'

const aula = (id: string, date: string, time_slot: string, instructor_name: string, cat = 'CARRO'): AulaFutura => ({
  id, date, time_slot, instructor_name, instructorCategory: cat, status: 'scheduled',
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

describe('vínculo por modalidade (quem faz Carro e Moto)', () => {
  it('normaliza a modalidade e AMBOS atende as duas', () => {
    expect(normalizarModalidade('carro')).toBe('CARRO')
    expect(normalizarModalidade(' Moto ')).toBe('MOTO')
    expect(normalizarModalidade('AMBOS')).toBeNull()
    expect(instrutorServe('CARRO', 'CARRO')).toBe(true)
    expect(instrutorServe('CARRO', 'MOTO')).toBe(false)
    expect(instrutorServe('AMBOS', 'MOTO')).toBe(true)
  })

  it('aluno de Carro com Wallace e Moto com Dimas NÃO é conflito: cada modalidade tem um instrutor', () => {
    const aulas = [aula('1', '2026-11-10', '08:00', 'Wallace'), aula('2', '2026-11-11', '09:00', 'Wallace'), aula('3', '2026-11-11', '18:00', 'Dimas', 'MOTO')]
    expect(vinculoImpossivel(agruparPorInstrutor(aulasDaModalidade(aulas, 'CARRO')))).toBe(false)
    expect(vinculoImpossivel(agruparPorInstrutor(aulasDaModalidade(aulas, 'MOTO')))).toBe(false)
    // sem separar por modalidade seria (erradamente) um conflito
    expect(vinculoImpossivel(agruparPorInstrutor(aulas))).toBe(true)
  })

  it('conflito só dentro da mesma modalidade, e a mensagem cita a modalidade', () => {
    const aulas = [aula('1', '2026-11-10', '07:00', 'João', 'MOTO'), aula('2', '2026-11-11', '18:00', 'Dimas', 'MOTO')]
    const g = agruparPorInstrutor(aulasDaModalidade(aulas, 'MOTO'))
    expect(vinculoImpossivel(g)).toBe(true)
    expect(mensagemVinculoImpossivel(g, 'MOTO')).toContain('instrutor de Moto')
  })

  it('sugere o instrutor com quem mais tem aulas, por modalidade, e sinaliza empate', () => {
    const t = (categoria: 'CARRO' | 'MOTO', instrutor: string, qtd: number, proxima: string | null): TotalInstrutor =>
      ({ categoria, instrutor, qtd, concluidas: 0, futuras: qtd, proxima })
    const totais = [t('CARRO', 'Gean', 2, null), t('MOTO', 'João', 1, '2026-11-10'), t('MOTO', 'Dimas', 1, '2026-11-11')]
    expect(sugerirInstrutor(totais, 'CARRO')).toEqual({ instrutor: 'Gean', qtd: 2, empate: false })
    expect(sugerirInstrutor(totais, 'MOTO')).toEqual({ instrutor: 'João', qtd: 1, empate: true }) // empate: aula mais próxima
    expect(sugerirInstrutor([], 'MOTO')).toBeNull()
    expect(sugerirInstrutor([t('CARRO', 'Lucélio', 5, null), t('CARRO', 'Elaine', 2, null)], 'CARRO')).toEqual({ instrutor: 'Lucélio', qtd: 5, empate: false })
  })
})
