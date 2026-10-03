import { beforeAll, describe, expect, it } from 'vitest'
import { assinarSessaoPainel, lerSessaoPainelToken } from '../painelSessionToken'

beforeAll(() => {
  process.env.PAINEL_SESSION_SECRET = 'segredo-de-teste'
})

const sessao = { userId: 'u1', role: 'visualizador', autoescola_id: 'a1', autoescola_slug: 'escola' }

describe('painelSessionToken', () => {
  it('assina e lê de volta a mesma sessão', async () => {
    const token = await assinarSessaoPainel(sessao)
    expect(token.startsWith('v1.')).toBe(true)
    expect(await lerSessaoPainelToken(token)).toEqual(sessao)
  })

  it('rejeita payload alterado (ex.: trocar role para admin)', async () => {
    const token = await assinarSessaoPainel(sessao)
    const [v, , sig] = token.split('.')
    const forjado = Buffer.from(JSON.stringify({ ...sessao, role: 'admin' })).toString('base64url')
    expect(await lerSessaoPainelToken(`${v}.${forjado}.${sig}`)).toBeNull()
  })

  it('rejeita o cookie antigo em JSON puro e lixo', async () => {
    expect(await lerSessaoPainelToken(JSON.stringify(sessao))).toBeNull()
    expect(await lerSessaoPainelToken('v1.abc.def')).toBeNull()
    expect(await lerSessaoPainelToken(undefined)).toBeNull()
  })

  it('rejeita token assinado com outro segredo', async () => {
    const token = await assinarSessaoPainel(sessao)
    process.env.PAINEL_SESSION_SECRET = 'outro-segredo'
    expect(await lerSessaoPainelToken(token)).toBeNull()
    process.env.PAINEL_SESSION_SECRET = 'segredo-de-teste'
  })
})
