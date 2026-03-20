'use client'

import { useState, useTransition, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, CheckCircle2, UserX, CalendarDays, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { InstructorAulaCard } from './InstructorAulaCard'
import { getMinhasAulasHoje, getMapaSemanal } from '../actions/minhasAulas'
import type { AulaInstrutor, DiaSemana } from '../actions/minhasAulas'

interface Props {
  aulas: AulaInstrutor[]
  mapaSemanal: DiaSemana[]
  instructorName: string
  autoescola_id: string
  hoje: string
  weekStart: string
}

function getMondayOfWeek(offsetWeeks: number): string {
  const today = new Date()
  const day = today.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(today)
  monday.setDate(today.getDate() + diff + offsetWeeks * 7)
  return monday.toISOString().split('T')[0]
}

function formatWeekRange(weekStartDate: string): string {
  const start = new Date(weekStartDate + 'T12:00:00')
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
  return `${start.toLocaleDateString('pt-BR', opts)} – ${end.toLocaleDateString('pt-BR', opts)}`
}

export function InstructorPainel({
  aulas: initialAulas,
  mapaSemanal: initialMapa,
  instructorName,
  autoescola_id,
  hoje,
  weekStart: initialWeekStart,
}: Props) {
  const [aulas, setAulas] = useState(initialAulas)
  const [mapa, setMapa] = useState(initialMapa)
  const [selectedDate, setSelectedDate] = useState(hoje)
  const [weekOffset, setWeekOffset] = useState(0)
  const [weekStart, setWeekStart] = useState(initialWeekStart)
  const [mapaOpen, setMapaOpen] = useState(true)
  const [isPending, startTransition] = useTransition()

  const handleSelectDay = useCallback((date: string) => {
    setSelectedDate(date)
    startTransition(async () => {
      const novasAulas = await getMinhasAulasHoje(instructorName, autoescola_id, date)
      setAulas(novasAulas)
    })
  }, [instructorName, autoescola_id])

  const handleWeekChange = useCallback((direction: -1 | 1) => {
    const newOffset = weekOffset + direction
    const newWeekStart = getMondayOfWeek(newOffset)
    setWeekOffset(newOffset)
    setWeekStart(newWeekStart)
    startTransition(async () => {
      const novoMapa = await getMapaSemanal(instructorName, autoescola_id, newWeekStart)
      setMapa(novoMapa)
      // Seleciona o primeiro dia da nova semana
      if (novoMapa.length > 0) {
        const firstDate = novoMapa[0].date
        setSelectedDate(firstDate)
        const novasAulas = await getMinhasAulasHoje(instructorName, autoescola_id, firstDate)
        setAulas(novasAulas)
      }
    })
  }, [weekOffset, instructorName, autoescola_id])

  const pendentes = aulas.filter((a) => a.status === 'scheduled' || a.status === 'confirmed').length
  const concluidas = aulas.filter((a) => a.status === 'completed').length
  const faltas = aulas.filter((a) => a.status === 'absent').length
  const total = aulas.length

  function handleUpdate(id: string, status: string) {
    setAulas((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)))
  }

  const selectedDateObj = new Date(selectedDate + 'T12:00:00')
  const isCurrentWeek = weekOffset === 0

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Pendentes" value={pendentes} color="border-blue-500" textColor="text-blue-400" icon={<Clock className="w-5 h-5" />} />
        <StatCard label="Concluídas" value={concluidas} color="border-emerald-500" textColor="text-emerald-400" icon={<CheckCircle2 className="w-5 h-5" />} />
        <StatCard label="Faltas" value={faltas} color="border-red-500" textColor="text-red-400" icon={<UserX className="w-5 h-5" />} />
        <StatCard label="Total" value={total} color="border-orange-500" textColor="text-orange-400" icon={<CalendarDays className="w-5 h-5" />} />
      </div>

      {/* Mapa Semanal */}
      <div className="bg-[--p-bg-card] rounded-2xl border border-[--p-border]">
        <button
          onClick={() => setMapaOpen((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-[--p-hover] rounded-2xl transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <CalendarDays className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-[--p-text-1]">Mapa Semanal</p>
              <p className="text-xs text-[--p-text-3]">{formatWeekRange(weekStart)}</p>
            </div>
          </div>
          {mapaOpen ? (
            <ChevronUp className="w-4 h-4 text-[--p-text-3]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[--p-text-3]" />
          )}
        </button>

        <AnimatePresence>
          {mapaOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              {/* Navegação de semana */}
              <div className="flex items-center justify-between px-5 pb-3">
                <button
                  onClick={() => handleWeekChange(-1)}
                  disabled={isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[--p-bg-input] border border-[--p-border] text-[--p-text-2] hover:bg-[--p-hover] transition-colors disabled:opacity-40 text-xs"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Anterior
                </button>

                {!isCurrentWeek && (
                  <button
                    onClick={() => {
                      const newWeekStart = getMondayOfWeek(0)
                      setWeekOffset(0)
                      setWeekStart(newWeekStart)
                      startTransition(async () => {
                        const novoMapa = await getMapaSemanal(instructorName, autoescola_id, newWeekStart)
                        setMapa(novoMapa)
                        setSelectedDate(hoje)
                        const novasAulas = await getMinhasAulasHoje(instructorName, autoescola_id, hoje)
                        setAulas(novasAulas)
                      })
                    }}
                    disabled={isPending}
                    className="text-xs px-3 py-1.5 rounded-xl bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-colors border border-purple-500/20 disabled:opacity-40"
                  >
                    Hoje
                  </button>
                )}

                <button
                  onClick={() => handleWeekChange(1)}
                  disabled={isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[--p-bg-input] border border-[--p-border] text-[--p-text-2] hover:bg-[--p-hover] transition-colors disabled:opacity-40 text-xs"
                >
                  Próxima
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Dias da semana */}
              <div className={`grid grid-cols-7 gap-2 px-5 pb-5 transition-opacity ${isPending ? 'opacity-50' : 'opacity-100'}`}>
                {mapa.map((dia) => {
                  const isToday = dia.date === hoje
                  const isSelected = dia.date === selectedDate

                  return (
                    <button
                      key={dia.date}
                      onClick={() => handleSelectDay(dia.date)}
                      disabled={isPending}
                      className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all disabled:cursor-wait ${
                        isSelected && isToday
                          ? 'border-purple-500 bg-purple-500/20 ring-2 ring-purple-500/30'
                          : isSelected
                          ? 'border-[--p-accent] bg-[--p-accent]/10 ring-2 ring-[--p-accent]/20'
                          : isToday
                          ? 'border-purple-500/50 bg-purple-500/10'
                          : 'border-[--p-border] bg-[--p-bg-input] hover:border-[--p-accent]/40 hover:bg-[--p-hover]'
                      }`}
                    >
                      <span className={`text-[10px] font-semibold uppercase ${
                        isToday ? 'text-purple-400' : 'text-[--p-text-3]'
                      }`}>
                        {dia.label}
                      </span>
                      <span className={`text-lg font-bold ${
                        isToday ? 'text-purple-300' : isSelected ? 'text-[--p-accent]' : 'text-[--p-text-1]'
                      }`}>
                        {dia.dayNum}
                      </span>
                      {isToday && (
                        <span className="w-1 h-1 rounded-full bg-purple-400" />
                      )}
                      {dia.total > 0 ? (
                        <span className={`text-xs font-semibold ${isToday ? 'text-purple-300' : 'text-[--p-accent]'}`}>
                          {dia.total}
                        </span>
                      ) : (
                        <span className="text-xs text-[--p-text-3]">—</span>
                      )}
                      {dia.total > 0 && (
                        <span className="text-[10px] text-[--p-text-3]">
                          {dia.pendentes > 0 ? `${dia.pendentes} pend.` : 'ok'}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Aulas do dia selecionado */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-xl bg-[--p-accent]/10 flex items-center justify-center">
            <CalendarDays className="w-4 h-4 text-[--p-accent]" />
          </div>
          <div>
            <p className="text-sm font-bold text-[--p-text-1]">
              Aulas
              {selectedDate === hoje && (
                <span className="ml-2 text-xs font-normal text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full">hoje</span>
              )}
            </p>
            <p className="text-xs text-[--p-text-3]">
              {selectedDateObj.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
        </div>

        {isPending ? (
          <div className="text-center py-10 text-[--p-text-3] text-sm bg-[--p-bg-card] rounded-2xl border border-[--p-border]">
            Carregando...
          </div>
        ) : aulas.length === 0 ? (
          <div className="text-center py-14 text-[--p-text-3] text-sm bg-[--p-bg-card] rounded-2xl border border-[--p-border]">
            Nenhuma aula agendada para este dia.
          </div>
        ) : (
          <div className="space-y-3">
            {aulas.map((aula) => (
              <InstructorAulaCard
                key={aula.id}
                aula={aula}
                instructorName={instructorName}
                onUpdate={handleUpdate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({
  label, value, color, textColor, icon,
}: {
  label: string
  value: number
  color: string
  textColor: string
  icon: React.ReactNode
}) {
  return (
    <div className={`bg-[--p-bg-card] rounded-2xl border-l-4 ${color} border-t border-r border-b border-t-[--p-border] border-r-[--p-border] border-b-[--p-border] p-4`}>
      <div className={`${textColor} mb-2`}>{icon}</div>
      <p className={`text-2xl font-bold ${textColor}`}>{value}</p>
      <p className="text-xs text-[--p-text-3] mt-0.5">{label}</p>
    </div>
  )
}
