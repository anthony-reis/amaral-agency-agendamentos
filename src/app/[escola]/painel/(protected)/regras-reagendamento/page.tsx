import { redirect } from 'next/navigation'
import { getPainelSession } from '@/features/painel/actions/authPainel'
import { getReagendamentoMinHoras } from '@/features/painel/actions/configuracoes'
import { RegrasReagendamento } from '@/features/painel/components/RegrasReagendamento'

interface Props {
  params: Promise<{ escola: string }>
}

export default async function RegrasReagendamentoPage({ params }: Props) {
  const { escola } = await params
  const session = await getPainelSession(escola)
  if (!session) redirect(`/${escola}/painel/login`)

  const reagendamentoMinHoras = await getReagendamentoMinHoras(session.autoescola_id)

  return (
    <RegrasReagendamento
      autoescola_id={session.autoescola_id}
      escola={escola}
      initialReagendamentoMinHoras={reagendamentoMinHoras}
    />
  )
}
