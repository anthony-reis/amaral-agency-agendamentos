import { redirect } from 'next/navigation'
import { getPainelSession } from '@/features/painel/actions/authPainel'
import { getCalendarioData } from '@/features/painel/actions/calendario'
import { getAutoescolaFeatures } from '@/lib/features.server'
import { Calendario } from '@/features/painel/components/Calendario'

interface Props {
  params: Promise<{ escola: string }>
}

export default async function CalendarioPage({ params }: Props) {
  const { escola } = await params
  const session = await getPainelSession(escola)
  if (!session) redirect(`/${escola}/painel/login`)

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  const [dias, features] = await Promise.all([
    getCalendarioData(session.autoescola_id, year, month),
    getAutoescolaFeatures(session.autoescola_id),
  ])

  return (
    <Calendario
      autoescola_id={session.autoescola_id}
      initialData={dias}
      initialYear={year}
      initialMonth={month}
      userRole={session.role}
      examesAtivo={features.exames}
    />
  )
}
