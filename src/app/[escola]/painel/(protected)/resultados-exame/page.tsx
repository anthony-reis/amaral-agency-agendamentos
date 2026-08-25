import { redirect } from 'next/navigation'
import { getPainelSession } from '@/features/painel/actions/authPainel'
import { listarResultadosExame } from '@/features/painel/actions/resultadosExame'
import { listarCategoriasParaAutoescola } from '@/features/painel/actions/datasExame'
import { ResultadosExame } from '@/features/painel/components/ResultadosExame'

interface Props {
  params: Promise<{ escola: string }>
}

export default async function ResultadosExamePage({ params }: Props) {
  const { escola } = await params
  const session = await getPainelSession(escola)
  if (!session) redirect(`/${escola}/painel/login`)

  const [resultados, categorias] = await Promise.all([
    listarResultadosExame(session.autoescola_id),
    listarCategoriasParaAutoescola(session.autoescola_id),
  ])

  return (
    <ResultadosExame
      autoescolaId={session.autoescola_id}
      categorias={categorias}
      resultadosIniciais={resultados}
    />
  )
}
