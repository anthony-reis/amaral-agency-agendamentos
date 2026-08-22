'use client'

import { useState, useTransition, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Calendar, Phone, MessageCircle, User, Plus, X, AlertTriangle } from 'lucide-react'
import {
  getCalendarioData,
  getInstrutoresDoDia,
  getSlotsDoDia,
  atualizarStatusAgendamento,
  atualizarTipoAgendamento,
  listarAlunosParaAgendar,
  agendarAulaCalendario,
  type DiaCalendario,
  type InstrutorDia,
  type SlotDia,
  type AlunoParaAgendar,
} from '../actions/calendario'
import { cancelarAgendamentoComOpcoes } from '../actions/agendamentos'
import { ModalCancelamentoAula } from '@/features/shared/components/ModalCancelamentoAula'

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

const STATUS_OPTIONS = [
  { value: 'scheduled', label: 'Agendado' },
  { value: 'confirmed', label: 'Confirmado' },
  { value: 'completed', label: 'Concluído' },
  { value: 'absent', label: 'Falta' },
  { value: 'cancelled', label: 'Cancelado' },
]

const TIPO_OPTIONS = [
  { value: 'aula', label: 'Aula' },
  { value: 'banca', label: 'Banca' },
]

const TIPO_CLS: Record<string, string> = {
  aula: 'bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400',
  banca: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
}

const STATUS_DOT: Record<string, string> = {
  scheduled: 'bg-sky-400',
  confirmed: 'bg-purple-400',
  completed: 'bg-emerald-400',
  cancelled: 'bg-red-400',
  absent: 'bg-orange-400',
}

const STATUS_TEXT: Record<string, string> = {
  scheduled: 'text-sky-600 dark:text-sky-400',
  confirmed: 'text-purple-600 dark:text-purple-400',
  completed: 'text-emerald-600 dark:text-emerald-400',
  cancelled: 'text-red-600 dark:text-red-400',
  absent: 'text-orange-600 dark:text-orange-400',
}

const CAT_CLS: Record<string, string> = {
  CARRO: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
  MOTO: 'bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400',
  AMBOS: 'bg-teal-100 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400',
}

function getDayColor(dia: DiaCalendario, capacidade: number) {
  if (dia.bloqueado) return 'bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20'
  const pct = capacidade > 0 ? (dia.total / capacidade) * 100 : 0
  if (pct >= 70) return 'bg-orange-100 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-500/20'
  if (pct >= 30) return 'bg-yellow-100 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-500/20'
  if (dia.total > 0) return 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
  return 'bg-emerald-50 dark:bg-emerald-500/5 text-emerald-500 dark:text-emerald-600 border-emerald-100 dark:border-emerald-500/10'
}

function formatDateLabel(date: string) {
  const d = new Date(date + 'T12:00:00')
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
}

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

function getCreditoParaCategoria(
  creditos: AlunoParaAgendar['creditos'],
  category: string
): number {
  if (!creditos) return 0
  if (category === 'CARRO') return creditos.aulas_cat_b
  if (category === 'MOTO') return creditos.aulas_cat_a
  // AMBOS: mínimo entre A e B
  return Math.min(creditos.aulas_cat_a, creditos.aulas_cat_b)
}

// ── Free slot booking form ────────────────────────────────────────────────────

function AgendarForm({
  horario,
  instructorName,
  instructorCategory,
  autoescola_id,
  date,
  alunos,
  onSuccess,
  onCancel,
}: {
  horario: string
  instructorName: string
  instructorCategory: string
  autoescola_id: string
  date: string
  alunos: AlunoParaAgendar[]
  onSuccess: (slot: SlotDia) => void
  onCancel: () => void
}) {
  const [search, setSearch] = useState('')
  const [selectedAluno, setSelectedAluno] = useState<AlunoParaAgendar | null>(null)
  const [tipo, setTipo] = useState<'aula' | 'banca'>('aula')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const filteredAlunos = useMemo(() => {
    if (!search) return alunos
    const q = search.toLowerCase()
    return alunos.filter((a) =>
      a.name.toLowerCase().includes(q) || a.document_id.includes(q)
    )
  }, [alunos, search])

  const credito = selectedAluno ? getCreditoParaCategoria(selectedAluno.creditos, instructorCategory) : null
  const semCredito = credito !== null && credito <= 0

  async function handleAgendar() {
    if (!selectedAluno) return
    setSaving(true)
    setError(null)
    const result = await agendarAulaCalendario({
      autoescola_id,
      date,
      time_slot: horario,
      instructor_name: instructorName,
      instructor_category: instructorCategory,
      student_id: selectedAluno.id,
      student_name: selectedAluno.name,
      student_document: selectedAluno.document_id,
      tipo,
    })
    if (result.error) {
      setError(result.error)
      setSaving(false)
      return
    }
    onSuccess({
      horario,
      bloqueado: false,
      agendamento: {
        id: crypto.randomUUID(),
        student_name: selectedAluno.name,
        student_phone: selectedAluno.phone,
        student_email: null,
        cpf_cnh: selectedAluno.document_id,
        status: 'scheduled',
        tipo,
        instructorCategory,
        notes: null,
      },
    })
  }

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="overflow-hidden"
    >
      <div className="px-4 pb-3 pt-1 bg-[--p-bg-input]/50 border-b border-[--p-border] flex flex-col gap-2.5">
        {/* Search aluno */}
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar aluno por nome ou CPF…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setSelectedAluno(null) }}
            className="w-full px-3 py-1.5 text-sm bg-[--p-bg-card] border border-[--p-border] rounded-lg text-[--p-text-1] placeholder:text-[--p-text-3] focus:outline-none focus:ring-1 focus:ring-[#0ea5e9]"
          />
        </div>

        {/* Aluno list */}
        {search && !selectedAluno && (
          <div className="max-h-40 overflow-y-auto rounded-lg border border-[--p-border] bg-[--p-bg-card] divide-y divide-[--p-border]">
            {filteredAlunos.length === 0 ? (
              <p className="px-3 py-2 text-xs text-[--p-text-3]">Nenhum aluno encontrado.</p>
            ) : (
              filteredAlunos.slice(0, 10).map((a) => {
                const cred = getCreditoParaCategoria(a.creditos, instructorCategory)
                return (
                  <button
                    key={a.id}
                    onClick={() => { setSelectedAluno(a); setSearch(a.name) }}
                    className="w-full flex items-center justify-between px-3 py-2 hover:bg-[--p-hover] text-left"
                  >
                    <div>
                      <p className="text-sm text-[--p-text-1]">{a.name}</p>
                      <p className="text-xs text-[--p-text-3]">{a.document_id}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      cred > 0
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                        : 'bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400'
                    }`}>
                      {cred} crédito{cred !== 1 ? 's' : ''}
                    </span>
                  </button>
                )
              })
            )}
          </div>
        )}

        {/* Selected aluno summary */}
        {selectedAluno && (
          <div className={`flex items-center justify-between px-3 py-2 rounded-lg border ${
            semCredito
              ? 'border-red-300 bg-red-50 dark:border-red-500/30 dark:bg-red-500/5'
              : 'border-emerald-300 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/5'
          }`}>
            <div>
              <p className="text-sm font-medium text-[--p-text-1]">{selectedAluno.name}</p>
              <p className="text-xs text-[--p-text-3]">
                Créditos ({instructorCategory === 'CARRO' ? 'Carro' : instructorCategory === 'MOTO' ? 'Moto' : 'A/B'}):
                <span className={`font-semibold ml-1 ${semCredito ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {credito}
                </span>
              </p>
            </div>
            <button onClick={() => { setSelectedAluno(null); setSearch('') }} className="p-1 text-[--p-text-3] hover:text-[--p-text-1]">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {semCredito && selectedAluno && (
          <div className="flex items-center gap-1.5 text-xs text-orange-600 dark:text-orange-400">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            Sem créditos. Adicione em <strong className="mx-0.5">Alunos</strong> antes de agendar.
          </div>
        )}

        {error && <p className="text-xs text-red-500">{error}</p>}

        {selectedAluno && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[--p-text-3]">Tipo:</span>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as 'aula' | 'banca')}
              className="text-xs font-medium px-2 py-1 rounded-lg bg-[--p-bg-card] border border-[--p-border] text-[--p-text-1] focus:outline-none focus:ring-1 focus:ring-[#0ea5e9]"
            >
              {TIPO_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={handleAgendar}
            disabled={!selectedAluno || semCredito || saving}
            className="flex-1 py-1.5 text-sm font-medium rounded-lg bg-[#0ea5e9] text-white hover:bg-[#0284c7] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? 'Agendando…' : 'Confirmar agendamento'}
          </button>
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-sm text-[--p-text-3] hover:text-[--p-text-1] rounded-lg hover:bg-[--p-hover] transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </motion.div>
  )
}

// ── Slot row ──────────────────────────────────────────────────────────────────

function SlotRow({
  slot,
  instructorName,
  instructorCategory,
  autoescola_id,
  date,
  alunos,
  onStatusChange,
  onTipoChange,
  onBooked,
}: {
  slot: SlotDia
  instructorName: string
  instructorCategory: string
  autoescola_id: string
  date: string
  alunos: AlunoParaAgendar[]
  onStatusChange: (id: string, status: string) => void
  onTipoChange: (id: string, tipo: 'aula' | 'banca') => void
  onBooked: (updated: SlotDia) => void
}) {
  const [showForm, setShowForm] = useState(false)
  const ag = slot.agendamento

  // ── Bloqueado ─────────────────────────────────────────────────────────────────
  if (!ag && slot.bloqueado) {
    return (
      <tr className="border-b border-[--p-border] last:border-0 opacity-50">
        <td className="px-4 py-2.5 text-sm font-mono text-[--p-text-3] w-20">{slot.horario}</td>
        <td className="px-4 py-2.5 text-xs text-red-500 dark:text-red-400 italic" colSpan={5}>Bloqueado</td>
      </tr>
    )
  }

  // ── Free slot ────────────────────────────────────────────────────────────────
  if (!ag) {
    return (
      <tr className="border-b border-[--p-border] last:border-0">
        <td className="px-4 py-2.5 text-sm font-mono text-[--p-text-3] w-20 align-top pt-3">{slot.horario}</td>
        <td className="px-4 py-2.5 align-top" colSpan={5}>
          <AnimatePresence mode="wait">
            {!showForm ? (
              <motion.button
                key="btn"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowForm(true)}
                className="flex items-center gap-1.5 text-xs text-[--p-text-3] hover:text-[#0ea5e9] transition-colors group"
              >
                <span className="italic">Livre</span>
                <span className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-1 text-[#0ea5e9]">
                  <Plus className="w-3 h-3" /> Agendar
                </span>
              </motion.button>
            ) : (
              <AgendarForm
                key="form"
                horario={slot.horario}
                instructorName={instructorName}
                instructorCategory={instructorCategory}
                autoescola_id={autoescola_id}
                date={date}
                alunos={alunos}
                onSuccess={(updated) => { setShowForm(false); onBooked(updated) }}
                onCancel={() => setShowForm(false)}
              />
            )}
          </AnimatePresence>
        </td>
      </tr>
    )
  }

  // ── Booked slot ──────────────────────────────────────────────────────────────
  const catCls = ag.instructorCategory ? (CAT_CLS[ag.instructorCategory] ?? CAT_CLS.AMBOS) : null
  const whatsappNum = ag.student_phone?.replace(/\D/g, '')

  return (
    <tr className="border-b border-[--p-border] last:border-0">
      <td className="px-4 py-3 text-sm font-mono font-semibold text-[#0ea5e9] w-20 align-middle">{slot.horario}</td>

      {/* Aluno */}
      <td className="px-4 py-3 align-middle">
        <p className="text-sm font-medium text-[--p-text-1]">{ag.student_name}</p>
        {ag.cpf_cnh && <p className="text-xs text-[--p-text-3] mt-0.5">{ag.cpf_cnh}</p>}
      </td>

      {/* Contato */}
      <td className="px-4 py-3 align-middle">
        {ag.student_phone ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[--p-text-2]">{ag.student_phone}</span>
            <a
              href={`https://wa.me/55${whatsappNum}`}
              target="_blank"
              rel="noreferrer"
              title="Abrir WhatsApp"
              className="p-1 rounded-md text-emerald-500 hover:bg-emerald-500/10 transition-colors shrink-0"
            >
              <MessageCircle className="w-4 h-4" />
            </a>
          </div>
        ) : ag.student_email ? (
          <a
            href={`mailto:${ag.student_email}`}
            className="text-xs text-[--p-text-2] hover:text-[#0ea5e9] transition-colors"
          >
            {ag.student_email}
          </a>
        ) : (
          <span className="text-xs text-[--p-text-3] italic">Sem contato</span>
        )}
      </td>

      {/* Categoria */}
      <td className="px-4 py-3 align-middle">
        {catCls && (
          <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${catCls}`}>
            {ag.instructorCategory}
          </span>
        )}
      </td>

      {/* Tipo select */}
      <td className="px-4 py-3 align-middle">
        <select
          value={ag.tipo ?? 'aula'}
          onChange={(e) => onTipoChange(ag.id, e.target.value as 'aula' | 'banca')}
          className={`text-xs font-semibold border-0 focus:outline-none focus:ring-0 cursor-pointer rounded-full px-2 py-0.5 ${TIPO_CLS[ag.tipo ?? 'aula']}`}
        >
          {TIPO_OPTIONS.map((o) => (
            <option key={o.value} value={o.value} className="text-[--p-text-1] bg-[--p-bg-card]">
              {o.label}
            </option>
          ))}
        </select>
      </td>

      {/* Status select */}
      <td className="px-4 py-3 align-middle">
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[ag.status] ?? STATUS_DOT.scheduled}`} />
          <select
            value={ag.status}
            onChange={(e) => onStatusChange(ag.id, e.target.value)}
            className={`text-xs font-medium bg-transparent border-0 focus:outline-none focus:ring-0 cursor-pointer pr-1 ${STATUS_TEXT[ag.status] ?? STATUS_TEXT.scheduled}`}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value} className="text-[--p-text-1] bg-[--p-bg-card]">
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </td>
    </tr>
  )
}

// ── Day Panel ─────────────────────────────────────────────────────────────────

function DayPanel({
  autoescola_id,
  date,
}: {
  autoescola_id: string
  date: string
}) {
  const [instrutores, setInstrutores] = useState<InstrutorDia[] | null>(null)
  const [selectedInstrutor, setSelectedInstrutor] = useState<string | null>(null)
  const [instructorCategory, setInstructorCategory] = useState<string>('CARRO')
  const [slots, setSlots] = useState<SlotDia[]>([])
  const [alunos, setAlunos] = useState<AlunoParaAgendar[]>([])
  const [loadingInst, setLoadingInst] = useState(true)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Controle do modal de cancelamento
  const [modalCancel, setModalCancel] = useState<{
    open: boolean
    id: string
    studentName: string
    timeSlot: string
  }>({ open: false, id: '', studentName: '', timeSlot: '' })

  useEffect(() => {
    setInstrutores(null)
    setSelectedInstrutor(null)
    setSlots([])
    setLoadingInst(true)

    Promise.all([
      getInstrutoresDoDia(autoescola_id, date),
      listarAlunosParaAgendar(autoescola_id),
    ]).then(([instData, alunosData]) => {
      setInstrutores(instData)
      setAlunos(alunosData)
      setLoadingInst(false)
      if (instData.length > 0) {
        const first = instData[0]
        loadInstrutor(first.instructor_name, first.category)
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date])

  async function loadInstrutor(name: string, category: string) {
    setSelectedInstrutor(name)
    setInstructorCategory(category)
    setLoadingSlots(true)
    const data = await getSlotsDoDia(autoescola_id, date, name, category)
    setSlots(data)
    setLoadingSlots(false)
  }

  function handleStatusChange(id: string, status: string) {
    const slot = slots.find(s => s.agendamento?.id === id)
    
    if (status === 'cancelled' && slot?.agendamento) {
      setModalCancel({
        open: true,
        id,
        studentName: slot.agendamento.student_name,
        timeSlot: slot.horario
      })
      return
    }

    setSlots((prev) =>
      prev.map((s) =>
        s.agendamento?.id === id
          ? { ...s, agendamento: { ...s.agendamento!, status } }
          : s
      )
    )
    atualizarStatusAgendamento(id, status as Parameters<typeof atualizarStatusAgendamento>[1])
  }

  function handleTipoChange(id: string, tipo: 'aula' | 'banca') {
    setSlots((prev) =>
      prev.map((s) =>
        s.agendamento?.id === id
          ? { ...s, agendamento: { ...s.agendamento!, tipo } }
          : s
      )
    )
    atualizarTipoAgendamento(id, tipo, autoescola_id)
  }

  async function onConfirmCancel(options: { blockSlot: boolean; reason?: string }) {
    if (!modalCancel.id) return

    startTransition(async () => {
      const result = await cancelarAgendamentoComOpcoes(modalCancel.id, autoescola_id, options)
      if (result.success) {
        setSlots((prev) =>
          prev.map((s) =>
            s.agendamento?.id === modalCancel.id
              ? { ...s, agendamento: null, bloqueado: options.blockSlot }
              : s
          )
        )
        setModalCancel(prev => ({ ...prev, open: false }))
      } else {
        alert(result.error || 'Erro ao cancelar')
      }
    })
  }

  function handleBooked(updated: SlotDia) {
    setSlots((prev) => prev.map((s) => s.horario === updated.horario ? updated : s))
    // Atualizar contagem do instrutor
    setInstrutores((prev) => prev
      ? prev.map((i) => i.instructor_name === selectedInstrutor
          ? { ...i, total: i.total + 1 }
          : i
        )
      : prev
    )
  }

  const booked = slots.filter((s) => s.agendamento).length
  const livres = slots.filter((s) => !s.agendamento).length
  const isToday = date === todayStr()

  return (
    <div className="bg-[--p-bg-card] rounded-2xl border border-[--p-border] overflow-hidden">
      {/* Panel header */}
      <div className="px-5 py-3.5 border-b border-[--p-border]">
        <p className="text-sm font-semibold text-[--p-text-1] capitalize">
          {formatDateLabel(date)}
          {isToday && (
            <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-[#0ea5e9]/10 text-[#0ea5e9]">
              Hoje
            </span>
          )}
        </p>
        {!loadingInst && instrutores && (
          <p className="text-xs text-[--p-text-3] mt-0.5">
            {instrutores.length === 0
              ? 'Nenhuma aula agendada'
              : `${instrutores.length} instrutor${instrutores.length !== 1 ? 'es' : ''} · ${booked} aula${booked !== 1 ? 's' : ''} · ${livres} slot${livres !== 1 ? 's' : ''} livre${livres !== 1 ? 's' : ''}`}
          </p>
        )}
      </div>

      {loadingInst ? (
        <div className="py-12 text-center text-[--p-text-3] text-sm">Carregando…</div>
      ) : !instrutores?.length ? (
        <div className="py-12 text-center text-[--p-text-3] text-sm">Nenhuma aula neste dia.</div>
      ) : (
        <div className="flex min-h-[320px]">
          {/* Instructor sidebar */}
          <div className="w-44 shrink-0 border-r border-[--p-border] flex flex-col">
            {instrutores.map((inst) => (
              <button
                key={inst.instructor_name}
                onClick={() => loadInstrutor(inst.instructor_name, inst.category)}
                className={`flex items-center gap-2.5 px-3 py-3 text-left transition-colors border-b border-[--p-border] last:border-0 ${
                  selectedInstrutor === inst.instructor_name
                    ? 'bg-[#0ea5e9]/10 border-l-2 border-l-[#0ea5e9]'
                    : 'hover:bg-[--p-hover]'
                }`}
              >
                <div className="w-7 h-7 rounded-full bg-[--p-bg-input] border border-[--p-border] flex items-center justify-center shrink-0">
                  <User className="w-3.5 h-3.5 text-[--p-text-3]" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-[--p-text-1] truncate leading-tight">{inst.instructor_name}</p>
                  <p className="text-[10px] text-[--p-text-3]">{inst.total} aula{inst.total !== 1 ? 's' : ''}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Slots table */}
          <div className="flex-1 overflow-x-auto">
            {loadingSlots ? (
              <div className="py-12 text-center text-[--p-text-3] text-sm">Carregando horários…</div>
            ) : slots.length === 0 ? (
              <div className="py-12 text-center text-[--p-text-3] text-sm">Sem horários cadastrados.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[--p-border]">
                    <th className="px-4 py-2 text-left text-xs font-semibold text-[--p-text-3] uppercase w-20">Horário</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-[--p-text-3] uppercase">Aluno</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-[--p-text-3] uppercase">Contato</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-[--p-text-3] uppercase">Cat.</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-[--p-text-3] uppercase">Tipo</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-[--p-text-3] uppercase">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {slots.map((slot) => (
                    <SlotRow
                      key={slot.horario}
                      slot={slot}
                      instructorName={selectedInstrutor!}
                      instructorCategory={instructorCategory}
                      autoescola_id={autoescola_id}
                      date={date}
                      alunos={alunos}
                      onStatusChange={handleStatusChange}
                      onTipoChange={handleTipoChange}
                      onBooked={handleBooked}
                    />
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
      
      <ModalCancelamentoAula
        open={modalCancel.open}
        isPending={isPending}
        onClose={() => setModalCancel(prev => ({ ...prev, open: false }))}
        onConfirm={onConfirmCancel}
        aulaInfo={{
          studentName: modalCancel.studentName,
          date: date,
          timeSlot: modalCancel.timeSlot
        }}
      />
    </div>
  )
}

// ── Main Calendar ─────────────────────────────────────────────────────────────

interface Props {
  autoescola_id: string
  initialData: DiaCalendario[]
  initialYear: number
  initialMonth: number
}

export function Calendario({ autoescola_id, initialData, initialYear, initialMonth }: Props) {
  const [year, setYear] = useState(initialYear)
  const [month, setMonth] = useState(initialMonth)
  const [dias, setDias] = useState<DiaCalendario[]>(initialData)
  const [isPending, startTransition] = useTransition()
  const [selectedDate, setSelectedDate] = useState(todayStr())

  const capacidade = Math.max(1, ...dias.map(d => d.total))

  function navigate(delta: number) {
    const d = new Date(year, month - 1 + delta, 1)
    const ny = d.getFullYear()
    const nm = d.getMonth() + 1
    startTransition(async () => {
      const data = await getCalendarioData(autoescola_id, ny, nm)
      setYear(ny)
      setMonth(nm)
      setDias(data)
    })
  }

  const firstDow = new Date(year, month - 1, 1).getDay()
  const cells: (DiaCalendario | null)[] = [
    ...Array(firstDow).fill(null),
    ...dias,
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const today = todayStr()

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Calendar className="w-5 h-5 text-[#0ea5e9]" />
        <div>
          <h1 className="text-xl font-bold text-[--p-text-1]">Calendário</h1>
          <p className="text-sm text-[--p-text-3]">Clique em um dia para ver os horários</p>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="bg-[--p-bg-card] rounded-2xl border border-[--p-border] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[--p-border]">
          <button
            onClick={() => navigate(-1)}
            disabled={isPending}
            className="p-2 rounded-lg text-[--p-text-3] hover:text-[--p-text-1] hover:bg-[--p-hover] transition-colors disabled:opacity-40"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-base font-semibold text-[--p-text-1]">
            {MESES[month - 1]} {year}
          </h2>
          <button
            onClick={() => navigate(1)}
            disabled={isPending}
            className="p-2 rounded-lg text-[--p-text-3] hover:text-[--p-text-1] hover:bg-[--p-hover] transition-colors disabled:opacity-40"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-5 px-6 py-2.5 border-b border-[--p-border] flex-wrap">
          {[
            { color: 'bg-red-400', label: 'Bloqueado' },
            { color: 'bg-orange-400', label: 'Alta (≥70%)' },
            { color: 'bg-yellow-400', label: 'Média (≥30%)' },
            { color: 'bg-emerald-400', label: 'Baixa / livre' },
          ].map((l) => (
            <div key={l.label} className="flex items-center gap-1.5 text-xs text-[--p-text-3]">
              <div className={`w-3 h-3 rounded-sm ${l.color}`} />
              {l.label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 border-b border-[--p-border]">
          {DIAS_SEMANA.map((d) => (
            <div key={d} className="text-center text-xs font-semibold text-[--p-text-3] uppercase py-2.5 px-1">
              {d}
            </div>
          ))}
        </div>

        {isPending ? (
          <div className="h-56 flex items-center justify-center text-[--p-text-3] text-sm">Carregando…</div>
        ) : (
          <div className="grid grid-cols-7">
            {cells.map((dia, i) => {
              if (!dia) return <div key={`empty-${i}`} className="border-b border-r border-[--p-border] min-h-[70px]" />
              const dayNum = parseInt(dia.date.split('-')[2])
              const dayColor = getDayColor(dia, capacidade)
              const isToday = dia.date === today
              const isSelected = dia.date === selectedDate
              return (
                <div
                  key={dia.date}
                  onClick={() => setSelectedDate(dia.date)}
                  className={`border-b border-r border-[--p-border] min-h-[70px] p-2 cursor-pointer transition-colors ${
                    isSelected ? 'bg-[#0ea5e9]/5' : 'hover:bg-[--p-hover]'
                  }`}
                >
                  <div className={`flex items-center justify-center w-7 h-7 rounded-full text-sm font-medium mb-1 ${
                    isToday
                      ? 'bg-[#0ea5e9] text-white'
                      : isSelected
                      ? 'ring-2 ring-[#0ea5e9] text-[--p-text-1]'
                      : 'text-[--p-text-2]'
                  }`}>
                    {dayNum}
                  </div>
                  {dia.total > 0 && (
                    <div className={`rounded-lg px-1.5 py-0.5 text-xs font-medium border ${dayColor}`}>
                      {dia.total} aulas
                    </div>
                  )}
                  {dia.bloqueado && dia.total === 0 && (
                    <div className={`rounded-lg px-1.5 py-0.5 text-xs font-medium border ${dayColor}`}>
                      Bloqueado
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Day panel */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedDate}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15 }}
        >
          <DayPanel autoescola_id={autoescola_id} date={selectedDate} />
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
