'use client'

import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Download, Receipt, Search } from 'lucide-react'
import type { FinanceiroData, StatusVenda } from '../actions/financeiro'
import { Painel, Vazio, fmtBRL, fmtData, fmtPct, fmtReais } from './FinanceiroUi'

const TH = 'text-xs font-semibold text-[--p-text-3] px-4 py-2.5'
const POR_PAGINA = 15

export const STATUS_LABEL: Record<StatusVenda, string> = {
  aprovado: 'Aprovado',
  pendente: 'Pendente',
  reembolsado: 'Reembolsado',
}
const STATUS_COR: Record<StatusVenda, string> = {
  aprovado: 'bg-emerald-500/15 text-emerald-500',
  pendente: 'bg-amber-500/15 text-amber-500',
  reembolsado: 'bg-red-500/15 text-red-400',
}

export function ProdutosTabela({ data, indice }: { data: FinanceiroData; indice?: number }) {
  const maximo = data.por_produto[0]?.valor_centavos ?? 0
  return (
    <Painel titulo="Produtos mais vendidos" icone={Receipt} nota="por valor" indice={indice}>
      {data.por_produto.length === 0 ? (
        <Vazio texto="Sem vendas aprovadas no período." />
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[--p-border] bg-[--p-bg-base]">
              <th className={`${TH} text-left pl-5`}>Produto</th>
              <th className={`${TH} text-right`}>Qtd.</th>
              <th className={`${TH} text-right pr-5`}>Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[--p-border]">
            {data.por_produto.slice(0, 10).map((p) => (
              <tr key={p.chave} className="hover:bg-[--p-hover] transition-colors">
                <td className="px-5 py-2.5 text-[--p-text-1]">
                  <span className="block truncate max-w-[280px]">{p.chave}</span>
                  <span className="block text-[11px] text-[--p-text-3]">{p.categoria}</span>
                  <div className="mt-1.5 h-1 rounded-full bg-[--p-bg-base] overflow-hidden max-w-[220px]">
                    <motion.div
                      className="h-full rounded-full bg-emerald-500/70"
                      initial={{ width: 0 }}
                      animate={{ width: maximo > 0 ? `${(p.valor_centavos / maximo) * 100}%` : 0 }}
                      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                </td>
                <td className="px-4 py-2.5 text-right text-[--p-text-2] tabular-nums">{p.vendas}</td>
                <td className="px-5 py-2.5 text-right font-semibold text-emerald-500 tabular-nums">{fmtBRL(p.valor_centavos)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Painel>
  )
}

export function VendedoresTabela({ data, indice }: { data: FinanceiroData; indice?: number }) {
  return (
    <Painel titulo="Vendas por vendedor" icone={Receipt} nota="vendas aprovadas no período" indice={indice}>
      {data.por_vendedor.length === 0 ? (
        <Vazio texto="Sem vendas aprovadas no período." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[--p-border] bg-[--p-bg-base]">
                <th className={`${TH} text-left pl-5`}>Vendedor</th>
                <th className={`${TH} text-right`}>Vendas</th>
                <th className={`${TH} text-right`}>Ticket médio</th>
                <th className={`${TH} text-right`}>% da receita</th>
                <th className={`${TH} text-right pr-5`}>Valor total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[--p-border]">
              {data.por_vendedor.map((v, i) => {
                const pct = data.receita_liquida_centavos > 0 ? (v.valor_centavos / data.receita_liquida_centavos) * 100 : 0
                return (
                  <tr key={v.chave} className="hover:bg-[--p-hover] transition-colors">
                    <td className="px-5 py-3 font-medium text-[--p-text-1]">
                      <span className="inline-flex items-center gap-2">
                        {i === 0 && data.por_vendedor.length > 1 && <span title="Maior volume">🏆</span>}
                        {v.chave}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-[--p-text-2] tabular-nums">{v.vendas}</td>
                    <td className="px-4 py-3 text-right text-[--p-text-2] tabular-nums">{fmtBRL(v.ticket_medio_centavos)}</td>
                    <td className="px-4 py-3 text-right text-[--p-text-2] tabular-nums">{fmtPct(pct)}</td>
                    <td className="px-5 py-3 text-right font-semibold text-emerald-500 tabular-nums">{fmtBRL(v.valor_centavos)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Painel>
  )
}

export function RepasseTabela({ data, escola, indice }: { data: FinanceiroData; escola: string; indice?: number }) {
  const maximo = Math.max(...data.repasse_instrutores.map((r) => r.aulas + r.bancas), 0)
  return (
    <Painel titulo="Repasse por instrutor" icone={Receipt} nota="aulas e bancas concluídas no período" indice={indice}>
      {data.repasse_instrutores.length === 0 ? (
        <Vazio texto="Nenhuma aula concluída no período." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[--p-border] bg-[--p-bg-base]">
                <th className={`${TH} text-left pl-5`}>Instrutor</th>
                <th className={`${TH} text-left`}>Volume</th>
                <th className={`${TH} text-right`}>Aulas</th>
                <th className={`${TH} text-right`}>Bancas</th>
                <th className={`${TH} text-right`}>Valor/aula</th>
                <th className={`${TH} text-right pr-5`}>A pagar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[--p-border]">
              {data.repasse_instrutores.map((r) => (
                <tr key={r.instructor_name} className="hover:bg-[--p-hover] transition-colors">
                  <td className="px-5 py-3 font-medium text-[--p-text-1]">
                    {r.instructor_name}
                    {r.categoria && <span className="ml-2 text-[11px] text-[--p-text-3]">{r.categoria}</span>}
                  </td>
                  <td className="px-4 py-3 w-40">
                    <div className="h-1.5 rounded-full bg-[--p-bg-base] overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-violet-500"
                        initial={{ width: 0 }}
                        animate={{ width: maximo > 0 ? `${((r.aulas + r.bancas) / maximo) * 100}%` : 0 }}
                        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-[--p-text-2] tabular-nums">{r.aulas}</td>
                  <td className="px-4 py-3 text-right text-[--p-text-2] tabular-nums">{r.bancas}</td>
                  <td className="px-4 py-3 text-right text-[--p-text-2] tabular-nums">
                    {r.valor_hora_aula != null ? fmtReais(r.valor_hora_aula) : '—'}
                  </td>
                  <td className="px-5 py-3 text-right font-semibold tabular-nums">
                    {r.valor_a_pagar != null ? (
                      <span className="text-violet-500">{fmtReais(r.valor_a_pagar)}</span>
                    ) : (
                      <a href={`/${escola}/painel/instrutores`} className="text-xs font-medium text-amber-500 hover:underline">
                        definir valores
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-[--p-border] bg-[--p-bg-base]">
                <td className="px-5 py-3 text-xs font-semibold text-[--p-text-3]">Total</td>
                <td />
                <td className="px-4 py-3 text-right font-semibold text-[--p-text-1] tabular-nums">{data.aulas_realizadas}</td>
                <td className="px-4 py-3 text-right font-semibold text-[--p-text-1] tabular-nums">{data.bancas_realizadas}</td>
                <td />
                <td className="px-5 py-3 text-right font-bold text-violet-500 tabular-nums">{fmtBRL(data.repasse_centavos)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </Painel>
  )
}

function csvCelula(v: string | number): string {
  return `"${String(v).replace(/"/g, '""')}"`
}

export function TransacoesPainel({ data, indice }: { data: FinanceiroData; indice?: number }) {
  const [statusTab, setStatusTab] = useState<'todos' | StatusVenda>('todos')
  const [busca, setBusca] = useState('')
  const [pagina, setPagina] = useState(1)

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return data.transacoes.filter((t) => {
      if (statusTab !== 'todos' && t.status !== statusTab) return false
      if (!termo) return true
      return [t.aluno, t.produto, t.vendedor ?? '', t.forma].some((c) => c.toLowerCase().includes(termo))
    })
  }, [data.transacoes, statusTab, busca])

  const contagem = useMemo(() => {
    const c = { todos: data.transacoes.length, aprovado: 0, pendente: 0, reembolsado: 0 }
    for (const t of data.transacoes) c[t.status]++
    return c
  }, [data.transacoes])

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA))
  const atual = Math.min(pagina, totalPaginas)
  const visiveis = filtradas.slice((atual - 1) * POR_PAGINA, atual * POR_PAGINA)

  function exportarCsv() {
    const linhas = [
      ['Data', 'Status', 'Aluno', 'Produto', 'Categoria', 'Origem', 'Forma de pagamento', 'Vendedor', 'Valor (R$)'],
      ...filtradas.map((t) => [
        fmtData(t.data), STATUS_LABEL[t.status], t.aluno, t.produto, t.categoria,
        t.origem === 'manual' ? 'Painel' : 'Loja online', t.forma, t.vendedor ?? '',
        (t.valor_centavos / 100).toFixed(2).replace('.', ','),
      ]),
    ]
    const csv = linhas.map((l) => l.map(csvCelula).join(';')).join('\n')
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `vendas-${data.filtros.de}_a_${data.filtros.ate}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Painel
      titulo="Vendas do período"
      icone={Receipt}
      nota={`${filtradas.length} registro${filtradas.length === 1 ? '' : 's'}`}
      indice={indice}
      acao={
        <button
          onClick={exportarCsv}
          disabled={filtradas.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[--p-border] text-xs font-medium text-[--p-text-2] hover:bg-[--p-hover] disabled:opacity-40 transition-colors"
        >
          <Download className="w-3.5 h-3.5" /> CSV
        </button>
      }
    >
      <div className="px-5 py-3 border-b border-[--p-border] flex flex-wrap items-center gap-3">
        <div className="flex gap-1.5 flex-wrap">
          {(['todos', 'aprovado', 'pendente', 'reembolsado'] as const).map((s) => (
            <button
              key={s}
              onClick={() => { setStatusTab(s); setPagina(1) }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                statusTab === s
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-500'
                  : 'border-[--p-border] text-[--p-text-2] hover:bg-[--p-hover]'
              }`}
            >
              {s === 'todos' ? 'Todas' : STATUS_LABEL[s]} <span className="opacity-60">{contagem[s]}</span>
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[180px]">
          <Search className="w-4 h-4 text-[--p-text-3] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={busca}
            onChange={(e) => { setBusca(e.target.value); setPagina(1) }}
            placeholder="Buscar aluno, produto, vendedor…"
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-[--p-bg-input] border border-[--p-border] text-sm text-[--p-text-1] placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
          />
        </div>
      </div>

      {visiveis.length === 0 ? (
        <Vazio texto="Nenhuma venda encontrada." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[--p-border] bg-[--p-bg-base]">
                <th className={`${TH} text-left pl-5`}>Data</th>
                <th className={`${TH} text-left`}>Aluno</th>
                <th className={`${TH} text-left`}>Produto</th>
                <th className={`${TH} text-left`}>Pagamento</th>
                <th className={`${TH} text-left`}>Vendedor</th>
                <th className={`${TH} text-left`}>Status</th>
                <th className={`${TH} text-right pr-5`}>Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[--p-border]">
              <AnimatePresence mode="popLayout" initial={false}>
                {visiveis.map((t) => (
                  <motion.tr
                    key={t.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="hover:bg-[--p-hover] transition-colors"
                  >
                    <td className="px-5 py-2.5 text-[--p-text-2] whitespace-nowrap">{fmtData(t.data)}</td>
                    <td className="px-4 py-2.5 text-[--p-text-1]">{t.aluno}</td>
                    <td className="px-4 py-2.5 text-[--p-text-2]">
                      {t.produto}
                      <span className="block text-[11px] text-[--p-text-3]">{t.categoria}</span>
                    </td>
                    <td className="px-4 py-2.5 text-[--p-text-2]">{t.forma}</td>
                    <td className="px-4 py-2.5 text-[--p-text-2]">{t.vendedor ?? '—'}</td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${STATUS_COR[t.status]}`}>
                        {STATUS_LABEL[t.status]}
                      </span>
                    </td>
                    <td
                      className={`px-5 py-2.5 text-right font-semibold whitespace-nowrap tabular-nums ${
                        t.status === 'reembolsado' ? 'text-red-400 line-through' : t.status === 'pendente' ? 'text-amber-500' : 'text-emerald-500'
                      }`}
                    >
                      {fmtBRL(t.valor_centavos)}
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      )}

      {totalPaginas > 1 && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-[--p-border] text-xs text-[--p-text-3]">
          <span>Página {atual} de {totalPaginas}</span>
          <div className="flex gap-1">
            <button
              onClick={() => setPagina(atual - 1)}
              disabled={atual <= 1}
              className="p-1.5 rounded-lg border border-[--p-border] hover:bg-[--p-hover] disabled:opacity-40"
              aria-label="Página anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPagina(atual + 1)}
              disabled={atual >= totalPaginas}
              className="p-1.5 rounded-lg border border-[--p-border] hover:bg-[--p-hover] disabled:opacity-40"
              aria-label="Próxima página"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      {data.transacoes_truncadas && (
        <p className="px-5 py-3 border-t border-[--p-border] text-xs text-amber-500">
          Mostrando só as 3.000 vendas mais recentes. Reduza o período para ver todas.
        </p>
      )}
    </Painel>
  )
}
