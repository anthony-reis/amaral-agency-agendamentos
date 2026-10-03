import { redirect } from 'next/navigation'
import { getPainelSession } from '@/features/painel/actions/authPainel'
import { exigirArea, roleParaArea } from '@/lib/permissoes.server'
import { listarComunicados } from '@/features/painel/actions/comunicados'
import { ComunicadosList } from '@/features/painel/components/ComunicadosList'

interface Props {
  params: Promise<{ escola: string }>
}

export default async function ComunicadosPage({ params }: Props) {
  const { escola } = await params
  const session = await getPainelSession(escola)
  if (!session) redirect(`/${escola}/painel/login`)
  await exigirArea('sistema')

  const comunicados = await listarComunicados(session.autoescola_id)

  return (
    <ComunicadosList
      comunicados={comunicados}
      autoescola_id={session.autoescola_id}
      escola={escola}
      userRole={await roleParaArea('sistema')}
    />
  )
}
