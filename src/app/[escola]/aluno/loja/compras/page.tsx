import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ReceiptText, ShoppingBag } from 'lucide-react'
import { listarMinhasCompras } from '@/features/aluno/actions/loja'
import { formatarPrecoCentavos, type PedidoLojaStatus } from '@/lib/loja-types'

interface Props {
  params: Promise<{ escola: string }>
}

const STATUS_LABEL: Record<PedidoLojaStatus, string> = {
  pendente: 'Aguardando pagamento',
  aprovado: 'Pago',
  rejeitado: 'Recusado',
  cancelado: 'Cancelado',
  expirado: 'Expirado',
  reembolsado: 'Reembolsado',
}

const STATUS_BADGE: Record<PedidoLojaStatus, string> = {
  pendente: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  aprovado: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  rejeitado: 'bg-red-500/10 text-red-500 border-red-500/20',
  cancelado: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  expirado: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  reembolsado: 'bg-violet-500/10 text-violet-500 border-violet-500/20',
}

function formatarData(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
  })
}

export default async function MinhasComprasPage({ params }: Props) {
  const { escola } = await params
  const cookieStore = await cookies()
  if (!cookieStore.get('student_id')?.value) redirect(`/${escola}/aluno`)

  const compras = await listarMinhasCompras()

  return (
    <div className="px-4 pt-6 pb-8 max-w-2xl mx-auto w-full">
      <Link
        href={`/${escola}/aluno/loja`}
        className="inline-flex items-center gap-1.5 text-sm text-[--p-text-3] hover:text-[--p-text-1] transition-colors mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar para a loja
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-[--p-accent]/10 flex items-center justify-center">
          <ReceiptText className="w-5 h-5 text-[--p-accent]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[--p-text-1]">Minhas Compras</h1>
          <p className="text-sm text-[--p-text-3]">Histórico de pedidos na loja</p>
        </div>
      </div>

      {compras.length === 0 ? (
        <div className="bg-[--p-bg-card] border border-[--p-border] rounded-2xl py-14 text-center">
          <ShoppingBag className="w-8 h-8 text-[--p-text-3] mx-auto mb-3" />
          <p className="text-sm text-[--p-text-3]">Você ainda não fez nenhuma compra.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {compras.map((c) => (
            <div key={c.id} className="bg-[--p-bg-card] border border-[--p-border] rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3 mb-1">
                <h3 className="font-semibold text-[--p-text-1] text-sm">
                  {c.produto_snapshot?.nome ?? 'Produto'}
                </h3>
                <span className={`text-[10px] font-semibold px-2 py-1 rounded-full border shrink-0 ${STATUS_BADGE[c.status]}`}>
                  {STATUS_LABEL[c.status]}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-[--p-text-3]">{formatarData(c.created_at)}</p>
                <p className="text-sm font-bold text-[--p-text-1]">
                  {formatarPrecoCentavos(c.valor_centavos)}
                </p>
              </div>
              {c.status === 'aprovado' && c.creditos_liberados && (
                <p className="text-[11px] text-emerald-500 mt-1.5">✓ Aulas creditadas</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
