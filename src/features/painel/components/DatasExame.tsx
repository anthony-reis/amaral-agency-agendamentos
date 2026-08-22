'use client'

import { useEffect, useState, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FileCheck, ChevronLeft, ChevronRight, Plus, Trash2, Users, CalendarX2 } from 'lucide-react'
import {
  listarDatasExamePorMes, criarDataExame, removerDataExame,
} from '../actions/datasExame'
import { listarSolicitacoesPendentesParaData } from '../actions/agendamentoExameMassa'
import { AgendamentoExameMassa } from './AgendamentoExameMassa'
import type { Categoria } from '@/features/admin/actions/categorias'
import type { DataExame } from '../types-exame'

interface Props {
  autoescola_id: string
  escola: string
  categorias: Categoria[]
  datasIniciais: DataExame[]
  initialCategoriaCodigo?: string
  initialData?: string
}

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]
const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

export function DatasExame({ autoescola_id, escola, categorias, datasIniciais, initialCategoriaCodigo, initialData }: Props) {
  const now = new Date()
  const [categoriaCodigo, setCategoriaCodigo] = useState(
    initialCategoriaCodigo ?? categorias[0]?.codigo ?? ''
  )
  const [ano, setAno] = useState(now.getFullYear())
  const [mes, setMes] = useState(now.getMonth() + 1)
  const [datas, setDatas] = useState<DataExame[]>(datasIniciais)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const [diaSelecionado, setDiaSelecionado] = useState<string | null>(initialData ?? null)
  const [pendentesCount, setPendentesCount] = useState<number | null>(null)
  const [mutiraoAberto, setMutiraoAberto] = useState(!!initialData && !!initialCategoriaCodigo)

  const categoriaAtual = categorias.find((c) => c.codigo === categoriaCodigo)
  const datasCategoria = datas.filter((d) => d.categoria_codigo === categoriaCodigo)

  function carregarMes(novoAno: number, novoMes: number) {
    startTransition(async () => {
      const data = await listarDatasExamePorMes(autoescola_id, novoAno, novoMes)
      setDatas(data)
    })
  }

  function navegar(delta: number) {
    const d = new Date(ano, mes - 1 + delta, 1)
    const novoAno = d.getFullYear()
    const novoMes = d.getMonth() + 1
    setAno(novoAno)
    setMes(novoMes)
    carregarMes(novoAno, novoMes)
  }

  useEffect(() => {
    if (!diaSelecionado) { setPendentesCount(null); return }
    listarSolicitacoesPendentesParaData(autoescola_id, categoriaCodigo).then((rows) => setPendentesCount(rows.length))
  }, [diaSelecionado, categoriaCodigo, autoescola_id])

  function handleDiaClick(date: string) {
    setDiaSelecionado(date)
    setError('')
  }

  const dataConfigurada = diaSelecionado ? datasCategoria.find((d) => d.date === diaSelecionado) : undefined

  function handleConfigurar() {
    if (!diaSelecionado) return
    setError('')
    startTransition(async () => {
      const result = await criarDataExame(autoescola_id, categoriaCodigo, diaSelecionado, escola)
      if (!result.success) { setError(result.error); return }
      setDatas((prev) => [...prev, result.data])
    })
  }

  function handleRemover() {
    if (!dataConfigurada) return
    if (!confirm('Remover essa data de exame? Solicitações pendentes não são afetadas.')) return
    setError('')
    startTransition(async () => {
      const result = await removerDataExame(dataConfigurada.id, autoescola_id, escola)
      if (!result.success) { setError(result.error); return }
      setDatas((prev) => prev.filter((d) => d.id !== dataConfigurada.id))
    })
  }

  if (categorias.length === 0) {
    return (
      <div className="bg-[--p-bg-card] border border-[--p-border] rounded-2xl py-16 text-center">
        <CalendarX2 className="w-8 h-8 text-[--p-text-3] mx-auto mb-3" />
        <p className="text-sm text-[--p-text-3]">
          Nenhuma categoria configurada para esta autoescola.<br />
          Peça ao suporte para configurar em Admin › Categorias.
        </p>
      </div>
    )
  }

  const firstDow = new Date(ano, mes - 1, 1).getDay()
  const daysInMonth = new Date(ano, mes, 0).getDate()
  const cells: (string | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => `${ano}-${String(mes).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const today = todayStr()

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <FileCheck className="w-5 h-5 text-[--p-accent]" />
        <div>
          <h1 className="text-xl font-bold text-[--p-text-1]">Datas de Exame</h1>
          <p className="text-sm text-[--p-text-3]">Configure quais dias são de exame, por categoria</p>
        </div>
      </div>

      {/* Abas de categoria */}
      <div className="flex flex-wrap gap-2">
        {categorias.map((c) => (
          <button
            key={c.codigo}
            onClick={() => { setCategoriaCodigo(c.codigo); setDiaSelecionado(null) }}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              categoriaCodigo === c.codigo
                ? 'bg-[--p-accent] text-white'
                : 'bg-[--p-bg-card] border border-[--p-border] text-[--p-text-3] hover:text-[--p-text-1]'
            }`}
          >
            {c.nome}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="bg-[--p-bg-card] rounded-2xl border border-[--p-border] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[--p-border]">
          <button onClick={() => navegar(-1)} disabled={isPending} className="p-2 rounded-lg text-[--p-text-3] hover:text-[--p-text-1] hover:bg-[--p-hover] transition-colors disabled:opacity-40">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-base font-semibold text-[--p-text-1]">{MESES[mes - 1]} {ano}</h2>
          <button onClick={() => navegar(1)} disabled={isPending} className="p-2 rounded-lg text-[--p-text-3] hover:text-[--p-text-1] hover:bg-[--p-hover] transition-colors disabled:opacity-40">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-7 border-b border-[--p-border]">
          {DIAS_SEMANA.map((d) => (
            <div key={d} className="text-center text-xs font-semibold text-[--p-text-3] uppercase py-2.5 px-1">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {cells.map((date, i) => {
            if (!date) return <div key={`empty-${i}`} className="border-b border-r border-[--p-border] min-h-[64px]" />
            const dayNum = parseInt(date.split('-')[2])
            const configurada = datasCategoria.some((d) => d.date === date)
            const isToday = date === today
            const isSelected = date === diaSelecionado
            const isPast = date < today
            return (
              <button
                key={date}
                onClick={() => handleDiaClick(date)}
                disabled={isPast}
                className={`border-b border-r border-[--p-border] min-h-[64px] p-2 flex flex-col items-center justify-start transition-colors ${
                  isPast ? 'opacity-30 cursor-not-allowed' : isSelected ? 'bg-[--p-accent]/5' : 'hover:bg-[--p-hover]'
                }`}
              >
                <span className={`flex items-center justify-center w-7 h-7 rounded-full text-sm font-medium ${
                  isToday ? 'bg-[--p-accent] text-white' : 'text-[--p-text-2]'
                }`}>
                  {dayNum}
                </span>
                {configurada && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1" />}
              </button>
            )
          })}
        </div>
      </div>

      {/* Painel do dia selecionado */}
      {diaSelecionado && (
        <div className="bg-[--p-bg-card] border border-[--p-border] rounded-2xl p-5 space-y-3">
          <p className="text-sm font-semibold text-[--p-text-1] capitalize">
            {new Date(diaSelecionado + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
            {' — '}{categoriaAtual?.nome}
          </p>

          {dataConfigurada ? (
            <>
              <div className="flex items-center gap-2 text-sm text-[--p-text-2]">
                <Users className="w-4 h-4 text-[--p-text-3]" />
                {pendentesCount === null ? 'Carregando...' : `${pendentesCount} solicitação(ões) pendente(s) para ${categoriaAtual?.nome}`}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setMutiraoAberto(true)}
                  className="flex-1 py-2.5 rounded-xl bg-[--p-accent] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                  Iniciar mutirão de exame
                </button>
                <button
                  onClick={handleRemover}
                  disabled={isPending}
                  className="p-2.5 rounded-xl border border-[--p-border] text-[--p-text-3] hover:text-red-500 hover:border-red-500/30 transition-colors disabled:opacity-50"
                  title="Remover data"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <button
              onClick={handleConfigurar}
              disabled={isPending}
              className="w-full py-2.5 rounded-xl border border-dashed border-[--p-border] text-[--p-text-2] text-sm font-semibold hover:border-[--p-accent] hover:text-[--p-accent] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" /> Configurar como data de exame ({categoriaAtual?.nome})
            </button>
          )}
        </div>
      )}

      <AnimatePresence>
        {mutiraoAberto && diaSelecionado && categoriaAtual && (
          <AgendamentoExameMassa
            autoescola_id={autoescola_id}
            escola={escola}
            categoriaCodigo={categoriaCodigo}
            categoriaNome={categoriaAtual.nome}
            examDate={diaSelecionado}
            onClose={() => setMutiraoAberto(false)}
            onConcluido={() => setPendentesCount(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
