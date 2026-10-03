import { redirect } from 'next/navigation'
import { getPainelSession } from '@/features/painel/actions/authPainel'
import { exigirArea, roleParaArea } from '@/lib/permissoes.server'
import { listarHorarios } from '@/features/painel/actions/horarios'
import { listarInstrutores } from '@/features/painel/actions/instrutores'
import { HorariosGrid } from '@/features/painel/components/HorariosGrid'

interface Props {
  params: Promise<{ escola: string }>
}

export default async function HorariosPage({ params }: Props) {
  const { escola } = await params
  const session = await getPainelSession(escola)
  if (!session) redirect(`/${escola}/painel/login`)
  await exigirArea('operacao')

  const [horarios, instrutores] = await Promise.all([
    listarHorarios(session.autoescola_id),
    listarInstrutores(session.autoescola_id),
  ])

  return (
    <HorariosGrid
      horarios={horarios}
      instrutores={instrutores.map((i) => i.name)}
      autoescola_id={session.autoescola_id}
      userRole={await roleParaArea('operacao')}
    />
  )
}
