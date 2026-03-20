import { redirect } from 'next/navigation'
import { getPainelSession } from '@/features/painel/actions/authPainel'
import { listarAlunos } from '@/features/painel/actions/alunos'
import { listarInstrutores } from '@/features/painel/actions/instrutores'
import { AgendamentoMassa } from '@/features/painel/components/AgendamentoMassa'

interface Props {
  params: Promise<{ escola: string }>
}

export default async function AgendamentoMassaPage({ params }: Props) {
  const { escola } = await params
  const session = await getPainelSession(escola)
  if (!session) redirect(`/${escola}/painel/login`)

  const [alunos, instrutores] = await Promise.all([
    listarAlunos(session.autoescola_id),
    listarInstrutores(session.autoescola_id),
  ])

  return (
    <AgendamentoMassa
      alunos={alunos}
      instrutores={instrutores}
      autoescola_id={session.autoescola_id}
    />
  )
}
