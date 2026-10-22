'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion } from 'framer-motion'
import {
  AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Download, Loader2, Receipt, RefreshCw, Search, Undo2, X, XCircle,
} from 'lucide-react'
import {
  exportarVendasCsv, listarVendasPaginado, reembolsarPedido, verificarPagamentosPendentes,
  type PedidoComAluno, type VendasPagina,
} from '../actions/vendas'
import { formatarPrecoCentavos } from '@/lib/loja-types'
import {
  FILTROS_VENDAS_PADRAO, VENDAS_POR_PAGINA,
  type FiltroOrigemVenda, type FiltroPeriodoVenda, type FiltroStatusVenda, type FiltrosVendas,
} from '@/lib/vendas-filtros'
import { METODO_LABEL, STATUS_BADGE, STATUS_LABEL, formatarData } from './vendasUi'
import { VendaDetalheDrawer } from './VendaDetalheDrawer'

interface Props {
  autoescola_id: string
  /** Primeira página, já carregada no servidor com os filtros padrão. */
  vendasIniciais: VendasPagina
  /** Permissão individual de reembolso (concedida no /admin, não vem do perfil). */
  podeReembolsar: boolean
  /** Perfil com "Editar" em Vendas (consultar pagamento no MP). */
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


const FILTROS_STATUS: Array<{ id: FiltroStatusVenda; label: string }> = [
  { id: 'todas', label: 'Todas' },
  { id: 'aprovado', label: 'Aprovadas' },
  { id: 'pendente', label: 'Pendentes' },
  { id: 'rejeitado', label: 'Rejeitadas' },
  { id: 'reembolsado', label: 'Reembolsadas' },
  { id: 'abandonados', label: 'Abandonadas' },
]

const PERIODOS: Array<{ id: FiltroPeriodoVenda; label: string }> = [
  { id: 'tudo', label: 'Todo o período' },
  { id: 'hoje', label: 'Hoje' },
  { id: '7d', label: 'Últimos 7 dias' },
  { id: '30d', label: 'Últimos 30 dias' },
  { id: 'mes', label: 'Este mês' },
]

/** Número que "sobe" até o valor novo quando ele muda (respeita prefers-reduced-motion). */
function Numero({ valor, formato }: { valor: number; formato: (n: number) => string }) {
  const reduzir = useReducedMotion()
  const mv = useMotionValue(valor)
  const formatoRef = useRef(formato)
  formatoRef.current = formato
  const [texto, setTexto] = useState(() => formato(valor))

  useEffect(() => {
    if (reduzir) {
      mv.set(valor)
      setTexto(formatoRef.current(valor))
      return
    }
    const unsub = mv.on('change', (v) => setTexto(formatoRef.current(Math.round(v))))
    const controle = animate(mv, valor, { duration: 0.6, ease: 'easeOut' })
    return () => { controle.stop(); unsub() }
  }, [valor, reduzir, mv])

  return <>{texto}</>
}

function Resumo({ rotulo, children, detalhe, indice }: { rotulo: string; children: React.ReactNode; detalhe?: string; indice: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: indice * 0.05, duration: 0.25 }}
      className="bg-[--p-bg-card] border border-[--p-border] rounded-2xl px-4 py-3"
    >
      <p className="text-xs font-semibold text-[--p-text-3]">{rotulo}</p>
      <p className="text-xl font-bold text-[--p-text-1] mt-0.5">{children}</p>
      {detalhe && <p className="text-[11px] text-[--p-text-3] mt-0.5">{detalhe}</p>}
    </motion.div>
  )
}

const selectCls =
  'text-xs font-semibold px-3 py-2 rounded-lg border bg-[--p-bg-card] text-[--p-text-2] border-[--p-border] focus:outline-none focus:border-[--p-accent]/50'

export function VendasList({ autoescola_id, vendasIniciais, podeReembolsar, podeEditar }: Props) {
  const reduzir = useReducedMotion()
  const [dados, setDados] = useState<VendasPagina>(vendasIniciais)
  const [filtros, setFiltros] = useState<FiltrosVendas>(FILTROS_VENDAS_PADRAO)
  const [buscaDigitada, setBuscaDigitada] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erroLista, setErroLista] = useState<string | null>(null)
  const [exportando, setExportando] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [modal, setModal] = useState<ModalReembolso | null>(null)
  const [detalheId, setDetalheId] = useState<string | null>(null)
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)
  const requisicao = useRef(0)
  const primeiraRender = useRef(true)

  // Busca no servidor sempre que um filtro muda; só a resposta mais recente vale.
  async function carregar(novos: FiltrosVendas) {
    const id = ++requisicao.current
    setCarregando(true)
    const r = await listarVendasPaginado(autoescola_id, novos)
    if (id !== requisicao.current) return
    setCarregando(false)
    if (!r.success) { setErroLista(r.error); return }
    setErroLista(null)
    setDados(r.data)
    // O servidor pode ter ajustado a página (ex.: filtro encolheu a lista)
    if (r.data.pagina !== novos.pagina) setFiltros((f) => ({ ...f, pagina: r.data.pagina }))
  }

  useEffect(() => {
    if (primeiraRender.current) { primeiraRender.current = false; return }
    carregar(filtros)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros])

  // Debounce da busca por texto
  useEffect(() => {
    const t = setTimeout(() => {
      setFiltros((f) => (f.busca === buscaDigitada.trim() ? f : { ...f, busca: buscaDigitada.trim(), pagina: 1 }))
    }, 350)
    return () => clearTimeout(t)
  }, [buscaDigitada])

  const filtrosAtivos =
    filtros.status !== 'todas' || filtros.periodo !== 'tudo' || filtros.origem !== 'todas' || filtros.busca !== ''

  function mudar(parcial: Partial<FiltrosVendas>) {
    setFiltros((f) => ({ ...f, ...parcial, pagina: parcial.pagina ?? 1 }))
  }

  function limparFiltros() {
    setBuscaDigitada('')
    setFiltros(FILTROS_VENDAS_PADRAO)
  }

  function recarregar() {
    carregar(filtros)
  }

  function verificarPagamentos() {
    setAviso(null)
    startTransition(async () => {
      const r = await verificarPagamentosPendentes(autoescola_id)
      if (!r.success) { setAviso({ tipo: 'erro', texto: r.error }); return }
      const { aprovados, expirados, erros } = r.data
      setAviso({
        tipo: erros > 0 ? 'erro' : 'ok',
        texto: aprovados > 0
          ? `${aprovados} pagamento(s) confirmado(s) e créditos liberados.`
          : erros > 0 ? 'Não foi possível consultar o Mercado Pago para alguns pedidos. Tente de novo.'
          : `Nenhum pagamento novo encontrado${expirados > 0 ? ` (${expirados} pedido(s) abandonado(s) marcado(s) como expirado)` : ''}.`,
      })
      await carregar(filtros)
    })
  }

  async function exportarCsv() {
    setAviso(null)
    setExportando(true)
    const r = await exportarVendasCsv(autoescola_id, filtros)
    setExportando(false)
    if (!r.success) { setAviso({ tipo: 'erro', texto: r.error }); return }
    const blob = new Blob([r.data.csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `vendas-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setAviso({ tipo: 'ok', texto: `${r.data.linhas} venda(s) exportada(s) com os filtros atuais.` })
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
      await carregar(filtros)
    })
  }

  const fecharModal = () => { if (modal?.etapa !== 'processando') setModal(null) }

  const { vendas, total, pagina, totalPaginas, contagem, resumo } = dados
  const de = total === 0 ? 0 : (pagina - 1) * VENDAS_POR_PAGINA + 1
  const ate = Math.min(pagina * VENDAS_POR_PAGINA, total)
  const dinheiro = useMemo(() => (n: number) => formatarPrecoCentavos(n), [])
  const inteiro = useMemo(() => (n: number) => String(n), [])
  const ticketMedio = resumo.aprovadoQtd ? Math.round(resumo.aprovadoValor / resumo.aprovadoQtd) : 0

  return (
    <div className="space-y-4">
      {/* Resumo (respeita busca, período e origem) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Resumo indice={0} rotulo="Vendas aprovadas" detalhe={`${resumo.aprovadoQtd} venda${resumo.aprovadoQtd !== 1 ? 's' : ''}`}>
          <Numero valor={resumo.aprovadoValor} formato={dinheiro} />
        </Resumo>
        <Resumo indice={1} rotulo="Ticket médio">
          {resumo.aprovadoQtd ? <Numero valor={ticketMedio} formato={dinheiro} /> : '—'}
        </Resumo>
        <Resumo indice={2} rotulo="Aguardando pagamento" detalhe={`${resumo.pendenteQtd} pedido${resumo.pendenteQtd !== 1 ? 's' : ''}`}>
          <Numero valor={resumo.pendenteValor} formato={dinheiro} />
        </Resumo>
        <Resumo indice={3} rotulo="Reembolsadas">
          <Numero valor={resumo.reembolsadoQtd} formato={inteiro} />
        </Resumo>
      </div>

      {/* Busca + período + origem + ações */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-[--p-text-3] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={buscaDigitada}
            onChange={(e) => setBuscaDigitada(e.target.value)}
            placeholder="Buscar por aluno, CPF/CNH ou produto"
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border bg-[--p-bg-card] text-[--p-text-1] border-[--p-border] placeholder:text-[--p-text-3] focus:outline-none focus:border-[--p-accent]/50"
          />
        </div>
        <select value={filtros.periodo} onChange={(e) => mudar({ periodo: e.target.value as FiltroPeriodoVenda })} className={selectCls} aria-label="Período">
          {PERIODOS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
        <select value={filtros.origem} onChange={(e) => mudar({ origem: e.target.value as FiltroOrigemVenda })} className={selectCls} aria-label="Origem">
          <option value="todas">Todas as origens</option>
          <option value="mercado_pago">Mercado Pago</option>
          <option value="manual">Manual</option>
        </select>
        <button
          onClick={exportarCsv}
          disabled={exportando || total === 0}
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border bg-[--p-bg-card] text-[--p-text-2] border-[--p-border] hover:text-[--p-text-1] transition-colors disabled:opacity-50"
          title="Baixa todas as vendas do filtro atual (não só a página)"
        >
          {exportando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          Exportar CSV
        </button>
        {podeEditar && (
          <button
            onClick={verificarPagamentos}
            disabled={isPending}
            className="text-xs font-semibold px-3 py-2 rounded-lg border bg-[--p-bg-card] text-[--p-text-2] border-[--p-border] hover:text-[--p-text-1] transition-colors disabled:opacity-50"
            title="Consulta o Mercado Pago e libera os créditos de pagamentos já confirmados"
          >
            Verificar pagamentos
          </button>
        )}
        <button
          onClick={recarregar}
          disabled={carregando}
          className="p-2 rounded-lg text-[--p-text-3] hover:text-[--p-text-1] hover:bg-[--p-hover] transition-colors"
          title="Atualizar lista"
        >
          <RefreshCw className={`w-4 h-4 ${carregando ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {aviso && (
          <motion.p
            key={aviso.texto}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`text-sm ${aviso.tipo === 'ok' ? 'text-emerald-500' : 'text-red-500'}`}
          >
            {aviso.texto}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Status com contadores */}
      <div className="flex flex-wrap items-center gap-2">
        {FILTROS_STATUS.map((f) => {
          const ativo = filtros.status === f.id
          return (
            <button
              key={f.id}
              onClick={() => mudar({ status: f.id })}
              className={`relative text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                ativo
                  ? 'text-[--p-accent] border-[--p-accent]/30'
                  : 'bg-[--p-bg-card] text-[--p-text-3] border-[--p-border] hover:text-[--p-text-1]'
              }`}
            >
              {ativo && (
                <motion.span
                  layoutId="vendas-chip-ativo"
                  className="absolute inset-0 rounded-lg bg-[--p-accent]/10"
                  transition={reduzir ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 40 }}
                />
              )}
              <span className="relative">{f.label} <span className="opacity-70">{contagem[f.id]}</span></span>
            </button>
          )
        })}
        {filtrosAtivos && (
          <button onClick={limparFiltros} className="ml-auto text-xs font-semibold text-[--p-text-3] hover:text-[--p-text-1] inline-flex items-center gap-1">
            <X className="w-3.5 h-3.5" /> Limpar filtros
          </button>
        )}
      </div>

      {erroLista && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
          <span>{erroLista}</span>
          <button onClick={recarregar} className="font-semibold hover:underline">Tentar de novo</button>
        </div>
      )}

      {total === 0 && !carregando ? (
        <div className="bg-[--p-bg-card] border border-[--p-border] rounded-2xl py-14 text-center">
          <Receipt className="w-8 h-8 text-[--p-text-3] mx-auto mb-3" />
          <p className="text-sm text-[--p-text-3]">
            {filtrosAtivos ? 'Nenhuma venda com esses filtros.' : 'Nenhuma venda encontrada.'}
          </p>
          {filtrosAtivos && (
            <button onClick={limparFiltros} className="mt-3 text-xs font-semibold text-[--p-accent] hover:underline">
              Limpar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="relative bg-[--p-bg-card] border border-[--p-border] rounded-2xl overflow-hidden">
          {/* Barra de progresso fina enquanto o servidor responde */}
          <AnimatePresence>
            {carregando && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute top-0 left-0 right-0 h-0.5 bg-[--p-accent]/20 overflow-hidden z-10"
              >
                <motion.div
                  className="h-full w-1/3 bg-[--p-accent]"
                  animate={reduzir ? undefined : { x: ['-100%', '300%'] }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div className={`overflow-x-auto transition-opacity ${carregando ? 'opacity-60' : 'opacity-100'}`}>
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
                {vendas.map((v: PedidoComAluno, i: number) => (
                  <motion.tr
                    key={v.id}
                    initial={reduzir ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i, 12) * 0.02, duration: 0.2 }}
                    onClick={() => setDetalheId(v.id)}
                    className="hover:bg-[--p-hover] transition-colors cursor-pointer"
                  >
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
                      {v.status === 'pendente' && v.origem !== 'manual' && (
                        <p className="text-[10px] text-[--p-text-3] mt-0.5">
                          {v.payment_method ? 'Aguardando pagamento' : 'Checkout aberto'}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {/* Reembolso só para vendas do Mercado Pago (venda manual não tem pagamento no MP) */}
                      {podeReembolsar && v.status === 'aprovado' && v.origem !== 'manual' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setModal({ etapa: 'confirmar', pedido: v }) }}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-600"
                          title="Reembolsar pedido"
                        >
                          <Undo2 className="w-3.5 h-3.5" />
                          Reembolsar
                        </button>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginação (no servidor) */}
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-[--p-border] text-xs text-[--p-text-3]">
            <span>{de}–{ate} de {total}</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => mudar({ pagina: pagina - 1 })}
                disabled={pagina <= 1 || carregando}
                className="p-1.5 rounded-lg hover:bg-[--p-hover] hover:text-[--p-text-1] disabled:opacity-40 disabled:hover:bg-transparent"
                aria-label="Página anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-semibold text-[--p-text-2]">{pagina} / {totalPaginas}</span>
              <button
                onClick={() => mudar({ pagina: pagina + 1 })}
                disabled={pagina >= totalPaginas || carregando}
                className="p-1.5 rounded-lg hover:bg-[--p-hover] hover:text-[--p-text-1] disabled:opacity-40 disabled:hover:bg-transparent"
                aria-label="Próxima página"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <VendaDetalheDrawer
        autoescola_id={autoescola_id}
        pedidoId={detalheId}
        podeEditar={podeEditar}
        podeReembolsar={podeReembolsar}
        onFechar={() => setDetalheId(null)}
        onReembolsar={(pedido) => { setDetalheId(null); setModal({ etapa: 'confirmar', pedido }) }}
        onAtualizou={recarregar}
      />

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
