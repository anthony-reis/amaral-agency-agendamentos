import { redirect } from 'next/navigation'
import { getPainelSession } from '@/features/painel/actions/authPainel'
import { listarInstrutores } from '@/features/painel/actions/instrutores'
import { getAutoescolaFeatures } from '@/lib/features.server'
import { InstrutoesTable } from '@/features/painel/components/InstrutoesTable'

interface Props {
  params: Promise<{ escola: string }>
}

export default async function InstrutoesPage({ params }: Props) {
  const { escola } = await params
  const session = await getPainelSession(escola)
  if (!session) redirect(`/${escola}/painel/login`)

  const [instrutores, features] = await Promise.all([
    listarInstrutores(session.autoescola_id),
    getAutoescolaFeatures(session.autoescola_id),
  ])

  return (
    <InstrutoesTable
      instrutores={instrutores}
      autoescola_id={session.autoescola_id}
      userRole={session.role}
      mostrarValores={features.financeiro}
    />
  )
}
