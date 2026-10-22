'use client'

import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { CheckCircle2, Copy, Loader2, RefreshCw, Undo2, X } from 'lucide-react'
import { getDetalheVenda, verificarPedido, type DetalheVenda, type PedidoComAluno } from '../actions/vendas'
import { CATEGORIAS_CREDITO, formatarPrecoCentavos } from '@/lib/loja-types'
import { METODO_LABEL, STATUS_BADGE, STATUS_LABEL, formatarDataHoraCompleta } from './vendasUi'

interface Props {
  autoescola_id: string
  pedidoId: string | null
  podeEditar: boolean
  podeReembolsar: boolean
  onFechar: () => void
  onReembolsar: (pedido: PedidoComAluno) => void
  /** Chamado quando algo mudou no servidor (ex.: crédito liberado) para a lista recarregar. */
  onAtualizou: () => void
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h4 className="text-[11px] font-bold uppercase tracking-wide text-[--p-text-3]">{titulo}</h4>
      <div className="bg-[--p-bg-input] rounded-xl p-3 space-y-2 text-sm">{children}</div>
    </section>
  )
}

function Linha({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-[--p-text-3] shrink-0">{rotulo}</span>
      <span className="text-[--p-text-1] text-right break-all">{children}</span>
    </div>
  )
}

function Copiavel({ valor }: { valor: string }) {
  const [copiado, setCopiado] = useState(false)
  async function copiar() {
    try {
      await navigator.clipboard.writeText(valor)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 1500)
    } catch {
      /* sem permissão de área de transferência: ignora */
    }
  }
  return (
    <button onClick={copiar} className="inline-flex items-center gap-1.5 font-mono text-xs hover:text-[--p-accent]" title="Copiar">
      {valor}
      {copiado ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 opacity-60" />}
    </button>
  )
}

export function VendaDetalheDrawer({ autoescola_id, pedidoId, podeEditar, podeReembolsar, onFechar, onReembolsar, onAtualizou }: Props) {
  const reduzir = useReducedMotion()
  const [detalhe, setDetalhe] = useState<DetalheVenda | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [verificando, setVerificando] = useState(false)
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)

  const carregar = useCallback(async (id: string) => {
    const r = await getDetalheVenda(autoescola_id, id)
    if (!r.success) { setErro(r.error); return }
    setErro(null)
    setDetalhe(r.data)
  }, [autoescola_id])

  // Sempre busca os dados frescos ao abrir (inclui histórico de auditoria)
  useEffect(() => {
    setDetalhe(null)
    setErro(null)
    setMsg(null)
    if (pedidoId) carregar(pedidoId)
  }, [pedidoId, carregar])

  useEffect(() => {
    if (!pedidoId) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onFechar() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pedidoId, onFechar])

  async function consultarMercadoPago() {
    if (!pedidoId) return
    setMsg(null)
    setVerificando(true)
    const r = await verificarPedido(autoescola_id, pedidoId)
    setVerificando(false)
    if (!r.success) { setMsg({ tipo: 'erro', texto: r.error }); return }
    setMsg({
      tipo: 'ok',
      texto: r.data.creditado
        ? 'Pagamento confirmado no Mercado Pago e créditos liberados.'
        : `Sem mudança: o pedido continua "${STATUS_LABEL[r.data.status]}" no Mercado Pago.`,
    })
    await carregar(pedidoId)
    onAtualizou()
  }

  const p = detalhe?.pedido
  const creditos = p
    ? CATEGORIAS_CREDITO
        .map((cat) => ({ cat, qtd: p.produto_snapshot?.[`qtd_cat_${cat}` as const] ?? 0 }))
        .filter((c) => c.qtd > 0)
    : []

  return (
    <AnimatePresence>
      {pedidoId && (
        <>
          <motion.div
            key="fundo"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onFechar}
          />
          <motion.aside
            key="painel"
            role="dialog"
            aria-modal="true"
            aria-label="Detalhe da venda"
            initial={reduzir ? { opacity: 0 } : { x: '100%' }}
            animate={reduzir ? { opacity: 1 } : { x: 0 }}
            exit={reduzir ? { opacity: 0 } : { x: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 40 }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-[--p-bg-card] border-l border-[--p-border] shadow-2xl z-50 flex flex-col"
          >
            <header className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[--p-border]">
              <h3 className="font-bold text-[--p-text-1]">Detalhe da venda</h3>
              <button onClick={onFechar} className="p-1 text-[--p-text-3] hover:text-[--p-text-1]" aria-label="Fechar">
                <X className="w-5 h-5" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {erro && <p className="text-sm text-red-500">{erro}</p>}

              {!p && !erro && (
                <div className="flex items-center gap-2 text-sm text-[--p-text-3]">
                  <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
                </div>
              )}

              {p && (
                <motion.div
                  initial={reduzir ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-2xl font-bold text-[--p-text-1]">{formatarPrecoCentavos(p.valor_centavos)}</p>
                      <p className="text-sm text-[--p-text-2] mt-0.5">{p.produto_snapshot?.nome ?? '—'}</p>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-1 rounded-full border whitespace-nowrap ${STATUS_BADGE[p.status]}`}>
                      {STATUS_LABEL[p.status]}
                    </span>
                  </div>

                  {p.status === 'pendente' && p.origem !== 'manual' && (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300 space-y-2">
                      <p>
                        {p.payment_method
                          ? 'O pagamento foi iniciado e ainda não foi confirmado.'
                          : 'O aluno abriu o checkout mas nenhum pagamento foi registrado aqui. Ele pode ter pago e a notificação não ter chegado: consulte o Mercado Pago.'}
                      </p>
                      {podeEditar && (
                        <button
                          onClick={consultarMercadoPago}
                          disabled={verificando}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 text-white font-semibold hover:bg-amber-400 disabled:opacity-60"
                        >
                          {verificando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                          Consultar no Mercado Pago
                        </button>
                      )}
                    </div>
                  )}

                  <AnimatePresence>
                    {msg && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className={`text-sm ${msg.tipo === 'ok' ? 'text-emerald-500' : 'text-red-500'}`}
                      >
                        {msg.texto}
                      </motion.p>
                    )}
                  </AnimatePresence>

                  <Secao titulo="Aluno">
                    <Linha rotulo="Nome">{p.aluno?.name ?? '—'}</Linha>
                    <Linha rotulo="CPF/CNH">{p.aluno?.document_id ?? '—'}</Linha>
                    {detalhe?.alunoContato?.email && <Linha rotulo="E-mail">{detalhe.alunoContato.email}</Linha>}
                    {detalhe?.alunoContato?.phone && <Linha rotulo="Telefone">{detalhe.alunoContato.phone}</Linha>}
                  </Secao>

                  <Secao titulo="Pagamento">
                    <Linha rotulo="Origem">{p.origem === 'manual' ? 'Venda manual' : 'Mercado Pago'}</Linha>
                    {p.origem === 'manual' && <Linha rotulo="Vendedor">{p.vendedor?.full_name ?? '—'}</Linha>}
                    <Linha rotulo="Método">{p.payment_method ? METODO_LABEL[p.payment_method] ?? p.payment_method : '—'}</Linha>
                    <Linha rotulo="Criado em">{formatarDataHoraCompleta(p.created_at)}</Linha>
                    <Linha rotulo="Pago em">{p.paid_at ? formatarDataHoraCompleta(p.paid_at) : '—'}</Linha>
                    <Linha rotulo="Atualizado em">{formatarDataHoraCompleta(p.updated_at)}</Linha>
                    <Linha rotulo="ID do pedido"><Copiavel valor={p.id} /></Linha>
                    {p.mp_payment_id && <Linha rotulo="ID do pagamento MP"><Copiavel valor={p.mp_payment_id} /></Linha>}
                  </Secao>

                  <Secao titulo="Créditos">
                    {creditos.length === 0 ? (
                      <p className="text-[--p-text-3]">Produto sem créditos de aula.</p>
                    ) : (
                      creditos.map((c) => (
                        <Linha key={c.cat} rotulo={`Categoria ${c.cat.toUpperCase()}`}>
                          {c.qtd} aula{c.qtd !== 1 ? 's' : ''}
                        </Linha>
                      ))
                    )}
                    <Linha rotulo="Liberados">
                      {p.creditos_liberados ? (
                        <span className="text-emerald-500 font-semibold">Sim</span>
                      ) : (
                        <span className="text-[--p-text-3]">Não</span>
                      )}
                    </Linha>
                  </Secao>

                  <Secao titulo="Histórico">
                    {detalhe && detalhe.logs.length === 0 ? (
                      <p className="text-[--p-text-3]">Nenhum registro na auditoria para esta venda.</p>
                    ) : (
                      <ul className="space-y-2">
                        {detalhe?.logs.map((l, i) => (
                          <li key={i} className="text-xs">
                            <p className="text-[--p-text-3]">
                              {formatarDataHoraCompleta(l.created_at)}{l.username ? ` · ${l.username}` : ''}
                            </p>
                            <p className="text-[--p-text-1]">{l.description}</p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Secao>
                </motion.div>
              )}
            </div>

            {p && podeReembolsar && p.status === 'aprovado' && p.origem !== 'manual' && (
              <footer className="px-5 py-4 border-t border-[--p-border]">
                <button
                  onClick={() => onReembolsar(p)}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-red-500/40 text-red-500 text-sm font-semibold hover:bg-red-500/10"
                >
                  <Undo2 className="w-4 h-4" /> Reembolsar venda
                </button>
              </footer>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
