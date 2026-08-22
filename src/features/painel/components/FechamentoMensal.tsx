'use client'

import { useState, useTransition } from 'react'
import { FileSpreadsheet, ChevronDown, ChevronRight, Download, Gauge, Route, Car, DollarSign } from 'lucide-react'
import type { FechamentoMensalData } from '../actions/fechamento'

interface Props {
  initialData: FechamentoMensalData
  escola: string
  autoescola_id: string
}

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

function fmtMoeda(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function FechamentoMensal({ initialData, escola, autoescola_id }: Props) {
  const now = new Date()
  const [mes, setMes] = useState(initialData.mes)
  const [ano, setAno] = useState(initialData.ano)
  const [data, setData] = useState<FechamentoMensalData>(initialData)
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()

  function toggleExpandido(name: string) {
    setExpandidos((prev) => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }

  async function aplicarFiltro(novoMes: number, novoAno: number) {
    startTransition(async () => {
      const params = new URLSearchParams({
        mes: String(novoMes),
        ano: String(novoAno),
        autoescola_id,
      })
      const res = await fetch(`/${escola}/painel/fechamento/api?${params}`)
      if (res.ok) {
        const json = await res.json()
        setData(json)
        setExpandidos(new Set())
      }
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

  function exportarCSV() {
    const header = ['Data', 'Horário', 'Aluno', 'Instrutor', 'Categoria', 'Tipo', 'KM Inicial', 'KM Final', 'KM Rodado', 'Valor Hora/Aula', 'Valor Banca', 'Valor a Pagar']
    const rows: string[][] = []
    for (const inst of data.instrutores) {
      for (const aula of inst.aulas) {
        rows.push([
          aula.date.split('-').reverse().join('/'),
          aula.time_slot,
          aula.student_name,
          inst.instructor_name,
          inst.categoria ?? '',
          aula.tipo === 'banca' ? 'Banca' : 'Aula',
          aula.km_inicial != null ? String(aula.km_inicial) : '',
          aula.km_final != null ? String(aula.km_final) : '',
          aula.km_rodado != null ? String(aula.km_rodado) : '',
          inst.valor_hora_aula != null ? fmtMoeda(inst.valor_hora_aula) : '',
          inst.valor_banca != null ? fmtMoeda(inst.valor_banca) : '',
          inst.valor_total_pagar != null ? fmtMoeda(inst.valor_total_pagar) : '',
        ])
      }
    }
    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`
    const csv = [header.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `fechamento-${MESES[mes - 1].toLowerCase()}-${ano}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const anos = Array.from({ length: 3 }, (_, i) => now.getFullYear() - i)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileSpreadsheet className="w-6 h-6 text-violet-400" />
          <div>
            <h1 className="text-xl font-bold text-[--p-text-1]">Fechamento Mensal</h1>
            <p className="text-sm text-[--p-text-3]">Resumo de aulas e KM rodado por instrutor</p>
          </div>
        </div>
        <button
          onClick={exportarCSV}
          disabled={data.total_aulas === 0}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Download className="w-4 h-4" />
          Exportar CSV
        </button>
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
              className="px-3 py-2 rounded-xl bg-[--p-bg-input] border border-[--p-border] text-sm text-[--p-text-1] focus:outline-none focus:ring-1 focus:ring-violet-500/40 disabled:opacity-50"
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
              className="px-3 py-2 rounded-xl bg-[--p-bg-input] border border-[--p-border] text-sm text-[--p-text-1] focus:outline-none focus:ring-1 focus:ring-violet-500/40 disabled:opacity-50"
            >
              {anos.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          {isPending && (
            <div className="flex items-center gap-2 text-xs text-[--p-text-3] mt-4">
              <div className="w-3.5 h-3.5 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" />
              Carregando...
            </div>
          )}
        </div>
      </div>

      {/* Cards resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-violet-600 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-white/70 mb-1">Aulas Concluídas</p>
            <p className="text-3xl font-bold text-white/90">{data.total_aulas}</p>
          </div>
          <Car className="w-8 h-8 text-white/60" />
        </div>
        <div className="bg-amber-600 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-white/70 mb-1">Bancas</p>
            <p className="text-3xl font-bold text-white/90">{data.total_bancas}</p>
          </div>
          <FileSpreadsheet className="w-8 h-8 text-white/60" />
        </div>
        <div className="bg-violet-500 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-white/70 mb-1">KM Total</p>
            <p className="text-3xl font-bold text-white/90">{data.km_total.toLocaleString('pt-BR')}</p>
          </div>
          <Route className="w-8 h-8 text-white/60" />
        </div>
        <div className="bg-emerald-600 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-white/70 mb-1">Total a Pagar</p>
            <p className="text-2xl font-bold text-white/90">{fmtMoeda(data.valor_total_pagar_geral)}</p>
          </div>
          <DollarSign className="w-8 h-8 text-white/60" />
        </div>
        <div className="bg-[--p-bg-card] border border-[--p-border] rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-[--p-text-3] mb-1">{MESES[mes - 1]} / {ano}</p>
            <p className="text-lg font-bold text-[--p-text-1]">
              {data.instrutores.length} instrutor{data.instrutores.length !== 1 ? 'es' : ''}
            </p>
          </div>
          <Gauge className="w-8 h-8 text-violet-400" />
        </div>
      </div>

      {/* Lista por instrutor */}
      {data.total_aulas === 0 ? (
        <div className="bg-[--p-bg-card] rounded-2xl border border-[--p-border] px-6 py-16 text-center text-[--p-text-3] text-sm">
          Nenhuma aula concluída em {MESES[mes - 1]} de {ano}.
        </div>
      ) : (
        <div className="space-y-3">
          {data.instrutores.map((inst) => {
            const expanded = expandidos.has(inst.instructor_name)
            return (
              <div key={inst.instructor_name} className="bg-[--p-bg-card] rounded-2xl border border-[--p-border] overflow-hidden">
                {/* Linha do instrutor */}
                <button
                  onClick={() => toggleExpandido(inst.instructor_name)}
                  className="w-full flex items-center gap-4 px-5 py-4 hover:bg-[--p-hover] transition-colors text-left"
                >
                  {expanded ? (
                    <ChevronDown className="w-4 h-4 text-[--p-text-3] shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-[--p-text-3] shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[--p-text-1]">{inst.instructor_name}</p>
                    <p className="text-xs text-[--p-text-3]">{inst.categoria ?? '—'}</p>
                  </div>
                  <div className="flex items-center gap-6 text-sm shrink-0">
                    <div className="text-right">
                      <p className="text-xs text-[--p-text-3]">Aulas</p>
                      <p className="font-bold text-[--p-text-1]">{inst.total_aulas}</p>
                    </div>
                    {inst.total_bancas > 0 && (
                      <div className="text-right">
                        <p className="text-xs text-[--p-text-3]">Bancas</p>
                        <p className="font-bold text-amber-500">{inst.total_bancas}</p>
                      </div>
                    )}
                    <div className="text-right">
                      <p className="text-xs text-[--p-text-3]">KM Total</p>
                      <p className="font-bold text-violet-400">{inst.km_total.toLocaleString('pt-BR')} km</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-[--p-text-3]">Média/Aula</p>
                      <p className="font-semibold text-[--p-text-2]">{inst.km_medio} km</p>
                    </div>
                    <div className="text-right min-w-[110px]">
                      <p className="text-xs text-[--p-text-3]">A Pagar</p>
                      {inst.valor_total_pagar != null ? (
                        <p className="font-bold text-emerald-400">{fmtMoeda(inst.valor_total_pagar)}</p>
                      ) : (
                        <p className="text-xs text-[--p-text-3] italic">Hora/aula não definida</p>
                      )}
                    </div>
                  </div>
                </button>

                {/* Detalhe das aulas */}
                {expanded && (
                  <div className="border-t border-[--p-border]">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[--p-border] bg-[--p-bg-base]">
                          <th className="text-left text-xs font-semibold text-[--p-text-3] px-5 py-2.5">Data</th>
                          <th className="text-left text-xs font-semibold text-[--p-text-3] px-4 py-2.5">Horário</th>
                          <th className="text-left text-xs font-semibold text-[--p-text-3] px-4 py-2.5">Aluno</th>
                          <th className="text-left text-xs font-semibold text-[--p-text-3] px-4 py-2.5">Tipo</th>
                          <th className="text-right text-xs font-semibold text-[--p-text-3] px-4 py-2.5">KM Ini.</th>
                          <th className="text-right text-xs font-semibold text-[--p-text-3] px-4 py-2.5">KM Fin.</th>
                          <th className="text-right text-xs font-semibold text-[--p-text-3] px-4 py-2.5">Rodado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[--p-border]">
                        {inst.aulas.map((aula) => (
                          <tr key={aula.id} className="hover:bg-[--p-hover] transition-colors">
                            <td className="px-5 py-2.5 text-[--p-text-2]">{aula.date.split('-').reverse().join('/')}</td>
                            <td className="px-4 py-2.5 text-[--p-text-3]">{aula.time_slot}</td>
                            <td className="px-4 py-2.5 font-medium text-[--p-text-1] truncate max-w-[160px]">{aula.student_name}</td>
                            <td className="px-4 py-2.5">
                              {aula.tipo === 'banca' ? (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">Banca</span>
                              ) : (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400">Aula</span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-right text-[--p-text-3]">
                              {aula.km_inicial != null ? aula.km_inicial.toLocaleString('pt-BR') : '—'}
                            </td>
                            <td className="px-4 py-2.5 text-right text-[--p-text-3]">
                              {aula.km_final != null ? aula.km_final.toLocaleString('pt-BR') : '—'}
                            </td>
                            <td className="px-4 py-2.5 text-right font-semibold text-violet-400">
                              {aula.km_rodado != null ? `${aula.km_rodado} km` : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
