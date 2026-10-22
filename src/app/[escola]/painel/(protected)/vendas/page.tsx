import { redirect } from 'next/navigation'
import { Receipt } from 'lucide-react'
import { getPainelSession } from '@/features/painel/actions/authPainel'
import { exigirArea, podeReembolsarVendas } from '@/lib/permissoes.server'
import { exigirFeature } from '@/lib/features.server'
import { createServiceClient } from '@/lib/supabase/server'
import { reconciliarPedidosPendentes } from '@/lib/reconciliarPedidos'
import { listarVendas } from '@/features/painel/actions/vendas'
import { VendasList } from '@/features/painel/components/VendasList'

interface Props {
  params: Promise<{ escola: string }>
}

export default async function VendasPage({ params }: Props) {
  const { escola } = await params
  const session = await getPainelSession(escola)
  if (!session) redirect(`/${escola}/painel/login`)
  const acesso = await exigirArea('vendas')
  // Reembolso é permissão individual (/admin), não vem de "Editar" em Vendas.
  const podeReembolsar = podeReembolsarVendas(acesso)
  await exigirFeature(session.autoescola_id, 'vendas')

  // Pix pago no app do banco pode não disparar o webhook: ao abrir a tela,
  // confirma no MP os pedidos recentes ainda pendentes (idempotente).
  try {
    await reconciliarPedidosPendentes(createServiceClient(), { autoescolaId: session.autoescola_id, dias: 3 })
  } catch (e) {
    console.error('[vendas] Falha ao reconciliar pedidos pendentes:', e)
  }

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

      <VendasList autoescola_id={session.autoescola_id} vendas={vendas} podeReembolsar={podeReembolsar} />
    </div>
  )
}
