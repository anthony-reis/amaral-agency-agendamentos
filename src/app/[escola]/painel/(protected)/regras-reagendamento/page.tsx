import { redirect } from 'next/navigation'
import { getPainelSession } from '@/features/painel/actions/authPainel'
import { permite } from '@/lib/permissoes'
import { exigirArea, roleParaArea } from '@/lib/permissoes.server'
import { getReagendamentoMinHoras } from '@/features/painel/actions/configuracoes'
import { RegrasReagendamento } from '@/features/painel/components/RegrasReagendamento'

interface Props {
  params: Promise<{ escola: string }>
}

export default async function RegrasReagendamentoPage({ params }: Props) {
  const { escola } = await params
  const session = await getPainelSession(escola)
  if (!session) redirect(`/${escola}/painel/login`)
  const acesso = await exigirArea('sistema')
  const podeEditar = permite(acesso.permissoes.sistema, 'editar')

  const reagendamentoMinHoras = await getReagendamentoMinHoras(session.autoescola_id)

  return (
    <RegrasReagendamento
      autoescola_id={session.autoescola_id}
      escola={escola}
      initialReagendamentoMinHoras={reagendamentoMinHoras}
      podeEditar={podeEditar}
      />
  )
}
