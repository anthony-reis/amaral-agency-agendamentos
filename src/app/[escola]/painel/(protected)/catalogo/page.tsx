import { redirect } from 'next/navigation'
import { Package } from 'lucide-react'
import { getPainelSession } from '@/features/painel/actions/authPainel'
import { listarProdutos } from '@/features/painel/actions/catalogo'
import { listarCategorias } from '@/features/admin/actions/categorias'
import { lojaHabilitada } from '@/lib/loja'
import { CatalogoManager } from '@/features/painel/components/CatalogoManager'

interface Props {
  params: Promise<{ escola: string }>
}

export default async function CatalogoPage({ params }: Props) {
  const { escola } = await params
  const session = await getPainelSession(escola)
  if (!session) redirect(`/${escola}/painel/login`)

  // Feature gate: sem credencial MP ativa a rota não existe para o tenant
  if (!(await lojaHabilitada(session.autoescola_id))) {
    redirect(`/${escola}/painel/dashboard`)
  }

  const [produtos, categorias] = await Promise.all([
    listarProdutos(session.autoescola_id),
    listarCategorias(session.autoescola_id),
  ])

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-[--p-accent]/10 flex items-center justify-center">
          <Package className="w-5 h-5 text-[--p-accent]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[--p-text-1]">Catálogo</h1>
          <p className="text-sm text-[--p-text-3]">
            Pacotes, aulas avulsas e serviços vendidos na loja do aluno
          </p>
        </div>
      </div>

      <CatalogoManager
        autoescola_id={session.autoescola_id}
        produtos={produtos}
        categorias={categorias.map((c) => ({ codigo: c.codigo, nome: c.nome }))}
      />
    </div>
  )
}
