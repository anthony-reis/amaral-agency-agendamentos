import { redirect } from 'next/navigation'
import { getPainelSession } from '@/features/painel/actions/authPainel'
import { exigirArea, roleParaArea } from '@/lib/permissoes.server'
import { exigirFeature } from '@/lib/features.server'
import { getFinanceiro } from '@/features/painel/actions/financeiro'
import { FinanceiroDashboard } from '@/features/painel/components/FinanceiroDashboard'

interface Props {
  params: Promise<{ escola: string }>
}

export default async function FinanceiroPage({ params }: Props) {
  const { escola } = await params
  const session = await getPainelSession(escola)
  if (!session) redirect(`/${escola}/painel/login`)
  await exigirArea('financeiro')
  await exigirFeature(session.autoescola_id, 'financeiro')

  // Mês corrente no horário de Brasília
  const hoje = new Date(Date.now() - 3 * 3_600_000).toISOString().slice(0, 10)
  const data = await getFinanceiro(session.autoescola_id, { de: `${hoje.slice(0, 8)}01`, ate: hoje })

  return (
    <FinanceiroDashboard
      initialData={data}
      escola={escola}
    />
  )
}
