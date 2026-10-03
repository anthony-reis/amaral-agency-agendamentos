'use client'

import { useState, useTransition } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, CheckCircle2, Loader2, Receipt, RefreshCw, Undo2, X, XCircle } from 'lucide-react'
import { listarVendas, reembolsarPedido, type PedidoComAluno } from '../actions/vendas'
import { formatarPrecoCentavos, type PedidoLojaStatus } from '@/lib/loja-types'

interface Props {
  autoescola_id: string
  vendas: PedidoComAluno[]
  /** Perfil com "editar" em Vendas (reembolsar). */
  podeEditar: boolean
}

/** Prazo usual para o dinheiro voltar ao aluno, por forma de pagamento. */
const PRAZO_REEMBOLSO: Record<string, string> = {
  bank_transfer: 'Pix: em geral volta na hora, ou em poucos minutos, para a conta de origem.',
  credit_card: 'Cartão de crédito: o estorno aparece na fatura conforme o banco emissor (normalmente na próxima fatura ou na seguinte).',
  debit_card: 'Cartão de débito: alguns dias úteis, conforme o banco.',
  ticket: 'Boleto: o valor vai para a conta Mercado Pago do pagador (sem conta, o Mercado Pago pede os dados bancários).',
  account_money: 'Saldo Mercado Pago: volta para o saldo da conta do pagador.',
}

type ModalReembolso =
  | { etapa: 'confirmar'; pedido: PedidoComAluno }
  | { etapa: 'processando'; pedido: PedidoComAluno }
  | { etapa: 'sucesso'; pedido: PedidoComAluno }
  | { etapa: 'erro'; pedido: PedidoComAluno; erro: string }

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

export function VendasList({ autoescola_id, vendas: initial, podeEditar }: Props) {
  const [vendas, setVendas] = useState<PedidoComAluno[]>(initial)
  const [filtro, setFiltro] = useState<PedidoLojaStatus | 'todos'>('todos')
  const [isPending, startTransition] = useTransition()
  const [modal, setModal] = useState<ModalReembolso | null>(null)

  function aplicarFiltro(novo: PedidoLojaStatus | 'todos') {
    setFiltro(novo)
    startTransition(async () => {
      const data = await listarVendas(autoescola_id, { status: novo })
      setVendas(data)
    })
  }

  function confirmarReembolso() {
    if (modal?.etapa !== 'confirmar') return
    const pedido = modal.pedido
    setModal({ etapa: 'processando', pedido })
    startTransition(async () => {
      const result = await reembolsarPedido(autoescola_id, pedido.id)
      if (!result.success) {
        setModal({ etapa: 'erro', pedido, erro: result.error })
        return
      }
      setModal({ etapa: 'sucesso', pedido })
      setVendas(await listarVendas(autoescola_id, { status: filtro }))
    })
  }

  const fecharModal = () => { if (modal?.etapa !== 'processando') setModal(null) }

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
                      {/* Reembolso só para vendas do Mercado Pago (venda manual não tem pagamento no MP) */}
                      {podeEditar && v.status === 'aprovado' && v.origem !== 'manual' && (
                        <button
                          onClick={() => setModal({ etapa: 'confirmar', pedido: v })}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-600"
                          title="Reembolsar pedido"
                        >
                          <Undo2 className="w-3.5 h-3.5" />
                          Reembolsar
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

      <AnimatePresence>
        {modal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40"
              onClick={fecharModal}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none"
            >
              <div
                role="dialog"
                aria-modal="true"
                className="pointer-events-auto bg-[--p-bg-card] rounded-2xl border border-[--p-border] p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto"
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      modal.etapa === 'sucesso' ? 'bg-emerald-500/10' : modal.etapa === 'erro' ? 'bg-red-500/10' : 'bg-amber-500/10'
                    }`}>
                      {modal.etapa === 'sucesso' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        : modal.etapa === 'erro' ? <XCircle className="w-5 h-5 text-red-500" />
                        : <Undo2 className="w-5 h-5 text-amber-500" />}
                    </div>
                    <h3 className="font-bold text-[--p-text-1]">
                      {modal.etapa === 'sucesso' ? 'Reembolso solicitado'
                        : modal.etapa === 'erro' ? 'Não foi possível reembolsar'
                        : 'Reembolsar venda'}
                    </h3>
                  </div>
                  {modal.etapa !== 'processando' && (
                    <button onClick={fecharModal} className="p-1 text-[--p-text-3] hover:text-[--p-text-1]" aria-label="Fechar">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Resumo do pedido */}
                <div className="bg-[--p-bg-input] rounded-xl p-3 mb-4 text-sm space-y-1">
                  <p className="font-semibold text-[--p-text-1]">{modal.pedido.aluno?.name ?? 'Aluno'}</p>
                  <p className="text-[--p-text-2]">{modal.pedido.produto_snapshot?.nome ?? '—'}</p>
                  <p className="flex items-center justify-between text-[--p-text-3]">
                    <span>{modal.pedido.payment_method ? METODO_LABEL[modal.pedido.payment_method] ?? modal.pedido.payment_method : '—'}</span>
                    <span className="text-base font-bold text-[--p-text-1]">{formatarPrecoCentavos(modal.pedido.valor_centavos)}</span>
                  </p>
                </div>

                {(modal.etapa === 'confirmar' || modal.etapa === 'processando') && (
                  <div className="space-y-3 text-sm">
                    <p className="text-[--p-text-2]">
                      O valor total será devolvido ao aluno pelo Mercado Pago, saindo do saldo da conta da autoescola.
                    </p>
                    {modal.pedido.payment_method && PRAZO_REEMBOLSO[modal.pedido.payment_method] && (
                      <p className="text-[--p-text-3]">{PRAZO_REEMBOLSO[modal.pedido.payment_method]}</p>
                    )}
                    <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>
                        Os créditos de aula do aluno <strong className="font-semibold">não são removidos automaticamente</strong>. Depois de reembolsar, ajuste em Alunos.
                      </span>
                    </div>
                    <div className="flex gap-2 justify-end pt-1">
                      <button
                        onClick={fecharModal}
                        disabled={modal.etapa === 'processando'}
                        className="px-4 py-2 text-sm text-[--p-text-3] hover:text-[--p-text-1] disabled:opacity-50"
                      >
                        Voltar
                      </button>
                      <button
                        onClick={confirmarReembolso}
                        disabled={modal.etapa === 'processando'}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-400 disabled:opacity-60"
                      >
                        {modal.etapa === 'processando' ? <><Loader2 className="w-4 h-4 animate-spin" /> Reembolsando...</> : 'Confirmar reembolso'}
                      </button>
                    </div>
                  </div>
                )}

                {modal.etapa === 'sucesso' && (
                  <div className="space-y-3 text-sm">
                    <p className="text-[--p-text-2]">
                      O Mercado Pago recebeu o pedido de reembolso e a venda agora aparece como <strong>Reembolsado</strong>.
                    </p>
                    {modal.pedido.payment_method && PRAZO_REEMBOLSO[modal.pedido.payment_method] && (
                      <p className="text-[--p-text-3]">{PRAZO_REEMBOLSO[modal.pedido.payment_method]}</p>
                    )}
                    <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>Lembre de remover os créditos de aula não usados em Alunos.</span>
                    </div>
                    <div className="flex justify-end pt-1">
                      <button onClick={fecharModal} className="px-4 py-2 rounded-xl bg-[--p-accent] text-white text-sm font-semibold hover:opacity-90">
                        Entendi
                      </button>
                    </div>
                  </div>
                )}

                {modal.etapa === 'erro' && (
                  <div className="space-y-3 text-sm">
                    <p className="text-red-500">{modal.erro}</p>
                    <p className="text-[--p-text-3]">
                      Causas comuns: saldo insuficiente na conta Mercado Pago da autoescola ou pagamento fora do prazo de reembolso. Nada foi alterado na venda.
                    </p>
                    <div className="flex gap-2 justify-end pt-1">
                      <button onClick={fecharModal} className="px-4 py-2 text-sm text-[--p-text-3] hover:text-[--p-text-1]">
                        Fechar
                      </button>
                      <button
                        onClick={() => setModal({ etapa: 'confirmar', pedido: modal.pedido })}
                        className="px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-400"
                      >
                        Tentar de novo
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
