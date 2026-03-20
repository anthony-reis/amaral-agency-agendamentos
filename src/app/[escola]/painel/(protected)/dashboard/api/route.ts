import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getAgendamentosStats, getDesempenhoInstrutores } from '@/features/painel/actions/agendamentos'
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
  const dateStart = sp.get('dateStart') ?? new Date(Date.now() - 28 * 86400000).toISOString().split('T')[0]
  const dateEnd = sp.get('dateEnd') ?? new Date().toISOString().split('T')[0]
  const instructor = sp.get('instructor') ?? 'TODOS'
  const category = sp.get('category') ?? 'TODAS'

  const [stats, desempenho] = await Promise.all([
    getAgendamentosStats(session.autoescola_id, dateStart, dateEnd),
    getDesempenhoInstrutores(session.autoescola_id, dateStart, dateEnd, instructor, category),
  ])

  return NextResponse.json({ stats, desempenho })
}
