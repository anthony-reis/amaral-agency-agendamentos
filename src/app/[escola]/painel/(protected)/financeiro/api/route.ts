import { NextRequest, NextResponse } from 'next/server'
import { getAcessoPainel } from '@/lib/permissoes.server'
import { permite } from '@/lib/permissoes'
import { getFinanceiro } from '@/features/painel/actions/financeiro'
import { autoescolaTemFeature } from '@/lib/features.server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ escola: string }> }
) {
  const { escola } = await params
  // Sessão assinada + permissões do usuário (lidas do banco)
  const acesso = await getAcessoPainel()
  if (!acesso) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const session = acesso.session
  if (session.autoescola_slug !== escola || !permite(acesso.permissoes.financeiro, 'ver')) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  if (!(await autoescolaTemFeature(session.autoescola_id, 'financeiro'))) {
    return NextResponse.json({ error: 'Recurso não habilitado' }, { status: 404 })
  }

  const sp = request.nextUrl.searchParams
  const de = sp.get('de') ?? ''
  const ate = sp.get('ate') ?? ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(de) || !/^\d{4}-\d{2}-\d{2}$/.test(ate)) {
    return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })
  }

  const origem = sp.get('origem')
  const data = await getFinanceiro(session.autoescola_id, {
    de,
    ate,
    origem: origem === 'manual' || origem === 'mercado_pago' ? origem : '',
    forma: sp.get('forma') ?? '',
    vendedor: sp.get('vendedor') ?? '',
    categoria: sp.get('categoria') ?? '',
  })
  return NextResponse.json(data)
}
