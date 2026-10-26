import { redirect } from 'next/navigation'
import { getPainelSession } from '@/features/painel/actions/authPainel'
import { permite } from '@/lib/permissoes'
import { exigirArea } from '@/lib/permissoes.server'
import { getReagendamentoMinHoras } from '@/features/painel/actions/configuracoes'
import { getJanelaAgendamento } from '@/lib/janelaAgendamento.server'
import { Travamentos } from '@/features/painel/components/Travamentos'

interface Props {
  params: Promise<{ escola: string }>
}

export default async function TravamentosPage({ params }: Props) {
  const { escola } = await params
  const session = await getPainelSession(escola)
  if (!session) redirect(`/${escola}/painel/login`)
  const acesso = await exigirArea('sistema')
  const podeEditar = permite(acesso.permissoes.sistema, 'editar')

  const [reagendamentoMinHoras, janela] = await Promise.all([
    getReagendamentoMinHoras(session.autoescola_id),
    getJanelaAgendamento(session.autoescola_id),
  ])

  return (
    <Travamentos
      autoescola_id={session.autoescola_id}
      escola={escola}
      initialReagendamentoMinHoras={reagendamentoMinHoras}
      initialJanela={janela}
      podeEditar={podeEditar}
    />
  )
}
