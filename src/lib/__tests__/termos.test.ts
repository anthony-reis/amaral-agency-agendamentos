import { describe, expect, it } from 'vitest'
import { documentosDaVersao, minutosDeLeitura, parseTermos, temConteudo } from '../termos'

describe('parseTermos', () => {
  it('separa títulos, parágrafos e listas', () => {
    const blocos = parseTermos(`# 1. Aceitação
Ao usar o app
você concorda.

## Detalhes
- item a
- item b
1. primeiro
2) segundo

Fim.`)
    expect(blocos).toEqual([
      { tipo: 'h1', texto: '1. Aceitação' },
      { tipo: 'p', texto: 'Ao usar o app você concorda.' },
      { tipo: 'h2', texto: 'Detalhes' },
      { tipo: 'ul', itens: ['item a', 'item b'] },
      { tipo: 'ol', itens: ['primeiro', 'segundo'] },
      { tipo: 'p', texto: 'Fim.' },
    ])
  })

  it('aceita quebras de linha do Windows e marcadores colados do Word', () => {
    expect(parseTermos('• um\r\n• dois')).toEqual([{ tipo: 'ul', itens: ['um', 'dois'] }])
  })

  it('texto vazio não gera blocos', () => {
    expect(parseTermos('  \n\n ')).toEqual([])
  })
})

describe('helpers de versão', () => {
  it('temConteudo e documentosDaVersao ignoram documentos em branco', () => {
    const v = { termos_uso: '  ', politica_privacidade: 'Política' }
    expect(temConteudo(v)).toBe(true)
    expect(documentosDaVersao(v)).toEqual(['politica_privacidade'])
    expect(temConteudo({ termos_uso: '', politica_privacidade: ' ' })).toBe(false)
    expect(temConteudo(null)).toBe(false)
  })

  it('minutosDeLeitura arredonda e nunca fica abaixo de 1', () => {
    expect(minutosDeLeitura('curto')).toBe(1)
    expect(minutosDeLeitura(Array(600).fill('palavra').join(' '))).toBe(3)
  })
})
