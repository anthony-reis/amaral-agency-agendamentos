import 'server-only'

import { createHmac, timingSafeEqual } from 'crypto'

// Integração via REST direto (sem SDK): apenas 2 endpoints são usados e o
// modelo multi-tenant exige um access token por chamada.
const MP_API = 'https://api.mercadopago.com'

export interface MPPreferenceInput {
  pedidoId: string
  titulo: string
  descricao?: string | null
  valorCentavos: number
  autoescolaId: string
  escolaSlug: string
  payerEmail?: string | null
}

export interface MPPreference {
  id: string
  init_point: string
  sandbox_init_point: string
}

export async function criarPreference(
  input: MPPreferenceInput,
  accessToken: string
): Promise<MPPreference> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!appUrl) throw new Error('NEXT_PUBLIC_APP_URL não configurada.')

  const retornoUrl = `${appUrl}/${input.escolaSlug}/aluno/loja/retorno?pedido=${input.pedidoId}`

  const res = await fetch(`${MP_API}/checkout/preferences`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': input.pedidoId,
    },
    body: JSON.stringify({
      items: [
        {
          id: input.pedidoId,
          title: input.titulo,
          description: input.descricao || undefined,
          quantity: 1,
          currency_id: 'BRL',
          unit_price: input.valorCentavos / 100,
        },
      ],
      external_reference: input.pedidoId,
      notification_url: `${appUrl}/api/webhooks/mercadopago?autoescola_id=${input.autoescolaId}`,
      back_urls: {
        success: retornoUrl,
        failure: retornoUrl,
        pending: retornoUrl,
      },
      auto_return: 'approved',
      payment_methods: { installments: 12 },
      payer: input.payerEmail ? { email: input.payerEmail } : undefined,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Mercado Pago: erro ao criar preference (${res.status}): ${body}`)
  }

  return (await res.json()) as MPPreference
}

export interface MPPayment {
  id: number
  status: string
  status_detail: string
  external_reference: string | null
  transaction_amount: number
  payment_method_id: string
  payment_type_id: string
  date_approved: string | null
}

export async function buscarPayment(
  paymentId: string,
  accessToken: string
): Promise<MPPayment | null> {
  const res = await fetch(`${MP_API}/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  })
  if (res.status === 404) return null
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Mercado Pago: erro ao buscar payment ${paymentId} (${res.status}): ${body}`)
  }
  return (await res.json()) as MPPayment
}

/**
 * Fallback de reconciliação ativa: busca o pagamento pelo external_reference
 * (= id do pedido) sem depender do webhook ou de query params de retorno.
 * Usado pela página de retorno do aluno para não deixar o pedido "pendente"
 * caso a notificação do MP atrase ou nunca chegue.
 */
export async function buscarPaymentPorExternalReference(
  externalReference: string,
  accessToken: string
): Promise<MPPayment | null> {
  const res = await fetch(
    `${MP_API}/v1/payments/search?sort=date_created&criteria=desc&external_reference=${encodeURIComponent(externalReference)}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    }
  )
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Mercado Pago: erro ao buscar payments por external_reference (${res.status}): ${body}`)
  }
  const data = (await res.json()) as { results?: MPPayment[] }
  return data.results?.[0] ?? null
}

/**
 * Valida a assinatura x-signature dos webhooks do Mercado Pago.
 * Manifest: `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`
 * (data.id em lowercase quando alfanumérico, conforme docs do MP)
 */
export function validarAssinaturaWebhook(params: {
  xSignature: string | null
  xRequestId: string | null
  dataId: string
  secret: string
}): boolean {
  const { xSignature, xRequestId, dataId, secret } = params
  if (!xSignature || !secret) return false

  const parts = Object.fromEntries(
    xSignature.split(',').map((p) => {
      const [k, ...v] = p.split('=')
      return [k?.trim(), v.join('=').trim()]
    })
  ) as Record<string, string>

  const ts = parts['ts']
  const v1 = parts['v1']
  if (!ts || !v1) return false

  let manifest = `id:${dataId.toLowerCase()};`
  if (xRequestId) manifest += `request-id:${xRequestId};`
  manifest += `ts:${ts};`

  const esperado = createHmac('sha256', secret).update(manifest).digest('hex')

  const a = Buffer.from(esperado, 'utf8')
  const b = Buffer.from(v1, 'utf8')
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}
