import { redirect } from 'next/navigation'
import { getPainelSession } from '@/features/painel/actions/authPainel'
import { detectarConflitos } from '@/features/painel/actions/conflitos'
import { ConflitosPanel } from '@/features/painel/components/ConflitosPanel'

interface Props {
  params: Promise<{ escola: string }>
}

export default async function ConflitosPage({ params }: Props) {
  const { escola } = await params
  const session = await getPainelSession(escola)
  if (!session) redirect(`/${escola}/painel/login`)

  const conflitos = await detectarConflitos(session.autoescola_id)

  return <ConflitosPanel conflitos={conflitos} autoescola_id={session.autoescola_id} />
}
