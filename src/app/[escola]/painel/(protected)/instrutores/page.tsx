import { redirect } from 'next/navigation'
import { getPainelSession } from '@/features/painel/actions/authPainel'
import { listarInstrutores } from '@/features/painel/actions/instrutores'
import { listarCategorias } from '@/features/admin/actions/categorias'
import { InstrutoesTable } from '@/features/painel/components/InstrutoesTable'

interface Props {
  params: Promise<{ escola: string }>
}

export default async function InstrutoesPage({ params }: Props) {
  const { escola } = await params
  const session = await getPainelSession(escola)
  if (!session) redirect(`/${escola}/painel/login`)

  const [instrutores, categorias] = await Promise.all([
    listarInstrutores(session.autoescola_id),
    listarCategorias(session.autoescola_id),
  ])

  // Fallback: se não há categorias configuradas, usa os valores legados
  const categoriasOpcoes = categorias.length > 0
    ? categorias.map((c) => c.codigo)
    : ['CARRO', 'MOTO', 'AMBOS']

  return (
    <InstrutoesTable
      instrutores={instrutores}
      autoescola_id={session.autoescola_id}
      categoriasOpcoes={categoriasOpcoes}
    />
  )
}
