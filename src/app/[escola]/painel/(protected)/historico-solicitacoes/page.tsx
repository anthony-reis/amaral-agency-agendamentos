import { redirect } from 'next/navigation'
import { getPainelSession } from '@/features/painel/actions/authPainel'
import { permite } from '@/lib/permissoes'
import { exigirArea, roleParaArea } from '@/lib/permissoes.server'
import { listarSolicitacoes } from '@/features/painel/actions/solicitacoes'
import { exigirFeature } from '@/lib/features.server'
import { SolicitacoesList } from '@/features/painel/components/SolicitacoesList'
import { STATUS_FINALIZADOS } from '@/features/painel/types'

interface Props {
  params: Promise<{ escola: string }>
}

export default async function HistoricoSolicitacoesPage({ params }: Props) {
  const { escola } = await params
  const session = await getPainelSession(escola)
  if (!session) redirect(`/${escola}/painel/login`)
  const acesso = await exigirArea('solicitacoes')
  const podeEditar = permite(acesso.permissoes.solicitacoes, 'editar')
  await exigirFeature(session.autoescola_id, 'solicitacoes')

  const solicitacoes = await listarSolicitacoes(session.autoescola_id, { statusIn: STATUS_FINALIZADOS })

  return (
    <SolicitacoesList
      escola={escola}
      autoescolaId={session.autoescola_id}
      solicitacoesIniciais={solicitacoes}
      modo="historico"
      podeEditar={podeEditar}
      />
  )
}
