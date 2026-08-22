import { redirect } from 'next/navigation'
import { Receipt } from 'lucide-react'
import { getPainelSession } from '@/features/painel/actions/authPainel'
import { listarVendas } from '@/features/painel/actions/vendas'
import { VendasList } from '@/features/painel/components/VendasList'

interface Props {
  params: Promise<{ escola: string }>
}

export default async function VendasPage({ params }: Props) {
  const { escola } = await params
  const session = await getPainelSession(escola)
  if (!session) redirect(`/${escola}/painel/login`)

  const vendas = await listarVendas(session.autoescola_id)

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-[--p-accent]/10 flex items-center justify-center">
          <Receipt className="w-5 h-5 text-[--p-accent]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[--p-text-1]">Vendas</h1>
          <p className="text-sm text-[--p-text-3]">Compras dos alunos na loja e vendas registradas manualmente</p>
        </div>
      </div>

      <VendasList autoescola_id={session.autoescola_id} vendas={vendas} />
    </div>
  )
}
