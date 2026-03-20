import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { listarAgendamentos } from '@/features/painel/actions/agendamentos'
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
  const today = new Date().toISOString().split('T')[0]
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]

  const result = await listarAgendamentos({
    autoescola_id: session.autoescola_id,
    date_start: sp.get('dateStart') ?? monthAgo,
    date_end: sp.get('dateEnd') ?? today,
    instructor_name: sp.get('instructor') ?? undefined,
    category: sp.get('category') ?? undefined,
    status: sp.get('status') ?? undefined,
    search: sp.get('search') ?? undefined,
    limit: Number(sp.get('limit') ?? 30),
    offset: Number(sp.get('offset') ?? 0),
  })

  return NextResponse.json(result)
}
