import { redirect } from 'next/navigation'
import { getPainelSession } from '@/features/painel/actions/authPainel'
import { listarAlunos } from '@/features/painel/actions/alunos'
import { AlunosList } from '@/features/painel/components/AlunosList'

interface Props {
  params: Promise<{ escola: string }>
}

export default async function AlunosPage({ params }: Props) {
  const { escola } = await params
  const session = await getPainelSession(escola)
  if (!session) redirect(`/${escola}/painel/login`)

  const alunos = await listarAlunos(session.autoescola_id)

  return <AlunosList alunos={alunos} autoescola_id={session.autoescola_id} />
}
