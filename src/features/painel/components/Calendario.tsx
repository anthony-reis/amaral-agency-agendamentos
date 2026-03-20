'use client'

import { useState, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, X, Calendar } from 'lucide-react'
import { getCalendarioData, getAgendamentosDia, type DiaCalendario } from '../actions/calendario'

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  scheduled: { label: 'Agendado', cls: 'bg-sky-100 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400' },
  confirmed: { label: 'Confirmado', cls: 'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-300' },
  completed: { label: 'Concluído', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' },
  cancelled: { label: 'Cancelado', cls: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400' },
  absent: { label: 'Falta', cls: 'bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400' },
}

type DayInfo = { color: string; label: string }

function getDayInfo(dia: DiaCalendario, capacidade: number): DayInfo {
  if (dia.bloqueado) {
    return {
      color: 'bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20',
      label: dia.total > 0 ? `${dia.total} aulas` : 'Bloqueado',
    }
  }
  const pct = capacidade > 0 ? (dia.total / capacidade) * 100 : 0
  if (pct >= 70) return {
    color: 'bg-orange-100 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-500/20',
    label: `${dia.total} aulas`,
  }
  if (pct >= 30) return {
    color: 'bg-yellow-100 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-500/20',
    label: `${dia.total} aulas`,
  }
  if (dia.total > 0) return {
    color: 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20',
    label: `${dia.total} aulas`,
  }
  // 0 aulas = baixa ocupação
  return {
    color: 'bg-emerald-50 dark:bg-emerald-500/5 text-emerald-500 dark:text-emerald-600 border-emerald-100 dark:border-emerald-500/10',
    label: 'Baixa',
  }
}

interface Props {
  autoescola_id: string
  initialData: DiaCalendario[]
  initialYear: number
  initialMonth: number
}

type AgendamentoDia = {
  id: string
  time_slot: string
  instructor_name: string | null
  student_name: string
  status: string
  instructorCategory: string | null
  cpf_cnh: string | null
}

export function Calendario({ autoescola_id, initialData, initialYear, initialMonth }: Props) {
  const [year, setYear] = useState(initialYear)
  const [month, setMonth] = useState(initialMonth) // 1-based
  const [dias, setDias] = useState<DiaCalendario[]>(initialData)
  const [isPending, startTransition] = useTransition()
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [agsDia, setAgsDia] = useState<AgendamentoDia[]>([])
  const [loadingDia, setLoadingDia] = useState(false)

  // Capacidade relativa: usa o dia mais movimentado do mês como 100%
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

  async function handleDayClick(date: string, total: number) {
    if (total === 0) return
    setSelectedDate(date)
    setLoadingDia(true)
    const data = await getAgendamentosDia(autoescola_id, date) as AgendamentoDia[]
    setAgsDia(data)
    setLoadingDia(false)
  }

  // Build calendar grid
  const firstDow = new Date(year, month - 1, 1).getDay() // 0=Sun
  const daysInMonth = new Date(year, month, 0).getDate()
  const cells: (DiaCalendario | null)[] = [
    ...Array(firstDow).fill(null),
    ...dias,
  ]
  // pad end
  while (cells.length % 7 !== 0) cells.push(null)

  function formatDateLabel(date: string) {
    const [y, m, d] = date.split('-')
    return `${d}/${m}/${y}`
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Calendar className="w-5 h-5 text-[#0ea5e9]" />
        <div>
          <h1 className="text-xl font-bold text-[--p-text-1]">Calendário</h1>
          <p className="text-sm text-[--p-text-3]">Visão mensal dos agendamentos</p>
        </div>
      </div>

      <div className="bg-[--p-bg-card] rounded-2xl border border-[--p-border] overflow-hidden">
        {/* Month navigation */}
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

        {/* Legend */}
        <div className="flex items-center gap-5 px-6 py-2.5 border-b border-[--p-border] flex-wrap">
          {[
            { color: 'bg-red-400', label: 'Bloqueado' },
            { color: 'bg-orange-400', label: 'Alta (≥70% do pico)' },
            { color: 'bg-yellow-400', label: 'Média (≥30% do pico)' },
            { color: 'bg-emerald-400', label: 'Baixa / sem aulas' },
          ].map((l) => (
            <div key={l.label} className="flex items-center gap-1.5 text-xs text-[--p-text-3]">
              <div className={`w-3 h-3 rounded-sm ${l.color}`} />
              {l.label}
            </div>
          ))}
        </div>

        {/* Days header */}
        <div className="grid grid-cols-7 border-b border-[--p-border]">
          {DIAS_SEMANA.map((d) => (
            <div key={d} className="text-center text-xs font-semibold text-[--p-text-3] uppercase py-2.5 px-1">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        {isPending ? (
          <div className="h-64 flex items-center justify-center text-[--p-text-3] text-sm">
            Carregando…
          </div>
        ) : (
          <div className="grid grid-cols-7">
            {cells.map((dia, i) => {
              if (!dia) {
                return <div key={`empty-${i}`} className="border-b border-r border-[--p-border] min-h-[80px]" />
              }
              const dayNum = parseInt(dia.date.split('-')[2])
              const dayInfo = getDayInfo(dia, capacidade)
              const isToday = dia.date === new Date().toISOString().split('T')[0]
              return (
                <div
                  key={dia.date}
                  onClick={() => handleDayClick(dia.date, dia.total)}
                  className={`border-b border-r border-[--p-border] min-h-[80px] p-2 transition-colors ${
                    dia.total > 0 ? 'cursor-pointer hover:opacity-80' : 'cursor-default'
                  }`}
                >
                  <div className={`flex items-center justify-center w-7 h-7 rounded-full text-sm font-medium mb-1 ${
                    isToday
                      ? 'bg-[#0ea5e9] text-white'
                      : 'text-[--p-text-2]'
                  }`}>
                    {dayNum}
                  </div>
                  <div className={`rounded-lg px-1.5 py-0.5 text-xs font-medium border ${dayInfo.color}`}>
                    {dayInfo.label}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Day modal */}
      <AnimatePresence>
        {selectedDate && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40"
              onClick={() => setSelectedDate(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
            >
              <div className="bg-[--p-bg-card] rounded-2xl border border-[--p-border] w-full max-w-lg shadow-2xl max-h-[80vh] flex flex-col">
                <div className="flex items-center justify-between px-5 py-4 border-b border-[--p-border]">
                  <h3 className="font-semibold text-[--p-text-1]">
                    Agendamentos — {formatDateLabel(selectedDate)}
                  </h3>
                  <button
                    onClick={() => setSelectedDate(null)}
                    className="p-1.5 rounded-lg text-[--p-text-3] hover:text-[--p-text-1] hover:bg-[--p-hover]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="overflow-y-auto divide-y divide-[--p-border]">
                  {loadingDia ? (
                    <div className="py-10 text-center text-[--p-text-3] text-sm">Carregando…</div>
                  ) : agsDia.length === 0 ? (
                    <div className="py-10 text-center text-[--p-text-3] text-sm">Nenhum agendamento.</div>
                  ) : (
                    agsDia.map((a) => {
                      const badge = STATUS_BADGE[a.status] ?? STATUS_BADGE.scheduled
                      return (
                        <div key={a.id} className="flex items-center gap-3 px-5 py-3">
                          <div className="w-16 text-sm font-mono font-semibold text-[#0ea5e9] shrink-0">
                            {a.time_slot}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[--p-text-1] truncate">{a.student_name}</p>
                            <p className="text-xs text-[--p-text-3]">{a.instructor_name ?? '—'}</p>
                          </div>
                          <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${badge.cls}`}>
                            {badge.label}
                          </span>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
