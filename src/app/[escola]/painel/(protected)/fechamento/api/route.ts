import { NextRequest, NextResponse } from 'next/server'
import { getAcessoPainel } from '@/lib/permissoes.server'
import { permite } from '@/lib/permissoes'
import { getFechamentoMensal } from '@/features/painel/actions/fechamento'
import { fechamentoSemValores } from '@/features/painel/fechamentoValores'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ escola: string }> }
) {
  const { escola } = await params
  // Sessão assinada + permissões do usuário (lidas do banco)
  const acesso = await getAcessoPainel()
  if (!acesso) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const session = acesso.session
  if (session.autoescola_slug !== escola || !permite(acesso.permissoes.operacao, 'ver')) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const sp = request.nextUrl.searchParams
  const mes = parseInt(sp.get('mes') ?? String(new Date().getMonth() + 1), 10)
  const ano = parseInt(sp.get('ano') ?? String(new Date().getFullYear()), 10)

  if (isNaN(mes) || mes < 1 || mes > 12 || isNaN(ano)) {
    return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })
  }

  const data = await getFechamentoMensal(session.autoescola_id, mes, ano)
  const veValores = permite(acesso.permissoes.financeiro, 'ver')
  return NextResponse.json(veValores ? data : fechamentoSemValores(data))
}
