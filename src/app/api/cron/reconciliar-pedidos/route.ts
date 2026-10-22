import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { reconciliarPedidosPendentes } from '@/lib/reconciliarPedidos'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Chamada pelo Vercel Cron (user-agent `vercel-cron/1.0`). Não há segredo: o
// user-agent é falsificável, mas a rota é idempotente e só aplica o que o próprio
// Mercado Pago confirma — o pior caso de uma chamada indevida é consultar a API
// do MP à toa.
export async function GET(req: NextRequest) {
  if (!req.headers.get('user-agent')?.startsWith('vercel-cron')) {
    return NextResponse.json({ error: 'não autorizado' }, { status: 401 })
  }

  const resumo = await reconciliarPedidosPendentes(createServiceClient())
  console.log('[cron-reconciliar-pedidos]', resumo)
  return NextResponse.json({ ok: true, ...resumo })
}
