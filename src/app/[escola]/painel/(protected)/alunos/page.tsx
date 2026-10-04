import { redirect } from 'next/navigation'
import { getPainelSession } from '@/features/painel/actions/authPainel'
import { exigirArea, roleParaArea } from '@/lib/permissoes.server'
import { permite } from '@/lib/permissoes'
import { listarAlunos } from '@/features/painel/actions/alunos'
import { listarProdutos } from '@/features/painel/actions/catalogo'
import { getAutoescolaFeatures } from '@/lib/features.server'
import { AlunosList } from '@/features/painel/components/AlunosList'

interface Props {
  params: Promise<{ escola: string }>
}

export default async function AlunosPage({ params }: Props) {
  const { escola } = await params
  const session = await getPainelSession(escola)
  if (!session) redirect(`/${escola}/painel/login`)
  const acesso = await exigirArea('cadastros')
  // Venda de créditos/planos exige editar Vendas; agendar exame exige editar Exames
  const podeVender = permite(acesso.permissoes.vendas, 'editar')

  const features = await getAutoescolaFeatures(session.autoescola_id)
  const [alunos, produtos] = await Promise.all([
    listarAlunos(session.autoescola_id),
    podeVender ? listarProdutos(session.autoescola_id) : Promise.resolve([]),
  ])

  return (
    <AlunosList
      alunos={alunos}
      autoescola_id={session.autoescola_id}
      produtos={produtos}
      escola={escola}
      userRole={await roleParaArea('cadastros')}
      vendasAtivo={features.vendas}
      podeVender={podeVender}
      examesAtivo={permite(acesso.permissoes.exames, 'editar')}
      loginSenhaAtivo={features.login_senha_aluno}
    />
  )
}
