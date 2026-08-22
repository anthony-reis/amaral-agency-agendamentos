'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Car, Bike, CheckCircle2, XCircle, FileCheck, Route, Calendar as CalendarIcon,
  ChevronLeft, ChevronRight, CalendarDays, BookOpen, ShoppingBag, Clock, User,
} from 'lucide-react'
import { getAlunoStats, getAgendamentosMes, type AlunoStats, type AulaCalendario } from '../actions/dashboard'
import { PlanosPreview } from '@/features/identificacao/components/PlanosPreview'
import type { StudentCredits } from '@/features/identificacao/types'
import type { Produto } from '@/lib/loja-types'

interface Props {
  escola: string
  autoescolaId: string
  documentId: string
  studentName: string
  credits: StudentCredits
  produtos: Produto[]
  lojaAtiva: boolean
}

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]
const DIAS_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

function StatTile({
  label, value, color, icon,
}: { label: string; value: string | number; color: string; icon: React.ReactNode }) {
  return (
    <div className={`${color} rounded-2xl p-4 flex items-center justify-between`}>
      <div className="min-w-0">
        <p className="text-[11px] text-white/70 font-medium mb-0.5 truncate">{label}</p>
        <p className="text-2xl font-bold text-white/90 leading-none">{value}</p>
      </div>
      {icon}
    </div>
  )
}

const DOT_COLOR: Record<string, string> = {
  scheduled: 'bg-sky-400',
  confirmed: 'bg-sky-400',
  in_progress: 'bg-sky-400',
  completed: 'bg-emerald-400',
  absent: 'bg-red-400',
}

export function AlunoDashboard({ escola, autoescolaId, documentId, studentName, credits, produtos, lojaAtiva }: Props) {
  const now = new Date()
  const [stats, setStats] = useState<AlunoStats | null>(null)
  const [ano, setAno] = useState(now.getFullYear())
  const [mes, setMes] = useState(now.getMonth() + 1)
  const [aulas, setAulas] = useState<AulaCalendario[]>([])
  const [loadingCalendar, setLoadingCalendar] = useState(true)
  const [selectedDate, setSelectedDate] = useState(todayStr())

  useEffect(() => {
    getAlunoStats(autoescolaId, documentId).then(setStats)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    setLoadingCalendar(true)
    getAgendamentosMes(autoescolaId, documentId, ano, mes).then((data) => {
      setAulas(data)
      setLoadingCalendar(false)
    })
  }, [autoescolaId, documentId, ano, mes])

  function navigate(delta: number) {
    const d = new Date(ano, mes - 1 + delta, 1)
    setAno(d.getFullYear())
    setMes(d.getMonth() + 1)
  }

  const aulasPorDia = new Map<string, AulaCalendario[]>()
  for (const a of aulas) {
    if (!aulasPorDia.has(a.date)) aulasPorDia.set(a.date, [])
    aulasPorDia.get(a.date)!.push(a)
  }

  const firstDow = new Date(ano, mes - 1, 1).getDay()
  const daysInMonth = new Date(ano, mes, 0).getDate()
  const cells: (string | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => `${ano}-${String(mes).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const today = todayStr()
  const aulasDoDia = aulasPorDia.get(selectedDate) ?? []
  const primeiroNome = studentName.split(' ')[0]

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-full bg-[--p-accent]/15 flex items-center justify-center shrink-0">
          <span className="text-base font-bold text-[--p-accent]">{primeiroNome.charAt(0).toUpperCase()}</span>
        </div>
        <div>
          <h1 className="text-lg font-bold text-[--p-text-1] capitalize">Olá, {primeiroNome.toLowerCase()}!</h1>
          <p className="text-xs text-[--p-text-3]">Seus dados, aulas e planos num só lugar</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatTile label="Créditos Carro" value={credits.aulas_cat_b} color="bg-blue-600" icon={<Car className="w-6 h-6 text-white/70" />} />
        <StatTile label="Créditos Moto" value={credits.aulas_cat_a} color="bg-emerald-600" icon={<Bike className="w-6 h-6 text-white/70" />} />
        <StatTile label="Aulas Concluídas" value={stats?.aulasConcluidas ?? '—'} color="bg-violet-600" icon={<CheckCircle2 className="w-6 h-6 text-white/70" />} />
        <StatTile label="Faltas" value={stats?.faltas ?? '—'} color="bg-red-600" icon={<XCircle className="w-6 h-6 text-white/70" />} />
        <StatTile label="Tentativas de Exame" value={stats?.tentativasExame ?? '—'} color="bg-amber-600" icon={<FileCheck className="w-6 h-6 text-white/70" />} />
        <StatTile label="KM Rodado" value={stats ? `${stats.kmTotal.toLocaleString('pt-BR')} km` : '—'} color="bg-sky-600" icon={<Route className="w-6 h-6 text-white/70" />} />
      </div>

      {/* Calendário + ações rápidas */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-4">
        <div className="bg-[--p-bg-card] rounded-2xl border border-[--p-border] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[--p-border]">
            <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg text-[--p-text-3] hover:text-[--p-text-1] hover:bg-[--p-hover] transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h2 className="text-sm font-semibold text-[--p-text-1] flex items-center gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5 text-[--p-accent]" />
              {MESES[mes - 1]} {ano}
            </h2>
            <button onClick={() => navigate(1)} className="p-1.5 rounded-lg text-[--p-text-3] hover:text-[--p-text-1] hover:bg-[--p-hover] transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 border-b border-[--p-border]">
            {DIAS_SEMANA.map((d, i) => (
              <div key={i} className="text-center text-[10px] font-semibold text-[--p-text-3] uppercase py-2">{d}</div>
            ))}
          </div>

          {loadingCalendar ? (
            <div className="h-48 flex items-center justify-center text-sm text-[--p-text-3]">Carregando…</div>
          ) : (
            <div className="grid grid-cols-7">
              {cells.map((date, i) => {
                if (!date) return <div key={`empty-${i}`} className="border-b border-r border-[--p-border] min-h-[52px]" />
                const dayNum = parseInt(date.split('-')[2])
                const dia = aulasPorDia.get(date) ?? []
                const isToday = date === today
                const isSelected = date === selectedDate
                return (
                  <button
                    key={date}
                    onClick={() => setSelectedDate(date)}
                    className={`border-b border-r border-[--p-border] min-h-[52px] p-1.5 flex flex-col items-center transition-colors ${
                      isSelected ? 'bg-[--p-accent]/10' : 'hover:bg-[--p-hover]'
                    }`}
                  >
                    <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold transition-colors ${
                      isSelected
                        ? 'bg-[--p-accent] text-white'
                        : isToday
                          ? 'border-2 border-[--p-accent] text-[--p-accent]'
                          : 'text-[--p-text-2]'
                    }`}>
                      {dayNum}
                    </span>
                    {dia.length > 0 && (
                      <div className="flex items-center gap-0.5 mt-1">
                        {dia.slice(0, 3).map((a) => (
                          <span key={a.id} className={`w-1.5 h-1.5 rounded-full ${DOT_COLOR[a.status] ?? 'bg-[--p-text-3]'}`} />
                        ))}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {/* Detalhe do dia selecionado */}
          <div className="border-t border-[--p-border] p-4">
            <p className="text-xs font-semibold text-[--p-text-3] uppercase tracking-wide mb-2">
              {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
            </p>
            {aulasDoDia.length === 0 ? (
              <p className="text-sm text-[--p-text-3]">Nenhuma aula neste dia.</p>
            ) : (
              <div className="space-y-2">
                {aulasDoDia.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 text-sm bg-[--p-bg-base] rounded-xl px-3 py-2.5 border border-[--p-border]">
                    <Clock className="w-3.5 h-3.5 text-[--p-text-3] shrink-0" />
                    <span className="font-semibold text-[--p-text-1]">{a.time_slot?.substring(0, 5)}</span>
                    <User className="w-3.5 h-3.5 text-[--p-text-3] shrink-0 ml-2" />
                    <span className="text-[--p-text-2] truncate flex-1">{a.instructor_name ?? '—'}</span>
                    {a.tipo === 'banca' && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500">Banca</span>
                    )}
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                      a.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500'
                        : a.status === 'absent' ? 'bg-red-500/10 text-red-500'
                        : 'bg-sky-500/10 text-sky-500'
                    }`}>
                      {a.status === 'completed' ? 'Concluída' : a.status === 'absent' ? 'Falta' : a.status === 'confirmed' ? 'Confirmada' : 'Agendada'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Ações rápidas */}
        <div className="space-y-3">
          <Link
            href={`/${escola}/aluno/agendar`}
            className="flex items-center gap-3 bg-[--p-accent] text-white rounded-2xl p-4 hover:opacity-90 transition-opacity"
          >
            <CalendarDays className="w-5 h-5 shrink-0" />
            <div>
              <p className="text-sm font-semibold">Agendar aula</p>
              <p className="text-[11px] text-white/80">Escolha data e instrutor</p>
            </div>
          </Link>
          <Link
            href={`/${escola}/aluno/minhas-aulas`}
            className="flex items-center gap-3 bg-[--p-bg-card] border border-[--p-border] rounded-2xl p-4 hover:bg-[--p-hover] transition-colors"
          >
            <BookOpen className="w-5 h-5 text-[--p-text-3] shrink-0" />
            <div>
              <p className="text-sm font-semibold text-[--p-text-1]">Minhas aulas</p>
              <p className="text-[11px] text-[--p-text-3]">Histórico completo</p>
            </div>
          </Link>
          {lojaAtiva && (
            <Link
              href={`/${escola}/aluno/loja`}
              className="flex items-center gap-3 bg-[--p-bg-card] border border-[--p-border] rounded-2xl p-4 hover:bg-[--p-hover] transition-colors"
            >
              <ShoppingBag className="w-5 h-5 text-[--p-text-3] shrink-0" />
              <div>
                <p className="text-sm font-semibold text-[--p-text-1]">Loja</p>
                <p className="text-[11px] text-[--p-text-3]">Todos os planos</p>
              </div>
            </Link>
          )}
        </div>
      </div>

      {/* Planos */}
      {produtos.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <PlanosPreview produtos={produtos} escola={escola} identificado />
        </motion.div>
      )}
    </div>
  )
}
