import { redirect } from 'next/navigation'
import { getPainelSession } from '@/features/painel/actions/authPainel'
import { exigirFeature } from '@/lib/features.server'
import { getFinanceiroMensal } from '@/features/painel/actions/financeiro'
import { FinanceiroDashboard } from '@/features/painel/components/FinanceiroDashboard'

interface Props {
  params: Promise<{ escola: string }>
}

export default async function FinanceiroPage({ params }: Props) {
  const { escola } = await params
  const session = await getPainelSession(escola)
  if (!session) redirect(`/${escola}/painel/login`)
  await exigirFeature(session.autoescola_id, 'financeiro')

  const now = new Date()
  const mes = now.getMonth() + 1
  const ano = now.getFullYear()

  const data = await getFinanceiroMensal(session.autoescola_id, mes, ano)

  return (
    <FinanceiroDashboard
      initialData={data}
      escola={escola}
      autoescola_id={session.autoescola_id}
    />
  )
}
