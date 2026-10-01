import { getPainelSession } from '@/features/painel/actions/authPainel'
import { getFechamentoMensal } from '@/features/painel/actions/fechamento'
import { getAutoescolaFeatures } from '@/lib/features.server'
import { FechamentoMensal } from '@/features/painel/components/FechamentoMensal'
import { redirect } from 'next/navigation'

interface Props {
  params: Promise<{ escola: string }>
}

export default async function FechamentoPage({ params }: Props) {
  const { escola } = await params
  const session = await getPainelSession(escola)
  if (!session) redirect(`/${escola}/painel/login`)

  const now = new Date()
  const mes = now.getMonth() + 1
  const ano = now.getFullYear()

  const [data, features] = await Promise.all([
    getFechamentoMensal(session.autoescola_id, mes, ano),
    getAutoescolaFeatures(session.autoescola_id),
  ])

  return (
    <FechamentoMensal
      initialData={data}
      escola={escola}
      autoescola_id={session.autoescola_id}
      mostrarValores={features.financeiro}
    />
  )
}
