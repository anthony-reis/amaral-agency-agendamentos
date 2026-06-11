import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getFechamentoMensal } from '@/features/painel/actions/fechamento'
import type { PainelSession } from '@/features/painel/types'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ escola: string }> }
) {
  const { escola } = await params
  const cookieStore = await cookies()
  const raw = cookieStore.get('painel_session')?.value
  if (!raw) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  let session: PainelSession
  try {
    session = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: 'Sessão inválida' }, { status: 401 })
  }

  if (session.autoescola_slug !== escola) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const sp = request.nextUrl.searchParams
  const mes = parseInt(sp.get('mes') ?? String(new Date().getMonth() + 1), 10)
  const ano = parseInt(sp.get('ano') ?? String(new Date().getFullYear()), 10)

  if (isNaN(mes) || mes < 1 || mes > 12 || isNaN(ano)) {
    return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })
  }

  const data = await getFechamentoMensal(session.autoescola_id, mes, ano)
  return NextResponse.json(data)
}
