import { redirect } from 'next/navigation'
import { getPainelSession } from '@/features/painel/actions/authPainel'
import { exigirArea, roleParaArea } from '@/lib/permissoes.server'
import { permite } from '@/lib/permissoes'
import { listarInstrutores } from '@/features/painel/actions/instrutores'
import { getAutoescolaFeatures } from '@/lib/features.server'
import { InstrutoesTable } from '@/features/painel/components/InstrutoesTable'

interface Props {
  params: Promise<{ escola: string }>
}

export default async function InstrutoesPage({ params }: Props) {
  const { escola } = await params
  const session = await getPainelSession(escola)
  if (!session) redirect(`/${escola}/painel/login`)
  const acesso = await exigirArea('cadastros')
  // Valores de hora/aula e banca só para quem acessa o Financeiro
  const veValores = permite(acesso.permissoes.financeiro, 'ver')

  const [instrutores, features] = await Promise.all([
    listarInstrutores(session.autoescola_id),
    getAutoescolaFeatures(session.autoescola_id),
  ])

  return (
    <InstrutoesTable
      instrutores={veValores ? instrutores : instrutores.map((i) => ({ ...i, valor_hora_aula: null, valor_banca: null }))}
      autoescola_id={session.autoescola_id}
      userRole={await roleParaArea('cadastros')}
      mostrarValores={veValores}
    />
  )
}
