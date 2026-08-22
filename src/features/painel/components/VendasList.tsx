'use client'

import { useState, useTransition } from 'react'
import { Receipt, RefreshCw, Undo2 } from 'lucide-react'
import { listarVendas, reembolsarPedido, type PedidoComAluno } from '../actions/vendas'
import { formatarPrecoCentavos, type PedidoLojaStatus } from '@/lib/loja-types'

interface Props {
  autoescola_id: string
  vendas: PedidoComAluno[]
}

const STATUS_LABEL: Record<PedidoLojaStatus, string> = {
  pendente: 'Pendente',
  aprovado: 'Aprovado',
  rejeitado: 'Rejeitado',
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

const METODO_LABEL: Record<string, string> = {
  credit_card: 'Cartão de crédito',
  debit_card: 'Cartão de débito',
  bank_transfer: 'Pix',
  ticket: 'Boleto',
  account_money: 'Saldo MP',
}

const FILTROS: Array<PedidoLojaStatus | 'todos'> = [
  'todos', 'aprovado', 'pendente', 'rejeitado', 'reembolsado',
]

function formatarData(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

export function VendasList({ autoescola_id, vendas: initial }: Props) {
  const [vendas, setVendas] = useState<PedidoComAluno[]>(initial)
  const [filtro, setFiltro] = useState<PedidoLojaStatus | 'todos'>('todos')
  const [isPending, startTransition] = useTransition()
  const [reembolsando, setReembolsando] = useState<string | null>(null)
  const [erroReembolso, setErroReembolso] = useState('')

  function aplicarFiltro(novo: PedidoLojaStatus | 'todos') {
    setFiltro(novo)
    startTransition(async () => {
      const data = await listarVendas(autoescola_id, { status: novo })
      setVendas(data)
    })
  }

  function handleReembolso(pedidoId: string) {
    if (!confirm('Confirma o reembolso desse pedido no Mercado Pago? Os créditos NÃO são removidos automaticamente.')) return
    setErroReembolso('')
    setReembolsando(pedidoId)
    startTransition(async () => {
      const result = await reembolsarPedido(autoescola_id, pedidoId)
      setReembolsando(null)
      if (!result.success) { setErroReembolso(result.error); return }
      const data = await listarVendas(autoescola_id, { status: filtro })
      setVendas(data)
    })
  }

  const totalAprovado = vendas
    .filter((v) => v.status === 'aprovado')
    .reduce((acc, v) => acc + v.valor_centavos, 0)

  return (
    <div className="space-y-4">
      {/* Filtros + resumo */}
      <div className="flex flex-wrap items-center gap-2">
        {FILTROS.map((f) => (
          <button
            key={f}
            onClick={() => aplicarFiltro(f)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
              filtro === f
                ? 'bg-[--p-accent]/10 text-[--p-accent] border-[--p-accent]/30'
                : 'bg-[--p-bg-card] text-[--p-text-3] border-[--p-border] hover:text-[--p-text-1]'
            }`}
          >
            {f === 'todos' ? 'Todos' : STATUS_LABEL[f]}
          </button>
        ))}
        <button
          onClick={() => aplicarFiltro(filtro)}
          disabled={isPending}
          className="ml-auto p-2 rounded-lg text-[--p-text-3] hover:text-[--p-text-1] hover:bg-[--p-hover] transition-colors"
          title="Atualizar"
        >
          <RefreshCw className={`w-4 h-4 ${isPending ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <p className="text-sm text-[--p-text-3]">
        {vendas.length} venda{vendas.length !== 1 ? 's' : ''}
        {totalAprovado > 0 && (
          <> · <span className="text-[--p-text-1] font-semibold">{formatarPrecoCentavos(totalAprovado)}</span> em vendas aprovadas (nesta lista)</>
        )}
      </p>

      {erroReembolso && <p className="text-sm text-red-500">{erroReembolso}</p>}

      {vendas.length === 0 ? (
        <div className="bg-[--p-bg-card] border border-[--p-border] rounded-2xl py-14 text-center">
          <Receipt className="w-8 h-8 text-[--p-text-3] mx-auto mb-3" />
          <p className="text-sm text-[--p-text-3]">Nenhuma venda encontrada.</p>
        </div>
      ) : (
        <div className="bg-[--p-bg-card] border border-[--p-border] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[--p-border] text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-[--p-text-3]">Data</th>
                  <th className="px-4 py-3 text-xs font-semibold text-[--p-text-3]">Aluno</th>
                  <th className="px-4 py-3 text-xs font-semibold text-[--p-text-3]">Produto</th>
                  <th className="px-4 py-3 text-xs font-semibold text-[--p-text-3]">Origem</th>
                  <th className="px-4 py-3 text-xs font-semibold text-[--p-text-3]">Valor</th>
                  <th className="px-4 py-3 text-xs font-semibold text-[--p-text-3]">Método</th>
                  <th className="px-4 py-3 text-xs font-semibold text-[--p-text-3]">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-[--p-text-3]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[--p-border]">
                {vendas.map((v) => (
                  <tr key={v.id} className="hover:bg-[--p-hover] transition-colors">
                    <td className="px-4 py-3 text-[--p-text-3] whitespace-nowrap">{formatarData(v.created_at)}</td>
                    <td className="px-4 py-3">
                      <p className="text-[--p-text-1] font-medium">{v.aluno?.name ?? '—'}</p>
                      {v.aluno?.document_id && (
                        <p className="text-xs text-[--p-text-3]">{v.aluno.document_id}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[--p-text-2]">{v.produto_snapshot?.nome ?? '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {v.origem === 'manual' ? (
                        <div>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-500 border border-sky-500/20">Manual</span>
                          {v.vendedor && <p className="text-[10px] text-[--p-text-3] mt-0.5">{v.vendedor.full_name}</p>}
                        </div>
                      ) : (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/20">Mercado Pago</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[--p-text-1] font-semibold whitespace-nowrap">
                      {formatarPrecoCentavos(v.valor_centavos)}
                    </td>
                    <td className="px-4 py-3 text-[--p-text-3] whitespace-nowrap">
                      {v.payment_method ? METODO_LABEL[v.payment_method] ?? v.payment_method : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-semibold px-2 py-1 rounded-full border whitespace-nowrap ${STATUS_BADGE[v.status]}`}>
                        {STATUS_LABEL[v.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {v.status === 'aprovado' && (
                        <button
                          onClick={() => handleReembolso(v.id)}
                          disabled={reembolsando === v.id}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-600 disabled:opacity-50"
                          title="Reembolsar pedido"
                        >
                          <Undo2 className="w-3.5 h-3.5" />
                          {reembolsando === v.id ? 'Reembolsando...' : 'Reembolsar'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
