import { redirect, notFound } from 'next/navigation'
import { getPainelSession } from '@/features/painel/actions/authPainel'
import { listarSolicitacoes } from '@/features/painel/actions/solicitacoes'
import { createServiceClient } from '@/lib/supabase/server'
import { SolicitacoesList } from '@/features/painel/components/SolicitacoesList'

interface Props {
  params: Promise<{ escola: string }>
}

export default async function SolicitacoesPage({ params }: Props) {
  const { escola } = await params
  const session = await getPainelSession(escola)
  if (!session) redirect(`/${escola}/painel/login`)

  const supabase = createServiceClient()
  const { data: autoescola } = await supabase
    .from('autoescolas')
    .select('solicitacoes_ativo')
    .eq('id', session.autoescola_id)
    .single()

  if (!autoescola?.solicitacoes_ativo) notFound()

  const solicitacoes = await listarSolicitacoes(session.autoescola_id)

  return (
    <SolicitacoesList
      escola={escola}
      autoescolaId={session.autoescola_id}
      solicitacoesIniciais={solicitacoes}
    />
  )
}
