import { NextRequest, NextResponse } from 'next/server'
import { getAcessoPainel } from '@/lib/permissoes.server'
import { permite } from '@/lib/permissoes'
import { getAgendamentosStats, getDesempenhoInstrutores, getKmStats } from '@/features/painel/actions/agendamentos'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ escola: string }> }
) {
  const { escola } = await params
  // Sessão assinada + permissões do usuário (lidas do banco)
  const acesso = await getAcessoPainel()
  if (!acesso) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const session = acesso.session
  if (session.autoescola_slug !== escola || !permite(acesso.permissoes.dashboard, 'ver')) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const sp = request.nextUrl.searchParams
  const dateStart = sp.get('dateStart') ?? new Date(Date.now() - 28 * 86400000).toISOString().split('T')[0]
  const dateEnd = sp.get('dateEnd') ?? new Date().toISOString().split('T')[0]
  const instructor = sp.get('instructor') ?? 'TODOS'
  const category = sp.get('category') ?? 'TODAS'

  const [stats, desempenho, kmStats] = await Promise.all([
    getAgendamentosStats(session.autoescola_id, dateStart, dateEnd, {
      instructor_name: instructor,
      category,
    }),
    getDesempenhoInstrutores(session.autoescola_id, dateStart, dateEnd, instructor, category),
    getKmStats(session.autoescola_id, dateStart, dateEnd, instructor, category),
  ])

  return NextResponse.json({ stats, desempenho, kmStats })
}
