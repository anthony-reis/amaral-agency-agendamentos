import { describe, expect, it } from 'vitest'
import { janelaAbertaAgora, normalizarJanela, resumoJanela, validarJanela, type JanelaAgendamento } from '../janelaAgendamento'

const seg_sex: JanelaAgendamento = {
  ativo: true,
  dias: Object.fromEntries([1, 2, 3, 4, 5].map((d) => [String(d), [{ inicio: '07:00', fim: '20:00' }]])),
}

// Brasília = UTC-3. 2026-10-26 é segunda-feira.
const brt = (iso: string) => new Date(`${iso}-03:00`)

describe('janelaAbertaAgora', () => {
  it('sem janela ou desativada = sempre aberto', () => {
    expect(janelaAbertaAgora(null, brt('2026-10-25T03:00:00'))).toBe(true)
    expect(janelaAbertaAgora({ ativo: false, dias: {} }, brt('2026-10-25T03:00:00'))).toBe(true)
  })

  it('abre dentro da faixa e fecha no horário final (exclusivo)', () => {
    expect(janelaAbertaAgora(seg_sex, brt('2026-10-26T07:00:00'))).toBe(true)
    expect(janelaAbertaAgora(seg_sex, brt('2026-10-26T19:59:00'))).toBe(true)
    expect(janelaAbertaAgora(seg_sex, brt('2026-10-26T20:00:00'))).toBe(false)
    expect(janelaAbertaAgora(seg_sex, brt('2026-10-26T06:59:00'))).toBe(false)
  })

  it('dia sem faixa fica fechado (sábado e domingo)', () => {
    expect(janelaAbertaAgora(seg_sex, brt('2026-10-24T10:00:00'))).toBe(false)
    expect(janelaAbertaAgora(seg_sex, brt('2026-10-25T10:00:00'))).toBe(false)
  })

  it('usa o fuso de Brasília, não o do servidor', () => {
    // 22:30 UTC de segunda = 19:30 em Brasília (aberto); 23:30 UTC = 20:30 (fechado)
    expect(janelaAbertaAgora(seg_sex, new Date('2026-10-26T22:30:00Z'))).toBe(true)
    expect(janelaAbertaAgora(seg_sex, new Date('2026-10-26T23:30:00Z'))).toBe(false)
  })

  it('horários específicos no sábado com mais de uma faixa', () => {
    const j: JanelaAgendamento = { ativo: true, dias: { '6': [{ inicio: '08:00', fim: '12:00' }, { inicio: '14:00', fim: '16:00' }] } }
    expect(janelaAbertaAgora(j, brt('2026-10-24T09:00:00'))).toBe(true)
    expect(janelaAbertaAgora(j, brt('2026-10-24T13:00:00'))).toBe(false)
    expect(janelaAbertaAgora(j, brt('2026-10-24T15:00:00'))).toBe(true)
  })
})

describe('validarJanela', () => {
  it('aceita janela válida e desativada', () => {
    expect(validarJanela(seg_sex)).toBeNull()
    expect(validarJanela({ ativo: false, dias: {} })).toBeNull()
  })

  it('recusa ativa sem nenhum dia liberado', () => {
    expect(validarJanela({ ativo: true, dias: {} })).not.toBeNull()
  })

  it('recusa fim antes do início e faixas sobrepostas', () => {
    expect(validarJanela({ ativo: true, dias: { '1': [{ inicio: '20:00', fim: '07:00' }] } })).toMatch(/depois do inicial/)
    expect(
      validarJanela({ ativo: true, dias: { '1': [{ inicio: '07:00', fim: '12:00' }, { inicio: '11:00', fim: '15:00' }] } })
    ).toMatch(/sobrepor/)
  })
})

describe('normalizarJanela', () => {
  it('ignora lixo e descarta horários inválidos', () => {
    expect(normalizarJanela(null)).toBeNull()
    expect(normalizarJanela('x')).toBeNull()
    const j = normalizarJanela({ ativo: true, dias: { '1': [{ inicio: '7h', fim: '20:00' }, { inicio: '08:00', fim: '12:00' }], '9': [] } })
    expect(j).toEqual({ ativo: true, dias: { '1': [{ inicio: '08:00', fim: '12:00' }] } })
  })
})

describe('resumoJanela', () => {
  it('agrupa dias consecutivos iguais', () => {
    expect(resumoJanela(seg_sex)).toEqual(['Seg–Sex: 07:00–20:00'])
    const j: JanelaAgendamento = { ativo: true, dias: { ...seg_sex.dias, '6': [{ inicio: '08:00', fim: '12:00' }] } }
    expect(resumoJanela(j)).toEqual(['Seg–Sex: 07:00–20:00', 'Sáb: 08:00–12:00'])
  })
})
