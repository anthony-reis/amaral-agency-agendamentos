import { redirect } from 'next/navigation'
import { getPainelSession } from '@/features/painel/actions/authPainel'
import { listarAgendamentos, getAgendamentosStats } from '@/features/painel/actions/agendamentos'
import { listarInstrutores } from '@/features/painel/actions/instrutores'
import { HistoricoList } from '@/features/painel/components/HistoricoList'

interface Props {
  params: Promise<{ escola: string }>
}

export default async function HistoricoPage({ params }: Props) {
  const { escola } = await params
  const session = await getPainelSession(escola)
  if (!session) redirect(`/${escola}/painel/login`)

  const autoescola_id = session.autoescola_id
  const today = new Date().toISOString().split('T')[0]
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]

  const [result, stats, instrutores] = await Promise.all([
    listarAgendamentos({ autoescola_id, date_start: monthAgo, date_end: today, limit: 30 }),
    getAgendamentosStats(autoescola_id, monthAgo, today),
    listarInstrutores(autoescola_id),
  ])

  return (
    <HistoricoList
      agendamentos={result.data}
      stats={stats}
      instrutores={instrutores.map((i) => i.name)}
      total={result.total}
      escola={escola}
      autoescola_id={autoescola_id}
    />
  )
}
