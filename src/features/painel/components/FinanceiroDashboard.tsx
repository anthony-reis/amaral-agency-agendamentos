'use client'

import { useState, useTransition } from 'react'
import { Wallet, DollarSign, TrendingUp, TrendingDown, ShoppingBag, Users } from 'lucide-react'
import type { FinanceiroMensalData } from '../actions/financeiro'

interface Props {
  initialData: FinanceiroMensalData
  escola: string
  autoescola_id: string
}

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

function fmtCentavos(centavos: number): string {
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function FinanceiroDashboard({ initialData, escola, autoescola_id }: Props) {
  const now = new Date()
  const [mes, setMes] = useState(initialData.mes)
  const [ano, setAno] = useState(initialData.ano)
  const [data, setData] = useState<FinanceiroMensalData>(initialData)
  const [isPending, startTransition] = useTransition()

  async function aplicarFiltro(novoMes: number, novoAno: number) {
    startTransition(async () => {
      const params = new URLSearchParams({
        mes: String(novoMes),
        ano: String(novoAno),
        autoescola_id,
      })
      const res = await fetch(`/${escola}/painel/financeiro/api?${params}`)
      if (res.ok) setData(await res.json())
    })
  }

  function handleMesChange(v: number) {
    setMes(v)
    aplicarFiltro(v, ano)
  }

  function handleAnoChange(v: number) {
    setAno(v)
    aplicarFiltro(mes, v)
  }

  const anos = Array.from({ length: 3 }, (_, i) => now.getFullYear() - i)
  const saldoPositivo = data.saldo_centavos >= 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Wallet className="w-6 h-6 text-emerald-400" />
        <div>
          <h1 className="text-xl font-bold text-[--p-text-1]">Financeiro</h1>
          <p className="text-sm text-[--p-text-3]">Caixa, repasse a instrutores e vendas por vendedor</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-[--p-bg-card] rounded-2xl border border-[--p-border] p-5">
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <label className="block text-xs text-[--p-text-3] mb-1">Mês</label>
            <select
              value={mes}
              onChange={(e) => handleMesChange(Number(e.target.value))}
              disabled={isPending}
              className="px-3 py-2 rounded-xl bg-[--p-bg-input] border border-[--p-border] text-sm text-[--p-text-1] focus:outline-none focus:ring-1 focus:ring-emerald-500/40 disabled:opacity-50"
            >
              {MESES.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-[--p-text-3] mb-1">Ano</label>
            <select
              value={ano}
              onChange={(e) => handleAnoChange(Number(e.target.value))}
              disabled={isPending}
              className="px-3 py-2 rounded-xl bg-[--p-bg-input] border border-[--p-border] text-sm text-[--p-text-1] focus:outline-none focus:ring-1 focus:ring-emerald-500/40 disabled:opacity-50"
            >
              {anos.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          {isPending && (
            <div className="flex items-center gap-2 text-xs text-[--p-text-3] mt-4">
              <div className="w-3.5 h-3.5 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
              Carregando...
            </div>
          )}
        </div>
      </div>

      {/* Cards resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-emerald-600 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-white/70 mb-1">Total em Caixa</p>
            <p className="text-2xl font-bold text-white/90">{fmtCentavos(data.receita_total_centavos)}</p>
          </div>
          <DollarSign className="w-8 h-8 text-white/60" />
        </div>
        <div className="bg-violet-600 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-white/70 mb-1">A Repassar (Instrutores)</p>
            <p className="text-2xl font-bold text-white/90">{fmtCentavos(data.despesa_instrutores_centavos)}</p>
          </div>
          <TrendingDown className="w-8 h-8 text-white/60" />
        </div>
        <div className={`rounded-2xl p-5 flex items-center justify-between ${saldoPositivo ? 'bg-sky-600' : 'bg-red-600'}`}>
          <div>
            <p className="text-xs text-white/70 mb-1">Saldo do Mês</p>
            <p className="text-2xl font-bold text-white/90">{fmtCentavos(data.saldo_centavos)}</p>
          </div>
          <TrendingUp className="w-8 h-8 text-white/60" />
        </div>
      </div>

      {/* Detalhe da receita */}
      <div className="bg-[--p-bg-card] rounded-2xl border border-[--p-border] p-5">
        <div className="flex items-center gap-2 mb-4">
          <ShoppingBag className="w-4 h-4 text-[--p-text-3]" />
          <h2 className="text-sm font-semibold text-[--p-text-1]">Origem das vendas</h2>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-[--p-border] p-4">
            <p className="text-xs text-[--p-text-3] mb-1">Mercado Pago</p>
            <p className="text-lg font-bold text-[--p-text-1]">{fmtCentavos(data.receita_mercado_pago_centavos)}</p>
          </div>
          <div className="rounded-xl border border-[--p-border] p-4">
            <p className="text-xs text-[--p-text-3] mb-1">Vendas manuais</p>
            <p className="text-lg font-bold text-[--p-text-1]">{fmtCentavos(data.receita_manual_centavos)}</p>
          </div>
        </div>
      </div>

      {/* Vendas por vendedor */}
      <div className="bg-[--p-bg-card] rounded-2xl border border-[--p-border] overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-[--p-border]">
          <Users className="w-4 h-4 text-[--p-text-3]" />
          <h2 className="text-sm font-semibold text-[--p-text-1]">Vendas por vendedor</h2>
          <span className="text-xs text-[--p-text-3]">(vendas manuais registradas no cadastro de alunos)</span>
        </div>
        {data.vendas_por_vendedor.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-[--p-text-3]">
            Nenhuma venda manual registrada em {MESES[mes - 1]} de {ano}.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[--p-border] bg-[--p-bg-base]">
                <th className="text-left text-xs font-semibold text-[--p-text-3] px-5 py-2.5">Vendedor</th>
                <th className="text-right text-xs font-semibold text-[--p-text-3] px-4 py-2.5">Vendas</th>
                <th className="text-right text-xs font-semibold text-[--p-text-3] px-5 py-2.5">Valor total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[--p-border]">
              {data.vendas_por_vendedor.map((v) => (
                <tr key={v.vendedor_user_id} className="hover:bg-[--p-hover] transition-colors">
                  <td className="px-5 py-3 font-medium text-[--p-text-1]">{v.nome}</td>
                  <td className="px-4 py-3 text-right text-[--p-text-2]">{v.total_vendas}</td>
                  <td className="px-5 py-3 text-right font-semibold text-emerald-500">{fmtCentavos(v.valor_total_centavos)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
