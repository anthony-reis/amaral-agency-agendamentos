import { getPainelSession } from '@/features/painel/actions/authPainel'
import { getAgendamentosStats, getDesempenhoInstrutores } from '@/features/painel/actions/agendamentos'
import { listarInstrutores } from '@/features/painel/actions/instrutores'
import { DashboardStats } from '@/features/painel/components/DashboardStats'
import { redirect } from 'next/navigation'

interface Props {
  params: Promise<{ escola: string }>
}

function getDefaultDates() {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 28)
  return {
    dateStart: start.toISOString().split('T')[0],
    dateEnd: end.toISOString().split('T')[0],
  }
}

export default async function DashboardPage({ params }: Props) {
  const { escola } = await params
  const session = await getPainelSession(escola)
  if (!session) redirect(`/${escola}/painel/login`)

  const { dateStart, dateEnd } = getDefaultDates()
  const autoescola_id = session.autoescola_id

  const [stats, desempenho, instrutores] = await Promise.all([
    getAgendamentosStats(autoescola_id, dateStart, dateEnd),
    getDesempenhoInstrutores(autoescola_id, dateStart, dateEnd),
    listarInstrutores(autoescola_id),
  ])

  return (
    <DashboardStats
      stats={stats}
      desempenho={desempenho}
      instrutores={instrutores.map((i) => i.name)}
      dateStart={dateStart}
      dateEnd={dateEnd}
      escola={escola}
    />
  )
}
