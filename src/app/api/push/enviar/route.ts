import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { enviarPush } from '@/lib/push.server'
import { autoescolaTemFeature } from '@/lib/features.server'

export const runtime = 'nodejs'

/** Para onde a notificação leva o aluno, conforme o tipo do aviso. */
function destinoAluno(tipo: string): { rota: string; acao: string } {
  if (tipo === 'solicitacao') return { rota: 'solicitacoes', acao: 'Ver solicitação' }
  if (tipo === 'contrato') return { rota: 'contrato', acao: 'Assinar contrato' }
  if (tipo === 'pagamento' || tipo === 'credito') return { rota: 'creditos', acao: 'Ver créditos' }
  return { rota: 'minhas-aulas', acao: 'Ver minhas aulas' }
}

/**
 * Chamado pelo banco (pg_net) quando nasce um aviso de aluno/instrutor.
 * Protegido por segredo compartilhado; o corpo só diz qual aviso enviar.
 */
export async function POST(req: Request) {
  const segredo = process.env.PUSH_WEBHOOK_SECRET
  if (!segredo || req.headers.get('x-push-secret') !== segredo) {
    return NextResponse.json({ error: 'não autorizado' }, { status: 401 })
  }
  const { tabela, id } = (await req.json().catch(() => ({}))) as { tabela?: string; id?: string }
  if (!id || (tabela !== 'avisos_aluno' && tabela !== 'avisos_instrutor')) {
    return NextResponse.json({ error: 'requisição inválida' }, { status: 400 })
  }

  const supabase = createServiceClient()
  if (tabela === 'avisos_aluno') {
    const { data: a } = await supabase.from('avisos_aluno').select('student_id, autoescola_id, tipo, titulo, mensagem, lido_em').eq('id', id).maybeSingle()
    if (!a || a.lido_em || !(await autoescolaTemFeature(a.autoescola_id, 'notificacoes'))) return NextResponse.json({ ok: true, enviados: 0 })
    const { data: esc } = await supabase.from('autoescolas').select('slug').eq('id', a.autoescola_id).maybeSingle()
    const destino = destinoAluno(a.tipo)
    const n = await enviarPush('aluno', a.student_id, {
      titulo: a.titulo, mensagem: a.mensagem, tag: id, tipo: a.tipo, acao: destino.acao,
      url: esc ? `/${esc.slug}/aluno/${destino.rota}` : '/',
    })
    return NextResponse.json({ ok: true, enviados: n })
  }

  const { data: a } = await supabase.from('avisos_instrutor').select('instructor_id, autoescola_id, tipo, titulo, mensagem, lido_em').eq('id', id).maybeSingle()
  if (!a || a.lido_em || !(await autoescolaTemFeature(a.autoescola_id, 'notificacoes'))) return NextResponse.json({ ok: true, enviados: 0 })
  const { data: esc } = await supabase.from('autoescolas').select('slug').eq('id', a.autoescola_id).maybeSingle()
  const n = await enviarPush('instrutor', a.instructor_id, {
    titulo: a.titulo, mensagem: a.mensagem, tag: id, tipo: a.tipo, acao: 'Ver agenda',
    url: esc ? `/${esc.slug}/instrutor` : '/',
  })
  return NextResponse.json({ ok: true, enviados: n })
}
