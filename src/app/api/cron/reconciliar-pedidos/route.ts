import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { reconciliarPedidosPendentes } from '@/lib/reconciliarPedidos'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Vercel Cron envia `Authorization: Bearer $CRON_SECRET`. Sem CRON_SECRET
// configurada a rota fica fechada (fail-closed).
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'não autorizado' }, { status: 401 })
  }

  const resumo = await reconciliarPedidosPendentes(createServiceClient())
  console.log('[cron-reconciliar-pedidos]', resumo)
  return NextResponse.json({ ok: true, ...resumo })
}
