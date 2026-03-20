import { redirect } from 'next/navigation'
import { getPainelSession } from '@/features/painel/actions/authPainel'
import { listarBloqueios } from '@/features/painel/actions/bloqueios'
import { listarInstrutores } from '@/features/painel/actions/instrutores'
import { BloqueioForm } from '@/features/painel/components/BloqueioForm'

interface Props {
  params: Promise<{ escola: string }>
}

export default async function BloqueiosPage({ params }: Props) {
  const { escola } = await params
  const session = await getPainelSession(escola)
  if (!session) redirect(`/${escola}/painel/login`)

  const [bloqueios, instrutores] = await Promise.all([
    listarBloqueios(session.autoescola_id),
    listarInstrutores(session.autoescola_id),
  ])

  return (
    <BloqueioForm
      bloqueios={bloqueios}
      instrutores={instrutores.map((i) => i.name)}
      autoescola_id={session.autoescola_id}
    />
  )
}
