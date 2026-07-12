import { redirect } from 'next/navigation'
import { getPainelSession } from '@/features/painel/actions/authPainel'
import { getInstructorConfig } from '@/features/painel/actions/configuracoes'
import { ConfiguracoesInstrutor } from '@/features/painel/components/ConfiguracoesInstrutor'

interface Props {
  params: Promise<{ escola: string }>
}

export default async function ConfiguracoesPage({ params }: Props) {
  const { escola } = await params
  const session = await getPainelSession(escola)
  if (!session) redirect(`/${escola}/painel/login`)

  const config = await getInstructorConfig(session.autoescola_id)

  return (
    <ConfiguracoesInstrutor
      autoescola_id={session.autoescola_id}
      escola={escola}
      initialConfig={config}
    />
  )
}
