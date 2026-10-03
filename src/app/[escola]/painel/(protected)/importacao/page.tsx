import { redirect } from 'next/navigation'
import { getPainelSession } from '@/features/painel/actions/authPainel'
import { exigirArea, roleParaArea } from '@/lib/permissoes.server'
import ImportacaoClient from '@/features/painel/components/ImportacaoClient'

interface Props {
  params: Promise<{ escola: string }>
}

export default async function ImportacaoPage({ params }: Props) {
  const { escola } = await params
  const session = await getPainelSession(escola)
  if (!session) redirect(`/${escola}/painel/login`)
  await exigirArea('operacao')

  return <ImportacaoClient userRole={await roleParaArea('operacao')} />
}
