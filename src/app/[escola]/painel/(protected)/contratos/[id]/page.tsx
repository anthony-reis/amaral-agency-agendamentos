import { notFound, redirect } from 'next/navigation'
import { getPainelSession } from '@/features/painel/actions/authPainel'
import { getContratoParaImpressao } from '@/features/painel/actions/contratos'
import { exigirArea } from '@/lib/permissoes.server'
import { exigirFeature } from '@/lib/features.server'
import { ContratoDocumento } from '@/components/ContratoDocumento'
import { BotaoImprimir } from './BotaoImprimir'

interface Props {
  params: Promise<{ escola: string; id: string }>
}

export default async function ContratoImpressaoPage({ params }: Props) {
  const { escola, id } = await params
  const session = await getPainelSession(escola)
  if (!session) redirect(`/${escola}/painel/login`)
  await exigirArea('cadastros')
  await exigirFeature(session.autoescola_id, 'contratos')

  const contrato = await getContratoParaImpressao(session.autoescola_id, id)
  if (!contrato) notFound()

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex justify-end print:hidden">
        <BotaoImprimir />
      </div>
      <ContratoDocumento contrato={contrato} />
    </div>
  )
}
