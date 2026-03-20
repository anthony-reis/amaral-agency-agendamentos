import { redirect } from 'next/navigation'
import { getPainelSession } from '@/features/painel/actions/authPainel'
import { listarLogs, getLogStats, listarUsuariosPainel } from '@/features/painel/actions/auditoria'
import { AuditoriaList } from '@/features/painel/components/AuditoriaList'

interface Props {
  params: Promise<{ escola: string }>
}

export default async function AuditoriaPage({ params }: Props) {
  const { escola } = await params
  const session = await getPainelSession(escola)
  if (!session) redirect(`/${escola}/painel/login`)

  const autoescola_id = session.autoescola_id
  const today = new Date().toISOString().split('T')[0]
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]

  const [result, stats, usuarios] = await Promise.all([
    listarLogs({ autoescola_id, dateStart: weekAgo, dateEnd: today, limit: 30 }),
    getLogStats(autoescola_id, weekAgo, today),
    listarUsuariosPainel(autoescola_id),
  ])

  return (
    <AuditoriaList
      autoescola_id={autoescola_id}
      initialData={result.data}
      initialStats={stats}
      initialTotal={result.total}
      usuarios={usuarios}
      dateStart={weekAgo}
      dateEnd={today}
    />
  )
}
