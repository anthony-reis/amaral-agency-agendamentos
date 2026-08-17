import { createHmac } from 'crypto'
import { describe, expect, it } from 'vitest'
import { validarAssinaturaWebhook } from '../mercadopago'

function assinar(params: { dataId: string; xRequestId: string; ts: string; secret: string }) {
  const manifest = `id:${params.dataId.toLowerCase()};request-id:${params.xRequestId};ts:${params.ts};`
  const v1 = createHmac('sha256', params.secret).update(manifest).digest('hex')
  return `ts=${params.ts},v1=${v1}`
}

describe('validarAssinaturaWebhook', () => {
  const secret = 'segredo-do-webhook'
  const dataId = 'ABC123'
  const xRequestId = 'req-1'
  const ts = '1700000000000'

  it('aceita uma assinatura válida', () => {
    const xSignature = assinar({ dataId, xRequestId, ts, secret })
    expect(
      validarAssinaturaWebhook({ xSignature, xRequestId, dataId, secret })
    ).toBe(true)
  })

  it('trata data.id em maiúsculas igual a minúsculas (case-insensitive no manifest)', () => {
    const xSignature = assinar({ dataId: dataId.toLowerCase(), xRequestId, ts, secret })
    expect(
      validarAssinaturaWebhook({ xSignature, xRequestId, dataId: dataId.toUpperCase(), secret })
    ).toBe(true)
  })

  it('rejeita quando o secret está errado', () => {
    const xSignature = assinar({ dataId, xRequestId, ts, secret: 'outro-secret' })
    expect(
      validarAssinaturaWebhook({ xSignature, xRequestId, dataId, secret })
    ).toBe(false)
  })

  it('rejeita quando o hash foi adulterado', () => {
    const xSignature = `ts=${ts},v1=${'0'.repeat(64)}`
    expect(
      validarAssinaturaWebhook({ xSignature, xRequestId, dataId, secret })
    ).toBe(false)
  })

  it('rejeita quando falta o header x-signature', () => {
    expect(
      validarAssinaturaWebhook({ xSignature: null, xRequestId, dataId, secret })
    ).toBe(false)
  })

  it('rejeita quando o x-signature está malformado (sem ts ou v1)', () => {
    expect(
      validarAssinaturaWebhook({ xSignature: 'ts=123', xRequestId, dataId, secret })
    ).toBe(false)
  })

  it('rejeita quando falta o secret configurado', () => {
    const xSignature = assinar({ dataId, xRequestId, ts, secret })
    expect(
      validarAssinaturaWebhook({ xSignature, xRequestId, dataId, secret: '' })
    ).toBe(false)
  })
})
