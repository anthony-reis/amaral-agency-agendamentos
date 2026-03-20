'use client'

import { useState, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, ChevronRight, ChevronDown, ChevronUp,
  CalendarPlus, User, Car, Bike, Loader2, Check, X,
  Calendar, Clock, Users,
} from 'lucide-react'
import type { AlunoComCreditos } from '@/features/painel/types'
import type { Instrutor } from '@/features/painel/types'
import {
  buscarDisponibilidadeMassa,
  criarAgendamentosMassa,
  type DiaDisponivel,
  type AgendamentoMassaItem,
} from '@/features/painel/actions/agendamentoMassa'

interface Props {
  alunos: AlunoComCreditos[]
  instrutores: Instrutor[]
  autoescola_id: string
}

type Step = 1 | 2 | 3 | 4

interface SlotSelecionado {
  date: string
  label: string
  instructorName: string
  timeSlot: string
}

export function AgendamentoMassa({ alunos, instrutores, autoescola_id }: Props) {
  const [step, setStep] = useState<Step>(1)
  const [isPending, startTransition] = useTransition()

  // Step 1
  const [search, setSearch] = useState('')
  const [alunoSelecionado, setAlunoSelecionado] = useState<AlunoComCreditos | null>(null)

  // Step 2
  const [category, setCategory] = useState<'CARRO' | 'MOTO'>('CARRO')
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0])
  const [instructorFilter, setInstructorFilter] = useState('')

  // Step 3
  const [dias, setDias] = useState<DiaDisponivel[]>([])
  const [expandedDay, setExpandedDay] = useState<string | null>(null)
  const [selecionados, setSelecionados] = useState<SlotSelecionado[]>([])

  // Step 4
  const [resultado, setResultado] = useState<{ success: boolean; created: number; error?: string } | null>(null)

  const todayStr = new Date().toISOString().split('T')[0]

  // Filtrar alunos
  const alunosFiltrados = alunos.filter((a) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return a.name.toLowerCase().includes(q) || a.document_id.toLowerCase().includes(q)
  })

  // Créditos do aluno selecionado por categoria
  const creditosCarro = alunoSelecionado?.creditos?.aulas_cat_b ?? 0
  const creditosMoto = alunoSelecionado?.creditos?.aulas_cat_a ?? 0
  const creditosCategoria = category === 'CARRO' ? creditosCarro : creditosMoto

  const slotsCount = selecionados.length

  function handleBuscar() {
    if (!alunoSelecionado) return
    setSelecionados([])
    setExpandedDay(null)
    startTransition(async () => {
      const result = await buscarDisponibilidadeMassa(
        autoescola_id,
        startDate,
        category,
        Math.min(creditosCategoria * 2, 30), // busca até 2x os créditos para dar opções
        instructorFilter || undefined
      )
      setDias(result)
      setStep(3)
      if (result.length > 0) setExpandedDay(result[0].date)
    })
  }

  function toggleSlot(dia: DiaDisponivel, instructorName: string, timeSlot: string) {
    const key = dia.date
    const jaTemDia = selecionados.find((s) => s.date === key)

    // Se já está selecionado o mesmo slot, desselecionar
    if (jaTemDia?.instructorName === instructorName && jaTemDia?.timeSlot === timeSlot) {
      setSelecionados((prev) => prev.filter((s) => s.date !== key))
      return
    }

    // Trocar ou adicionar
    if (jaTemDia) {
      // Substituir slot do mesmo dia
      setSelecionados((prev) =>
        prev.map((s) => s.date === key ? { ...s, instructorName, timeSlot } : s)
      )
    } else {
      // Não exceder créditos
      if (slotsCount >= creditosCategoria) return
      setSelecionados((prev) => [
        ...prev,
        { date: key, label: dia.label, instructorName, timeSlot },
      ])
    }
  }

  function handleConfirmar() {
    if (!alunoSelecionado || selecionados.length === 0) return
    const agendamentos: AgendamentoMassaItem[] = selecionados.map((s) => ({
      date: s.date,
      timeSlot: s.timeSlot,
      instructorName: s.instructorName,
    }))

    startTransition(async () => {
      const res = await criarAgendamentosMassa({
        autoescola_id,
        studentId: alunoSelecionado.id,
        studentName: alunoSelecionado.name,
        studentDocument: alunoSelecionado.document_id,
        category,
        agendamentos,
      })
      setResultado(res)
      setStep(4)
    })
  }

  function resetFlow() {
    setStep(1)
    setSearch('')
    setAlunoSelecionado(null)
    setCategory('CARRO')
    setStartDate(todayStr)
    setInstructorFilter('')
    setDias([])
    setSelecionados([])
    setResultado(null)
    setExpandedDay(null)
  }

  const stepLabels = ['Aluno', 'Configurar', 'Selecionar', 'Confirmar']

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#0ea5e9]/10 flex items-center justify-center shrink-0">
          <CalendarPlus className="w-5 h-5 text-[#0ea5e9]" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-[--p-text-1]">Agendamento em Massa</h1>
          <p className="text-sm text-[--p-text-3]">Agende múltiplas aulas de uma só vez</p>
        </div>
      </div>

      {/* Stepper */}
      {step < 4 && (
        <div className="flex items-center gap-2">
          {stepLabels.map((label, idx) => {
            const n = (idx + 1) as Step
            const active = step === n
            const done = step > n
            return (
              <div key={n} className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  active ? 'bg-[#0ea5e9] text-white' :
                  done ? 'bg-[#0ea5e9]/10 text-[#0ea5e9]' :
                  'bg-[--p-bg-input] text-[--p-text-3]'
                }`}>
                  {done ? <Check className="w-3 h-3" /> : <span>{n}</span>}
                  <span className="hidden sm:inline">{label}</span>
                </div>
                {idx < stepLabels.length - 1 && (
                  <div className={`h-px w-4 sm:w-8 ${done ? 'bg-[#0ea5e9]/40' : 'bg-[--p-border]'}`} />
                )}
              </div>
            )
          })}
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* ── STEP 1: Selecionar aluno ── */}
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-[--p-bg-card] rounded-2xl border border-[--p-border] overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-[--p-border]">
              <h2 className="font-semibold text-[--p-text-1] text-sm">Selecionar aluno</h2>
            </div>

            {/* Search */}
            <div className="px-5 py-4 border-b border-[--p-border]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[--p-text-3]" />
                <input
                  type="text"
                  placeholder="Buscar por nome ou CPF/CNH..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-[--p-bg-input] border border-[--p-border] text-sm text-[--p-text-1] placeholder:text-[--p-text-3] focus:outline-none focus:border-[#0ea5e9]/50"
                />
              </div>
            </div>

            {/* Lista */}
            <ul className="divide-y divide-[--p-border] max-h-80 overflow-y-auto">
              {alunosFiltrados.length === 0 ? (
                <li className="px-5 py-8 text-center text-sm text-[--p-text-3]">Nenhum aluno encontrado.</li>
              ) : (
                alunosFiltrados.map((a) => {
                  const selected = alunoSelecionado?.id === a.id
                  const catB = a.creditos?.aulas_cat_b ?? 0
                  const catA = a.creditos?.aulas_cat_a ?? 0
                  return (
                    <li
                      key={a.id}
                      onClick={() => setAlunoSelecionado(a)}
                      className={`flex items-center gap-3 px-5 py-3 cursor-pointer transition-colors ${
                        selected ? 'bg-[#0ea5e9]/5' : 'hover:bg-[--p-hover]'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-[#0ea5e9]/10 flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-[#0ea5e9]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[--p-text-1] truncate">{a.name}</p>
                        <p className="text-xs text-[--p-text-3]">{a.document_id}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="flex items-center gap-1 text-xs text-[--p-text-2]">
                          <Car className="w-3 h-3" />{catB}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-[--p-text-2]">
                          <Bike className="w-3 h-3" />{catA}
                        </span>
                      </div>
                      {selected && <Check className="w-4 h-4 text-[#0ea5e9] shrink-0" />}
                    </li>
                  )
                })
              )}
            </ul>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-[--p-border] flex justify-end">
              <button
                disabled={!alunoSelecionado}
                onClick={() => setStep(2)}
                className="flex items-center gap-2 px-4 py-2 bg-[#0ea5e9] text-white rounded-xl text-sm font-medium hover:bg-[#0284c7] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Próximo <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* ── STEP 2: Configurar busca ── */}
        {step === 2 && alunoSelecionado && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {/* Aluno selecionado */}
            <div className="bg-[--p-bg-card] rounded-2xl border border-[--p-border] px-5 py-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#0ea5e9]/10 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-[#0ea5e9]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[--p-text-1]">{alunoSelecionado.name}</p>
                <p className="text-xs text-[--p-text-3]">{alunoSelecionado.document_id}</p>
              </div>
              <button
                onClick={() => { setAlunoSelecionado(null); setStep(1) }}
                className="p-1.5 text-[--p-text-3] hover:text-[--p-text-1] hover:bg-[--p-hover] rounded-lg"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Configurações */}
            <div className="bg-[--p-bg-card] rounded-2xl border border-[--p-border] overflow-hidden">
              <div className="px-5 py-4 border-b border-[--p-border]">
                <h2 className="font-semibold text-[--p-text-1] text-sm">Configurar busca</h2>
              </div>

              <div className="px-5 py-5 space-y-5">
                {/* Categoria */}
                <div>
                  <label className="block text-xs font-semibold text-[--p-text-2] mb-2 uppercase tracking-wide">Categoria</label>
                  <div className="flex gap-3">
                    {(['CARRO', 'MOTO'] as const).map((cat) => {
                      const credits = cat === 'CARRO' ? creditosCarro : creditosMoto
                      const active = category === cat
                      return (
                        <button
                          key={cat}
                          onClick={() => setCategory(cat)}
                          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                            active
                              ? 'border-[#0ea5e9] bg-[#0ea5e9]/10 text-[#0ea5e9]'
                              : 'border-[--p-border] text-[--p-text-2] hover:border-[#0ea5e9]/40'
                          }`}
                        >
                          {cat === 'CARRO' ? <Car className="w-4 h-4" /> : <Bike className="w-4 h-4" />}
                          {cat}
                          <span className={`text-xs px-1.5 py-0.5 rounded-md font-bold ${
                            credits > 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-400'
                          }`}>
                            {credits} crédito{credits !== 1 ? 's' : ''}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                  {creditosCategoria === 0 && (
                    <p className="mt-2 text-xs text-red-400">Aluno sem créditos para esta categoria.</p>
                  )}
                </div>

                {/* Data inicial */}
                <div>
                  <label className="block text-xs font-semibold text-[--p-text-2] mb-2 uppercase tracking-wide">Data inicial</label>
                  <input
                    type="date"
                    min={todayStr}
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-[--p-bg-input] border border-[--p-border] text-sm text-[--p-text-1] focus:outline-none focus:border-[#0ea5e9]/50"
                  />
                </div>

                {/* Filtro por instrutor (opcional) */}
                <div>
                  <label className="block text-xs font-semibold text-[--p-text-2] mb-2 uppercase tracking-wide">
                    Filtrar por instrutor <span className="normal-case font-normal text-[--p-text-3]">(opcional)</span>
                  </label>
                  <select
                    value={instructorFilter}
                    onChange={(e) => setInstructorFilter(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-[--p-bg-input] border border-[--p-border] text-sm text-[--p-text-1] focus:outline-none focus:border-[#0ea5e9]/50 min-w-48"
                  >
                    <option value="">Todos os instrutores</option>
                    {instrutores
                      .filter((i) => i.category === category || i.category === 'AMBOS')
                      .map((i) => (
                        <option key={i.id} value={i.name}>{i.name}</option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="px-5 py-4 border-t border-[--p-border] flex items-center justify-between">
                <button
                  onClick={() => setStep(1)}
                  className="text-sm text-[--p-text-3] hover:text-[--p-text-1] transition-colors"
                >
                  ← Voltar
                </button>
                <button
                  disabled={isPending || creditosCategoria === 0}
                  onClick={handleBuscar}
                  className="flex items-center gap-2 px-4 py-2 bg-[#0ea5e9] text-white rounded-xl text-sm font-medium hover:bg-[#0284c7] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {isPending ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Buscando...</>
                  ) : (
                    <><Search className="w-4 h-4" /> Buscar disponibilidade</>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── STEP 3: Selecionar slots ── */}
        {step === 3 && alunoSelecionado && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {/* Contador de créditos */}
            <div className="bg-[--p-bg-card] rounded-2xl border border-[--p-border] px-5 py-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-[--p-text-1]">{alunoSelecionado.name}</p>
                <p className="text-xs text-[--p-text-3]">
                  {category} · {slotsCount} de {creditosCategoria} crédito{creditosCategoria !== 1 ? 's' : ''} selecionado{slotsCount !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  {Array.from({ length: creditosCategoria }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        i < slotsCount ? 'bg-[#0ea5e9]' : 'bg-[--p-border]'
                      }`}
                    />
                  ))}
                </div>
                <button
                  onClick={() => setStep(2)}
                  className="text-xs text-[--p-text-3] hover:text-[--p-text-1] border border-[--p-border] rounded-lg px-2 py-1 transition-colors"
                >
                  Refazer busca
                </button>
              </div>
            </div>

            {/* Lista de dias */}
            {dias.length === 0 ? (
              <div className="bg-[--p-bg-card] rounded-2xl border border-[--p-border] py-12 text-center text-sm text-[--p-text-3]">
                Nenhuma disponibilidade encontrada nos próximos 90 dias.
              </div>
            ) : (
              <div className="space-y-2">
                {dias.map((dia) => {
                  const isOpen = expandedDay === dia.date
                  const slotDoDia = selecionados.find((s) => s.date === dia.date)

                  return (
                    <div
                      key={dia.date}
                      className="bg-[--p-bg-card] rounded-2xl border border-[--p-border] overflow-hidden"
                    >
                      <button
                        className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-[--p-hover] transition-colors text-left"
                        onClick={() => setExpandedDay(isOpen ? null : dia.date)}
                      >
                        <Calendar className="w-4 h-4 text-[#0ea5e9] shrink-0" />
                        <span className="flex-1 text-sm font-medium text-[--p-text-1]">{dia.label}</span>

                        {slotDoDia ? (
                          <span className="flex items-center gap-1.5 text-xs bg-[#0ea5e9]/10 text-[#0ea5e9] px-2.5 py-1 rounded-lg font-medium">
                            <Check className="w-3 h-3" />
                            {slotDoDia.timeSlot} · {slotDoDia.instructorName}
                          </span>
                        ) : (
                          <span className="text-xs text-[--p-text-3]">
                            {dia.instrutores.reduce((acc, i) => acc + i.horarios.length, 0)} horários
                          </span>
                        )}

                        {isOpen ? <ChevronUp className="w-4 h-4 text-[--p-text-3]" /> : <ChevronDown className="w-4 h-4 text-[--p-text-3]" />}
                      </button>

                      <AnimatePresence>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: 'auto' }}
                            exit={{ height: 0 }}
                            className="overflow-hidden border-t border-[--p-border]"
                          >
                            <div className="px-5 py-4 space-y-4">
                              {dia.instrutores.map((inst) => (
                                <div key={inst.nome}>
                                  <div className="flex items-center gap-2 mb-2">
                                    <Users className="w-3.5 h-3.5 text-[--p-text-3]" />
                                    <span className="text-xs font-semibold text-[--p-text-2] uppercase tracking-wide">{inst.nome}</span>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {inst.horarios.map((h) => {
                                      const isSelected =
                                        slotDoDia?.instructorName === inst.nome &&
                                        slotDoDia?.timeSlot === h
                                      const maxReached = slotsCount >= creditosCategoria && !slotDoDia

                                      return (
                                        <button
                                          key={h}
                                          disabled={maxReached}
                                          onClick={() => toggleSlot(dia, inst.nome, h)}
                                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                                            isSelected
                                              ? 'bg-[#0ea5e9] border-[#0ea5e9] text-white'
                                              : maxReached
                                              ? 'border-[--p-border] text-[--p-text-3] opacity-40 cursor-not-allowed'
                                              : 'border-[--p-border] text-[--p-text-2] hover:border-[#0ea5e9]/50 hover:text-[#0ea5e9]'
                                          }`}
                                        >
                                          <Clock className="w-3 h-3" />
                                          {h}
                                        </button>
                                      )
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )
                })}
              </div>
            )}

            {slotsCount > 0 && (
              <div className="flex justify-end">
                <button
                  onClick={() => setStep(4)}
                  className="flex items-center gap-2 px-4 py-2 bg-[#0ea5e9] text-white rounded-xl text-sm font-medium hover:bg-[#0284c7] transition-colors"
                >
                  Ver resumo ({slotsCount} aula{slotsCount !== 1 ? 's' : ''}) <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* ── STEP 4: Confirmação / Resultado ── */}
        {step === 4 && alunoSelecionado && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {resultado ? (
              /* Resultado final */
              <div className="bg-[--p-bg-card] rounded-2xl border border-[--p-border] p-8 text-center">
                {resultado.success ? (
                  <>
                    <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                      <Check className="w-8 h-8 text-emerald-500" />
                    </div>
                    <h3 className="text-base font-bold text-[--p-text-1] mb-1">
                      {resultado.created} aula{resultado.created !== 1 ? 's' : ''} agendada{resultado.created !== 1 ? 's' : ''}!
                    </h3>
                    <p className="text-sm text-[--p-text-3] mb-6">
                      Os agendamentos foram criados e os créditos deduzidos.
                    </p>
                    <button
                      onClick={resetFlow}
                      className="px-5 py-2.5 bg-[#0ea5e9] text-white rounded-xl text-sm font-medium hover:bg-[#0284c7] transition-colors"
                    >
                      Novo agendamento em massa
                    </button>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                      <X className="w-8 h-8 text-red-400" />
                    </div>
                    <h3 className="text-base font-bold text-[--p-text-1] mb-1">Erro ao criar agendamentos</h3>
                    <p className="text-sm text-red-400 mb-6">{resultado.error}</p>
                    <button
                      onClick={() => { setResultado(null); setStep(3) }}
                      className="px-5 py-2.5 border border-[--p-border] text-[--p-text-2] rounded-xl text-sm font-medium hover:bg-[--p-hover] transition-colors"
                    >
                      Voltar e tentar novamente
                    </button>
                  </>
                )}
              </div>
            ) : (
              /* Resumo antes de confirmar */
              <div className="bg-[--p-bg-card] rounded-2xl border border-[--p-border] overflow-hidden">
                <div className="px-5 py-4 border-b border-[--p-border]">
                  <h2 className="font-semibold text-[--p-text-1] text-sm">Resumo do agendamento</h2>
                  <p className="text-xs text-[--p-text-3] mt-0.5">
                    {alunoSelecionado.name} · {category} · {slotsCount} aula{slotsCount !== 1 ? 's' : ''}
                  </p>
                </div>

                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[--p-border]">
                      <th className="text-left px-5 py-2.5 text-xs font-semibold text-[--p-text-3] uppercase tracking-wide">Data</th>
                      <th className="text-left px-5 py-2.5 text-xs font-semibold text-[--p-text-3] uppercase tracking-wide">Instrutor</th>
                      <th className="text-left px-5 py-2.5 text-xs font-semibold text-[--p-text-3] uppercase tracking-wide">Horário</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[--p-border]">
                    {selecionados.map((s) => (
                      <tr key={s.date} className="hover:bg-[--p-hover]">
                        <td className="px-5 py-3 text-[--p-text-1]">{s.label}</td>
                        <td className="px-5 py-3 text-[--p-text-2]">{s.instructorName}</td>
                        <td className="px-5 py-3 text-[--p-text-2]">{s.timeSlot}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="px-5 py-4 border-t border-[--p-border] bg-[--p-bg-input]/50 flex items-center justify-between">
                  <div className="text-sm text-[--p-text-3]">
                    <span className="font-semibold text-[--p-text-1]">{slotsCount}</span> crédito{slotsCount !== 1 ? 's' : ''} serão consumidos
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setStep(3)}
                      className="text-sm text-[--p-text-3] hover:text-[--p-text-1] transition-colors"
                    >
                      ← Editar
                    </button>
                    <button
                      disabled={isPending}
                      onClick={handleConfirmar}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-medium hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      {isPending ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Criando...</>
                      ) : (
                        <><Check className="w-4 h-4" /> Confirmar agendamentos</>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
