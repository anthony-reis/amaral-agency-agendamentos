import { redirect } from 'next/navigation'
import { getPainelSession } from '@/features/painel/actions/authPainel'
import { permite } from '@/lib/permissoes'
import { exigirArea, roleParaArea } from '@/lib/permissoes.server'
import { exigirFeature } from '@/lib/features.server'
import { listarCategoriasParaAutoescola, listarDatasExamePorMes } from '@/features/painel/actions/datasExame'
import { DatasExame } from '@/features/painel/components/DatasExame'

interface Props {
  params: Promise<{ escola: string }>
  searchParams: Promise<{ categoria?: string; data?: string }>
}

export default async function DatasExamePage({ params, searchParams }: Props) {
  const { escola } = await params
  const { categoria, data } = await searchParams
  const session = await getPainelSession(escola)
  if (!session) redirect(`/${escola}/painel/login`)
  const acesso = await exigirArea('exames')
  const podeEditar = permite(acesso.permissoes.exames, 'editar')
  await exigirFeature(session.autoescola_id, 'exames')

  const now = new Date()

  const [categorias, datasIniciais] = await Promise.all([
    listarCategoriasParaAutoescola(session.autoescola_id),
    listarDatasExamePorMes(session.autoescola_id, now.getFullYear(), now.getMonth() + 1),
  ])

  return (
    <DatasExame
      autoescola_id={session.autoescola_id}
      escola={escola}
      categorias={categorias}
      datasIniciais={datasIniciais}
      initialCategoriaCodigo={categoria || undefined}
      initialData={data || undefined}
      podeEditar={podeEditar}
      />
  )
}
