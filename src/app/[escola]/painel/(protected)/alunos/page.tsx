import { redirect } from 'next/navigation'
import { getPainelSession } from '@/features/painel/actions/authPainel'
import { exigirArea, roleParaArea } from '@/lib/permissoes.server'
import { permite } from '@/lib/permissoes'
import { listarAlunos } from '@/features/painel/actions/alunos'
import { listarProdutos } from '@/features/painel/actions/catalogo'
import { getAutoescolaFeatures } from '@/lib/features.server'
import { statusContratosPorAluno } from '@/features/painel/actions/contratos'
import { getVincularAlunoInstrutor } from '@/features/painel/actions/configuracoes'
import { listarInstrutores } from '@/features/painel/actions/instrutores'
import { createServiceClient } from '@/lib/supabase/server'
import { aulasFuturasPorDocumento } from '@/lib/aulasFuturas.server'
import { agruparPorInstrutor } from '@/lib/vinculoInstrutor'
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
  const vinculoAtivo = await getVincularAlunoInstrutor(session.autoescola_id)
  const [alunos, produtos, contratoStatus, instrutores] = await Promise.all([
    listarAlunos(session.autoescola_id),
    podeVender ? listarProdutos(session.autoescola_id) : Promise.resolve([]),
    features.contratos ? statusContratosPorAluno(session.autoescola_id) : Promise.resolve({}),
    vinculoAtivo ? listarInstrutores(session.autoescola_id) : Promise.resolve(null),
  ])

  // Aulas futuras por aluno e instrutor (selo na tabela e cabeçalho do painel)
  const aulasFuturasPorAluno: Record<string, { instrutor: string; qtd: number }[]> = {}
  if (vinculoAtivo) {
    const porDoc = await aulasFuturasPorDocumento(createServiceClient(), session.autoescola_id)
    for (const a of alunos) {
      const grupos = agruparPorInstrutor(porDoc.get(a.document_id) ?? [])
      if (grupos.length) aulasFuturasPorAluno[a.id] = grupos.map((g) => ({ instrutor: g.instrutor, qtd: g.aulas.length }))
    }
  }

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
      cambioAtivo={features.separar_cambio}
      aulasFuturasPorAluno={aulasFuturasPorAluno}
      instrutoresVinculo={instrutores ? instrutores.map((i) => ({ id: i.id, name: i.name })) : null}
      contratosAtivo={features.contratos}
      contratoStatusInicial={contratoStatus}
    />
  )
}
