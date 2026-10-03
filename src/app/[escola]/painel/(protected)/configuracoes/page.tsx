import { redirect } from 'next/navigation'
import { getPainelSession } from '@/features/painel/actions/authPainel'
import { exigirArea, roleParaArea } from '@/lib/permissoes.server'
import { permite } from '@/lib/permissoes'
import { getInstructorConfig } from '@/features/painel/actions/configuracoes'
import { getAutoescolaFeatures } from '@/lib/features.server'
import { ConfiguracoesInstrutor } from '@/features/painel/components/ConfiguracoesInstrutor'

interface Props {
  params: Promise<{ escola: string }>
}

export default async function ConfiguracoesPage({ params }: Props) {
  const { escola } = await params
  const session = await getPainelSession(escola)
  if (!session) redirect(`/${escola}/painel/login`)
  const acesso = await exigirArea('sistema')

  const [config, features] = await Promise.all([
    getInstructorConfig(session.autoescola_id),
    getAutoescolaFeatures(session.autoescola_id),
  ])

  return (
    <ConfiguracoesInstrutor
      autoescola_id={session.autoescola_id}
      escola={escola}
      initialConfig={config}
      userRole={await roleParaArea('sistema')}
      mostrarHoraAulaOpcao={permite(acesso.permissoes.financeiro, 'ver')}
    />
  )
}
