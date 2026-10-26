import { describe, expect, it } from 'vitest'
import { preencherContrato, DADOS_EXEMPLO } from '../contratos'

describe('preencherContrato', () => {
  it('troca os campos pelos dados do aluno, com ou sem espaços', () => {
    const t = preencherContrato('Aluno {{nome}} ({{ documento }}) em {{data}}', { ...DADOS_EXEMPLO, nome: 'Ana', documento: '111', data: '01/01/2026' })
    expect(t).toBe('Aluno Ana (111) em 01/01/2026')
  })

  it('campo sem dado vira traço e campo desconhecido fica como escrito', () => {
    const t = preencherContrato('Tel: {{telefone}}; {{outro}}', { ...DADOS_EXEMPLO, telefone: '' })
    expect(t).toBe('Tel: —; {{outro}}')
  })
})
