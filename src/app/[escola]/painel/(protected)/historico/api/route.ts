import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { listarAgendamentos, getAgendamentosStats } from '@/features/painel/actions/agendamentos'
import type { AgendamentosSortColumn } from '@/features/painel/actions/agendamentos'
import type { PainelSession } from '@/features/painel/types'

const SORT_COLUMNS: AgendamentosSortColumn[] = [
  'date',
  'time_slot',
  'student_name',
  'instructor_name',
  'instructorCategory',
  'status',
]

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

  const dateStart = sp.get('dateStart') ?? monthAgo
  const dateEnd = sp.get('dateEnd') ?? today
  const instructor = sp.get('instructor') ?? undefined
  const category = sp.get('category') ?? undefined
  const status = sp.get('status') ?? undefined
  const search = sp.get('search') ?? undefined
  const sortByParam = sp.get('sortBy')
  const sortBy = SORT_COLUMNS.find((c) => c === sortByParam)
  const sortDir = sp.get('sortDir') === 'asc' ? 'asc' : 'desc'

  const [result, stats] = await Promise.all([
    listarAgendamentos({
      autoescola_id: session.autoescola_id,
      date_start: dateStart,
      date_end: dateEnd,
      instructor_name: instructor,
      category,
      status,
      search,
      sort_by: sortBy,
      sort_dir: sortDir,
      limit: Number(sp.get('limit') ?? 50),
      offset: Number(sp.get('offset') ?? 0),
    }),
    getAgendamentosStats(session.autoescola_id, dateStart, dateEnd, {
      instructor_name: instructor,
      category,
      search,
    }),
  ])

  return NextResponse.json({ ...result, stats })
}
