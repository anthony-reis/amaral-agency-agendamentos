'use client'

import { useState, useTransition } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Wallet, DollarSign, TrendingUp, TrendingDown, ShoppingBag, Receipt, Clock, Undo2, AlertTriangle,
  Car, GraduationCap, SlidersHorizontal, X, LayoutDashboard, Tag, Gauge, Coins,
} from 'lucide-react'
import type { FinanceiroData, FinanceiroFiltros } from '../actions/financeiro'
import { FinanceiroGrafico } from './FinanceiroGrafico'
import { ProdutosTabela, RepasseTabela, TransacoesPainel, VendedoresTabela } from './FinanceiroTabelas'
import {
  AnelMargem, BarrasPercentuais, COR_INSIGHT, CountUp, Delta, Kpi, Painel, Vazio, entrada,
  fmtBRL, fmtData, fmtPct, gerarInsights,
} from './FinanceiroUi'

interface Props {
  initialData: FinanceiroData
  escola: string
}

type Aba = 'geral' | 'vendas' | 'repasse'

const ABAS: { id: Aba; label: string; icone: React.ComponentType<{ className?: string }> }[] = [
  { id: 'geral', label: 'Visão geral', icone: LayoutDashboard },
  { id: 'vendas', label: 'Vendas', icone: Tag },
  { id: 'repasse', label: 'Repasse', icone: Car },
]

function hojeBR(): string {
  return new Date(Date.now() - 3 * 3_600_000).toISOString().slice(0, 10)
}

function somarDias(iso: string, dias: number): string {
  const d = new Date(`${iso}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + dias)
  return d.toISOString().slice(0, 10)
}

const PRESETS: { id: string; label: string; periodo: () => { de: string; ate: string } }[] = [
  { id: 'hoje', label: 'Hoje', periodo: () => ({ de: hojeBR(), ate: hojeBR() }) },
  { id: '7d', label: '7 dias', periodo: () => ({ de: somarDias(hojeBR(), -6), ate: hojeBR() }) },
  { id: 'mes', label: 'Este mês', periodo: () => ({ de: `${hojeBR().slice(0, 8)}01`, ate: hojeBR() }) },
  {
    id: 'mes-passado',
    label: 'Mês passado',
    periodo: () => {
      const ate = somarDias(`${hojeBR().slice(0, 8)}01`, -1)
      return { de: `${ate.slice(0, 8)}01`, ate }
    },
  },
  { id: '90d', label: '90 dias', periodo: () => ({ de: somarDias(hojeBR(), -89), ate: hojeBR() }) },
  { id: 'ano', label: 'Este ano', periodo: () => ({ de: `${hojeBR().slice(0, 4)}-01-01`, ate: hojeBR() }) },
  { id: '12m', label: '12 meses', periodo: () => ({ de: somarDias(hojeBR(), -364), ate: hojeBR() }) },
]

const campoCls =
  'px-3 py-2 rounded-xl bg-[--p-bg-input] border border-[--p-border] text-sm text-[--p-text-1] focus:outline-none focus:ring-1 focus:ring-emerald-500/40 disabled:opacity-50 transition-shadow'

export function FinanceiroDashboard({ initialData, escola }: Props) {
  const [data, setData] = useState<FinanceiroData>(initialData)
  const [filtros, setFiltros] = useState<FinanceiroFiltros>(initialData.filtros)
  const [preset, setPreset] = useState<string | null>('mes')
  const [aba, setAba] = useState<Aba>('geral')
  const [avancado, setAvancado] = useState(false)
  const [erro, setErro] = useState('')
  const [isPending, startTransition] = useTransition()

  function carregar(novos: FinanceiroFiltros) {
    setFiltros(novos)
    setErro('')
    startTransition(async () => {
      const params = new URLSearchParams({
        de: novos.de,
        ate: novos.ate,
        origem: novos.origem ?? '',
        forma: novos.forma ?? '',
        vendedor: novos.vendedor ?? '',
        categoria: novos.categoria ?? '',
      })
      try {
        const res = await fetch(`/${escola}/painel/financeiro/api?${params}`)
        if (!res.ok) throw new Error()
        setData(await res.json())
      } catch {
        setErro('Não foi possível carregar o período. Tente de novo.')
      }
    })
  }

  function alterar(parcial: Partial<FinanceiroFiltros>, novoPreset?: string | null) {
    if (novoPreset !== undefined) setPreset(novoPreset)
    carregar({ ...filtros, ...parcial })
  }

  const qtdFiltros = [filtros.origem, filtros.forma, filtros.vendedor, filtros.categoria].filter(Boolean).length
  const periodoLabel = filtros.de === filtros.ate ? fmtData(filtros.de) : `${fmtData(filtros.de)} → ${fmtData(filtros.ate)}`

  const insights = gerarInsights(data)
  const saldoPositivo = data.saldo_centavos >= 0
  const saldoAnterior = data.anterior.receita_centavos - data.anterior.repasse_centavos
  const aulasVendidas = data.aulas_vendidas_carro + data.aulas_vendidas_moto
  const aulasConcluidas = data.aulas_realizadas + data.bancas_realizadas
  const semValor = data.repasse_instrutores.filter((r) => r.valor_a_pagar == null)
  const parteRepasse =
    data.receita_liquida_centavos > 0 ? Math.min((data.repasse_centavos / data.receita_liquida_centavos) * 100, 100) : 0

  return (
    <div className="space-y-5">
      {/* Cabeçalho */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between gap-3 flex-wrap"
      >
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-emerald-500" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-[--p-text-1]">Financeiro</h1>
            <p className="text-sm text-[--p-text-3]">Receita, repasse e vendas em um só lugar</p>
          </div>
        </div>
        <span className="px-3 py-1.5 rounded-full border border-[--p-border] bg-[--p-bg-card] text-xs font-medium text-[--p-text-2] tabular-nums">
          {periodoLabel}
        </span>
      </motion.div>

      {/* Filtros (fixos ao rolar) */}
      <div className="sticky top-0 z-20 -mx-1 px-1 pt-1 pb-3 bg-[--p-bg-base]/85 backdrop-blur-md">
        <div className="relative bg-[--p-bg-card] rounded-2xl border border-[--p-border] p-3 space-y-3 overflow-hidden">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap gap-1 p-1 rounded-xl bg-[--p-bg-base]">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    const periodo = p.periodo()
                    alterar(periodo, p.id)
                  }}
                  disabled={isPending}
                  className={`relative px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    preset === p.id ? 'text-emerald-500' : 'text-[--p-text-2] hover:text-[--p-text-1]'
                  }`}
                >
                  {preset === p.id && (
                    <motion.span
                      layoutId="financeiro-preset"
                      className="absolute inset-0 rounded-lg bg-emerald-500/15 border border-emerald-500/30"
                      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                    />
                  )}
                  <span className="relative">{p.label}</span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <input
                type="date"
                aria-label="Data inicial"
                value={filtros.de}
                max={filtros.ate}
                onChange={(e) => e.target.value && alterar({ de: e.target.value }, null)}
                disabled={isPending}
                className={campoCls}
              />
              <span className="text-[--p-text-3] text-xs">até</span>
              <input
                type="date"
                aria-label="Data final"
                value={filtros.ate}
                min={filtros.de}
                onChange={(e) => e.target.value && alterar({ ate: e.target.value }, null)}
                disabled={isPending}
                className={campoCls}
              />
              <button
                onClick={() => setAvancado((v) => !v)}
                className={`relative flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-colors ${
                  avancado || qtdFiltros > 0
                    ? 'border-emerald-500/40 text-emerald-500 bg-emerald-500/10'
                    : 'border-[--p-border] text-[--p-text-2] hover:bg-[--p-hover]'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Filtros
                {qtdFiltros > 0 && (
                  <span className="ml-0.5 w-4 h-4 rounded-full bg-emerald-500 text-white text-[10px] flex items-center justify-center">
                    {qtdFiltros}
                  </span>
                )}
              </button>
            </div>
          </div>

          <AnimatePresence initial={false}>
            {avancado && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <div className="flex flex-wrap items-end gap-3 pt-1 pb-1">
                  <label className="block">
                    <span className="block text-xs text-[--p-text-3] mb-1">Origem</span>
                    <select
                      value={filtros.origem ?? ''}
                      onChange={(e) => alterar({ origem: e.target.value as FinanceiroFiltros['origem'] })}
                      disabled={isPending}
                      className={campoCls}
                    >
                      <option value="">Todas</option>
                      <option value="manual">Vendas no painel</option>
                      <option value="mercado_pago">Loja online (Mercado Pago)</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="block text-xs text-[--p-text-3] mb-1">Forma de pagamento</span>
                    <select
                      value={filtros.forma ?? ''}
                      onChange={(e) => alterar({ forma: e.target.value })}
                      disabled={isPending}
                      className={campoCls}
                    >
                      <option value="">Todas</option>
                      <option value="dinheiro">Dinheiro</option>
                      <option value="pix">Pix</option>
                      <option value="cartao">Cartão</option>
                      <option value="outro">Outro</option>
                      <option value="bank_transfer">Pix / transferência (Mercado Pago)</option>
                      <option value="credit_card">Cartão de crédito (Mercado Pago)</option>
                      <option value="debit_card">Cartão de débito (Mercado Pago)</option>
                      <option value="account_money">Saldo Mercado Pago</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="block text-xs text-[--p-text-3] mb-1">Vendedor</span>
                    <select
                      value={filtros.vendedor ?? ''}
                      onChange={(e) => alterar({ vendedor: e.target.value })}
                      disabled={isPending}
                      className={campoCls}
                    >
                      <option value="">Todos</option>
                      {data.vendedores.map((v) => (
                        <option key={v.id} value={v.id}>{v.nome}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="block text-xs text-[--p-text-3] mb-1">Categoria</span>
                    <select
                      value={filtros.categoria ?? ''}
                      onChange={(e) => alterar({ categoria: e.target.value })}
                      disabled={isPending}
                      className={campoCls}
                    >
                      <option value="">Todas</option>
                      {data.categorias.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </label>
                  {qtdFiltros > 0 && (
                    <button
                      onClick={() => alterar({ origem: '', forma: '', vendedor: '', categoria: '' })}
                      disabled={isPending}
                      className="flex items-center gap-1 px-3 py-2 text-xs text-[--p-text-2] hover:text-[--p-text-1]"
                    >
                      <X className="w-3.5 h-3.5" /> Limpar
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {erro && <p className="text-sm text-red-400">{erro}</p>}

          {/* Barra de progresso ao recarregar */}
          <AnimatePresence>
            {isPending && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute left-0 right-0 bottom-0 h-0.5 overflow-hidden bg-emerald-500/10"
              >
                <motion.div
                  className="h-full w-1/3 bg-emerald-500 rounded-full"
                  animate={{ x: ['-100%', '300%'] }}
                  transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Abas */}
      <div className="flex gap-1 border-b border-[--p-border]" role="tablist">
        {ABAS.map((a) => (
          <button
            key={a.id}
            role="tab"
            aria-selected={aba === a.id}
            onClick={() => setAba(a.id)}
            className={`relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              aba === a.id ? 'text-[--p-text-1]' : 'text-[--p-text-3] hover:text-[--p-text-2]'
            }`}
          >
            <a.icone className="w-4 h-4" />
            {a.label}
            {aba === a.id && (
              <motion.span
                layoutId="financeiro-aba"
                className="absolute left-0 right-0 -bottom-px h-0.5 bg-emerald-500 rounded-full"
                transition={{ type: 'spring', stiffness: 400, damping: 34 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      <div className={`transition-opacity duration-200 ${isPending ? 'opacity-50 pointer-events-none' : ''}`}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={aba}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="space-y-5"
          >
            {/* ───────── VISÃO GERAL ───────── */}
            {aba === 'geral' && (
              <>
                {/* Herói + receita/repasse */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <motion.div
                    variants={entrada}
                    initial="hidden"
                    animate="visivel"
                    className={`lg:col-span-2 relative overflow-hidden rounded-2xl border p-6 ${
                      saldoPositivo
                        ? 'border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 via-[--p-bg-card] to-sky-500/10'
                        : 'border-red-500/30 bg-gradient-to-br from-red-500/10 via-[--p-bg-card] to-[--p-bg-card]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 text-xs font-medium text-[--p-text-3]">
                          <Coins className="w-3.5 h-3.5" /> Saldo do período (receita − repasse)
                        </p>
                        <p className="mt-2 text-3xl sm:text-4xl font-bold text-[--p-text-1] leading-none">
                          <CountUp value={data.saldo_centavos} format={(n) => fmtBRL(Math.round(n))} />
                        </p>
                        <div className="mt-3">
                          <Delta atual={data.saldo_centavos} anterior={saldoAnterior} />
                        </div>
                      </div>
                      <AnelMargem pct={data.margem_pct} />
                    </div>

                    <div className="mt-6">
                      <div className="flex justify-between text-[11px] text-[--p-text-3] mb-1.5">
                        <span>Para onde vai a receita</span>
                        <span className="tabular-nums">
                          {fmtPct(parteRepasse, 0)} repasse · {fmtPct(100 - parteRepasse, 0)} saldo
                        </span>
                      </div>
                      <div className="h-2.5 rounded-full bg-emerald-500/20 overflow-hidden flex">
                        <motion.div
                          className="h-full bg-violet-500"
                          initial={{ width: 0 }}
                          animate={{ width: `${parteRepasse}%` }}
                          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                        />
                      </div>
                    </div>

                    {data.repasse_incompleto && (
                      <p className="mt-4 flex items-start gap-2 text-xs text-amber-500">
                        <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        Repasse incompleto: {semValor.length} instrutor{semValor.length === 1 ? '' : 'es'} sem valor
                        de aula cadastrado, então o saldo está superestimado.{' '}
                        <button onClick={() => setAba('repasse')} className="underline">Ver quais</button>
                      </p>
                    )}
                  </motion.div>

                  <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
                    <Kpi
                      indice={1}
                      titulo="Receita líquida"
                      valor={<CountUp value={data.receita_liquida_centavos} format={(n) => fmtBRL(Math.round(n))} />}
                      icone={DollarSign}
                      cor="text-emerald-500 bg-emerald-500/10"
                      rodape={<Delta atual={data.receita_liquida_centavos} anterior={data.anterior.receita_centavos} curto />}
                    />
                    <Kpi
                      indice={2}
                      titulo="Repasse a instrutores"
                      valor={<CountUp value={data.repasse_centavos} format={(n) => fmtBRL(Math.round(n))} />}
                      icone={TrendingDown}
                      cor="text-violet-500 bg-violet-500/10"
                      rodape={
                        <>
                          <Delta atual={data.repasse_centavos} anterior={data.anterior.repasse_centavos} inverso curto />
                          <span className="block">{aulasConcluidas} aulas concluídas</span>
                        </>
                      }
                    />
                  </div>
                </div>

                {/* Insights */}
                {insights.length > 0 && (
                  <div>
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-[--p-text-3] uppercase tracking-wide mb-2">
                      <Gauge className="w-3.5 h-3.5" /> Destaques do período
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                      {insights.map((ins, i) => (
                        <motion.div
                          key={ins.titulo}
                          variants={entrada}
                          initial="hidden"
                          animate="visivel"
                          custom={i}
                          className={`flex gap-3 rounded-xl border p-3.5 ${COR_INSIGHT[ins.tipo]}`}
                        >
                          <ins.icone className="w-4 h-4 mt-0.5 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[--p-text-1]">{ins.titulo}</p>
                            <p className="text-xs text-[--p-text-2] mt-0.5 leading-relaxed">{ins.texto}</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Evolução */}
                <Painel
                  titulo={data.granularidade === 'dia' ? 'Evolução diária' : 'Evolução mensal'}
                  icone={TrendingUp}
                  nota="receita das vendas aprovadas × repasse das aulas concluídas"
                  indice={2}
                >
                  <div className="px-5 py-4">
                    {data.serie.every((p) => p.receita_centavos === 0 && p.repasse_centavos === 0) ? (
                      <Vazio texto="Nenhuma movimentação no período." />
                    ) : (
                      <FinanceiroGrafico serie={data.serie} granularidade={data.granularidade} />
                    )}
                  </div>
                </Painel>

                {/* KPIs secundários */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <Kpi
                    indice={0}
                    titulo="Vendas aprovadas"
                    valor={<CountUp value={data.vendas} format={(n) => String(Math.round(n))} />}
                    icone={Receipt}
                    cor="text-sky-500 bg-sky-500/10"
                    rodape={<Delta atual={data.vendas} anterior={data.anterior.vendas} curto />}
                  />
                  <Kpi
                    indice={1}
                    titulo="Ticket médio"
                    valor={<CountUp value={data.ticket_medio_centavos} format={(n) => fmtBRL(Math.round(n))} />}
                    icone={ShoppingBag}
                    cor="text-teal-500 bg-teal-500/10"
                    rodape={`${aulasVendidas} aulas vendidas`}
                  />
                  <Kpi
                    indice={2}
                    titulo="A receber (pendentes)"
                    valor={<CountUp value={data.pendente_centavos} format={(n) => fmtBRL(Math.round(n))} />}
                    icone={Clock}
                    cor="text-amber-500 bg-amber-500/10"
                    rodape={`${data.pendente_qtd} pedido${data.pendente_qtd === 1 ? '' : 's'} aguardando pagamento`}
                  />
                  <Kpi
                    indice={3}
                    titulo="Reembolsos"
                    valor={<CountUp value={data.reembolsos_centavos} format={(n) => fmtBRL(Math.round(n))} />}
                    icone={Undo2}
                    cor="text-red-400 bg-red-500/10"
                    rodape={
                      data.reembolsos_qtd > 0
                        ? `${data.reembolsos_qtd} venda${data.reembolsos_qtd === 1 ? '' : 's'} · bruto ${fmtBRL(data.receita_bruta_centavos)}`
                        : 'Nenhum no período'
                    }
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <Painel titulo="Forma de pagamento" icone={DollarSign} indice={3}>
                    <BarrasPercentuais linhas={data.por_forma} total={data.receita_liquida_centavos} />
                  </Painel>
                  <Painel titulo="Por categoria" icone={Tag} indice={4}>
                    <BarrasPercentuais linhas={data.por_categoria} total={data.receita_liquida_centavos} />
                  </Painel>
                </div>
              </>
            )}

            {/* ───────── VENDAS ───────── */}
            {aba === 'vendas' && (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <Kpi
                    indice={0}
                    titulo="Receita líquida"
                    valor={<CountUp value={data.receita_liquida_centavos} format={(n) => fmtBRL(Math.round(n))} />}
                    icone={DollarSign}
                    cor="text-emerald-500 bg-emerald-500/10"
                    rodape={<Delta atual={data.receita_liquida_centavos} anterior={data.anterior.receita_centavos} curto />}
                  />
                  <Kpi
                    indice={1}
                    titulo="Vendas aprovadas"
                    valor={<CountUp value={data.vendas} format={(n) => String(Math.round(n))} />}
                    icone={Receipt}
                    cor="text-sky-500 bg-sky-500/10"
                    rodape={<Delta atual={data.vendas} anterior={data.anterior.vendas} curto />}
                  />
                  <Kpi
                    indice={2}
                    titulo="Ticket médio"
                    valor={<CountUp value={data.ticket_medio_centavos} format={(n) => fmtBRL(Math.round(n))} />}
                    icone={ShoppingBag}
                    cor="text-teal-500 bg-teal-500/10"
                  />
                  <Kpi
                    indice={3}
                    titulo="Aulas vendidas"
                    valor={<CountUp value={aulasVendidas} format={(n) => String(Math.round(n))} />}
                    icone={GraduationCap}
                    cor="text-indigo-500 bg-indigo-500/10"
                    rodape={`${data.aulas_vendidas_carro} de carro · ${data.aulas_vendidas_moto} de moto`}
                  />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <Painel titulo="Origem das vendas" icone={ShoppingBag} indice={1}>
                    <BarrasPercentuais linhas={data.por_origem} total={data.receita_liquida_centavos} />
                  </Painel>
                  <ProdutosTabela data={data} indice={2} />
                </div>
                <VendedoresTabela data={data} indice={3} />
                <TransacoesPainel data={data} indice={4} />
              </>
            )}

            {/* ───────── REPASSE ───────── */}
            {aba === 'repasse' && (
              <>
                {data.repasse_incompleto && (
                  <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
                    <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                    <p className="text-sm text-[--p-text-2]">
                      <strong className="text-[--p-text-1]">Repasse incompleto.</strong>{' '}
                      {semValor.length} instrutor{semValor.length === 1 ? '' : 'es'} com aulas no período sem valor de
                      hora/aula ou de banca. Cadastre em{' '}
                      <a href={`/${escola}/painel/instrutores`} className="underline text-emerald-500">Instrutores</a>{' '}
                      para o repasse e o saldo ficarem corretos.
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <Kpi
                    indice={0}
                    titulo="Repasse total"
                    valor={<CountUp value={data.repasse_centavos} format={(n) => fmtBRL(Math.round(n))} />}
                    icone={TrendingDown}
                    cor="text-violet-500 bg-violet-500/10"
                    rodape={<Delta atual={data.repasse_centavos} anterior={data.anterior.repasse_centavos} inverso curto />}
                  />
                  <Kpi
                    indice={1}
                    titulo="Aulas concluídas"
                    valor={<CountUp value={data.aulas_realizadas} format={(n) => String(Math.round(n))} />}
                    icone={Car}
                    cor="text-sky-500 bg-sky-500/10"
                    rodape={`${data.bancas_realizadas} banca${data.bancas_realizadas === 1 ? '' : 's'}`}
                  />
                  <Kpi
                    indice={2}
                    titulo="Custo médio por aula"
                    valor={
                      aulasConcluidas > 0 && !data.repasse_incompleto
                        ? fmtBRL(Math.round(data.repasse_centavos / aulasConcluidas))
                        : '—'
                    }
                    icone={Coins}
                    cor="text-amber-500 bg-amber-500/10"
                    rodape={data.repasse_incompleto ? 'cadastre os valores dos instrutores' : 'repasse ÷ aulas concluídas'}
                  />
                  <Kpi
                    indice={3}
                    titulo="Repasse sobre a receita"
                    valor={data.receita_liquida_centavos > 0 ? fmtPct(parteRepasse) : '—'}
                    icone={Gauge}
                    cor="text-emerald-500 bg-emerald-500/10"
                    rodape={data.repasse_incompleto ? 'parcial' : 'quanto da receita vai para instrutores'}
                  />
                </div>
                <RepasseTabela data={data} escola={escola} indice={2} />
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
