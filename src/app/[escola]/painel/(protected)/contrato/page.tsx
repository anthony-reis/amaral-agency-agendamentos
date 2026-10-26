import { redirect } from 'next/navigation'
import { getPainelSession } from '@/features/painel/actions/authPainel'
import { permite } from '@/lib/permissoes'
import { exigirArea } from '@/lib/permissoes.server'
import { exigirFeature } from '@/lib/features.server'
import { getModeloVigente } from '@/lib/contratos.server'
import { ContratoModelo } from '@/features/painel/components/ContratoModelo'

interface Props {
  params: Promise<{ escola: string }>
}

export default async function ContratoModeloPage({ params }: Props) {
  const { escola } = await params
  const session = await getPainelSession(escola)
  if (!session) redirect(`/${escola}/painel/login`)
  const acesso = await exigirArea('sistema')
  await exigirFeature(session.autoescola_id, 'contratos')

  const modelo = await getModeloVigente(session.autoescola_id)
  return <ContratoModelo escola={escola} modelo={modelo} podeEditar={permite(acesso.permissoes.sistema, 'editar')} />
}
