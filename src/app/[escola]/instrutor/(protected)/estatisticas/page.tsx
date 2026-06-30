import { redirect } from 'next/navigation'
import { getInstructorSession } from '@/features/instrutor/actions/authInstrutor'
import { getEstatisticasInstrutor } from '@/features/instrutor/actions/estatisticas'
import { getInstructorConfig } from '@/features/painel/actions/configuracoes'
import { InstructorEstatisticas } from '@/features/instrutor/components/InstructorEstatisticas'

interface Props {
  params: Promise<{ escola: string }>
}

function getMesAtualRange(): { date_start: string; date_end: string } {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return { date_start: fmt(first), date_end: fmt(last) }
}

export default async function EstatisticasPage({ params }: Props) {
  const { escola } = await params
  const session = await getInstructorSession(escola)

  if (!session) redirect(`/${escola}/instrutor/login`)

  const range = getMesAtualRange()

  const [estatisticas, instructorConfig] = await Promise.all([
    getEstatisticasInstrutor(session.name, session.autoescola_id, range),
    getInstructorConfig(session.autoescola_id),
  ])

  return (
    <InstructorEstatisticas
      estatisticasIniciais={estatisticas}
      instructorName={session.name}
      autoescola_id={session.autoescola_id}
      registrarKm={instructorConfig.registrar_km}
      rangeInicial={range}
    />
  )
}
