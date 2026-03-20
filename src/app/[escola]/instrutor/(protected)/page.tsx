import { getInstructorSession } from '@/features/instrutor/actions/authInstrutor'
import { getMinhasAulasHoje, getMapaSemanal } from '@/features/instrutor/actions/minhasAulas'
import { InstructorPainel } from '@/features/instrutor/components/InstructorPainel'
import { redirect } from 'next/navigation'

interface Props {
  params: Promise<{ escola: string }>
}

function getMondayOfCurrentWeek(): string {
  const today = new Date()
  const day = today.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(today)
  monday.setDate(today.getDate() + diff)
  return monday.toISOString().split('T')[0]
}

export default async function InstructorPage({ params }: Props) {
  const { escola } = await params
  const session = await getInstructorSession(escola)

  if (!session) redirect(`/${escola}/instrutor/login`)

  const hoje = new Date().toISOString().split('T')[0]
  const weekStart = getMondayOfCurrentWeek()

  const [aulas, mapaSemanal] = await Promise.all([
    getMinhasAulasHoje(session.name, session.autoescola_id, hoje),
    getMapaSemanal(session.name, session.autoescola_id, weekStart),
  ])

  return (
    <InstructorPainel
      aulas={aulas}
      mapaSemanal={mapaSemanal}
      instructorName={session.name}
      autoescola_id={session.autoescola_id}
      hoje={hoje}
      weekStart={weekStart}
    />
  )
}
