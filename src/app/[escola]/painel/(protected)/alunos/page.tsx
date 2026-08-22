import { redirect } from 'next/navigation'
import { getPainelSession } from '@/features/painel/actions/authPainel'
import { listarAlunos } from '@/features/painel/actions/alunos'
import { listarProdutos } from '@/features/painel/actions/catalogo'
import { AlunosList } from '@/features/painel/components/AlunosList'

interface Props {
  params: Promise<{ escola: string }>
}

export default async function AlunosPage({ params }: Props) {
  const { escola } = await params
  const session = await getPainelSession(escola)
  if (!session) redirect(`/${escola}/painel/login`)

  const [alunos, produtos] = await Promise.all([
    listarAlunos(session.autoescola_id),
    listarProdutos(session.autoescola_id),
  ])

  return <AlunosList alunos={alunos} autoescola_id={session.autoescola_id} produtos={produtos} escola={escola} />
}
