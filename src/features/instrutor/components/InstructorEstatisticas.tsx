'use client'

import { useState, useTransition } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart3,
  CheckCircle2,
  CalendarX,
  UserX,
  Clock,
  CalendarDays,
  TrendingUp,
  Gauge,
  Route,
  AlertTriangle,
  Filter,
} from 'lucide-react'
import { getEstatisticasInstrutor } from '../actions/estatisticas'
import type { EstatisticasInstrutor, EstatisticasFiltro } from '../actions/estatisticas'

interface Props {
  estatisticasIniciais: EstatisticasInstrutor
  instructorName: string
  autoescola_id: string
  registrarKm: boolean
  rangeInicial: EstatisticasFiltro
}

// Altura (px) da área de barras do gráfico. Usamos px em vez de % porque altura
// percentual dentro de flexbox não resolve e as barras saem com 0px.
const BAR_AREA_PX = 150

function fmt(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

type PresetKey = 'mesAtual' | 'mesPassado' | 'tresMeses' | 'ano' | 'custom'

function presetRange(key: Exclude<PresetKey, 'custom'>): EstatisticasFiltro {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  switch (key) {
    case 'mesAtual':
      return { date_start: fmt(new Date(y, m, 1)), date_end: fmt(new Date(y, m + 1, 0)) }
    case 'mesPassado':
      return { date_start: fmt(new Date(y, m - 1, 1)), date_end: fmt(new Date(y, m, 0)) }
    case 'tresMeses':
      return { date_start: fmt(new Date(y, m - 2, 1)), date_end: fmt(new Date(y, m + 1, 0)) }
    case 'ano':
      return { date_start: fmt(new Date(y, 0, 1)), date_end: fmt(new Date(y, 11, 31)) }
  }
}

const PRESETS: { key: Exclude<PresetKey, 'custom'>; label: string }[] = [
  { key: 'mesAtual', label: 'Este mês' },
  { key: 'mesPassado', label: 'Mês passado' },
  { key: 'tresMeses', label: 'Últimos 3 meses' },
  { key: 'ano', label: 'Este ano' },
]

function StatCard({
  label,
  value,
  icon,
  accent,
  delay,
}: {
  label: string
  value: string | number
  icon: React.ReactNode
  accent: string
  delay: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-[--p-bg-card] border border-[--p-border] rounded-2xl p-4 flex items-center gap-3"
    >
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${accent}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-[--p-text-1] leading-none">{value}</p>
        <p className="text-xs text-[--p-text-3] mt-1">{label}</p>
      </div>
    </motion.div>
  )
}

export function InstructorEstatisticas({
  estatisticasIniciais,
  instructorName,
  autoescola_id,
  registrarKm,
  rangeInicial,
}: Props) {
  const [stats, setStats] = useState(estatisticasIniciais)
  const [range, setRange] = useState(rangeInicial)
  const [activePreset, setActivePreset] = useState<PresetKey>('mesAtual')
  const [isPending, startTransition] = useTransition()

  function carregar(novoRange: EstatisticasFiltro) {
    startTransition(async () => {
      const novo = await getEstatisticasInstrutor(instructorName, autoescola_id, novoRange)
      setStats(novo)
    })
  }

  function aplicarPreset(key: Exclude<PresetKey, 'custom'>) {
    const novoRange = presetRange(key)
    setActivePreset(key)
    setRange(novoRange)
    carregar(novoRange)
  }

  function aplicarCustom(parcial: Partial<EstatisticasFiltro>) {
    const novoRange = { ...range, ...parcial }
    setActivePreset('custom')
    setRange(novoRange)
    if (novoRange.date_start && novoRange.date_end && novoRange.date_start <= novoRange.date_end) {
      carregar(novoRange)
    }
  }

  const maxSerie = Math.max(
    1,
    ...stats.serie.flatMap((m) => [m.concluidas, m.desmarcadas, m.faltas])
  )
  const tituloSerie = stats.granularidade === 'semana' ? 'Aulas por semana' : 'Aulas por mês'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[--p-accent]/10 flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-[--p-accent]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[--p-text-1] leading-tight">Estatísticas</h1>
          <p className="text-sm text-[--p-text-3]">Suas métricas pessoais</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-[--p-bg-card] border border-[--p-border] rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm text-[--p-text-2] font-medium">
          <Filter className="w-4 h-4" />
          Período
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => aplicarPreset(p.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activePreset === p.key
                  ? 'bg-[--p-accent] text-white'
                  : 'bg-[--p-bg-input] text-[--p-text-2] hover:text-[--p-text-1] hover:bg-[--p-hover]'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <label className="flex items-center gap-2 text-xs text-[--p-text-3]">
            De
            <input
              type="date"
              value={range.date_start}
              max={range.date_end}
              onChange={(e) => aplicarCustom({ date_start: e.target.value })}
              className="bg-[--p-bg-input] border border-[--p-border] rounded-lg px-2.5 py-1.5 text-sm text-[--p-text-1]"
            />
          </label>
          <label className="flex items-center gap-2 text-xs text-[--p-text-3]">
            Até
            <input
              type="date"
              value={range.date_end}
              min={range.date_start}
              onChange={(e) => aplicarCustom({ date_end: e.target.value })}
              className="bg-[--p-bg-input] border border-[--p-border] rounded-lg px-2.5 py-1.5 text-sm text-[--p-text-1]"
            />
          </label>
          {isPending && <span className="text-xs text-[--p-text-3] animate-pulse">Atualizando…</span>}
        </div>
      </div>

      {/* Cards de resumo */}
      <div className={`grid grid-cols-2 lg:grid-cols-3 gap-3 transition-opacity ${isPending ? 'opacity-60' : ''}`}>
        <StatCard
          label="Aulas concluídas"
          value={stats.concluidas}
          delay={0.02}
          accent="bg-emerald-500/10 text-emerald-500"
          icon={<CheckCircle2 className="w-5 h-5" />}
        />
        <StatCard
          label="Desmarcadas"
          value={stats.desmarcadas}
          delay={0.04}
          accent="bg-rose-500/10 text-rose-500"
          icon={<CalendarX className="w-5 h-5" />}
        />
        <StatCard
          label="Faltas"
          value={stats.faltas}
          delay={0.06}
          accent="bg-amber-500/10 text-amber-500"
          icon={<UserX className="w-5 h-5" />}
        />
        <StatCard
          label="Agendadas"
          value={stats.agendadas}
          delay={0.08}
          accent="bg-blue-500/10 text-blue-500"
          icon={<Clock className="w-5 h-5" />}
        />
        <StatCard
          label="Total no período"
          value={stats.total}
          delay={0.1}
          accent="bg-[--p-accent]/10 text-[--p-accent]"
          icon={<CalendarDays className="w-5 h-5" />}
        />
        <StatCard
          label="Taxa de conclusão"
          value={`${stats.taxaConclusao}%`}
          delay={0.12}
          accent="bg-violet-500/10 text-violet-500"
          icon={<TrendingUp className="w-5 h-5" />}
        />
      </div>

      {/* KM */}
      {registrarKm && stats.aulasComKm > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[--p-bg-card] border border-[--p-border] rounded-2xl p-5 space-y-4"
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-[--p-text-1]">
            <Route className="w-4 h-4 text-[--p-accent]" />
            Quilometragem
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[--p-bg-input] rounded-xl p-3">
              <div className="flex items-center gap-1.5 text-[--p-text-3] text-xs mb-1">
                <Gauge className="w-3.5 h-3.5" /> Média/aula
              </div>
              <p className="text-xl font-bold text-[--p-text-1]">{stats.kmMedia} km</p>
            </div>
            <div className="bg-[--p-bg-input] rounded-xl p-3">
              <div className="flex items-center gap-1.5 text-[--p-text-3] text-xs mb-1">
                <Route className="w-3.5 h-3.5" /> Total rodado
              </div>
              <p className="text-xl font-bold text-[--p-text-1]">{stats.kmTotal.toLocaleString('pt-BR')} km</p>
            </div>
            <div className="bg-[--p-bg-input] rounded-xl p-3">
              <div className="flex items-center gap-1.5 text-[--p-text-3] text-xs mb-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Aulas com KM
              </div>
              <p className="text-xl font-bold text-[--p-text-1]">{stats.aulasComKm}</p>
            </div>
          </div>
          {stats.kmInconsistencias > 0 && (
            <div className="flex items-center gap-2 text-xs text-amber-500">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              {stats.kmInconsistencias} registro(s) com KM inconsistente (sem KM inicial ou final menor que inicial).
            </div>
          )}
        </motion.div>
      )}

      {/* Aulas por período — barras agrupadas (concluídas / desmarcadas / faltas) */}
      <div className="bg-[--p-bg-card] border border-[--p-border] rounded-2xl p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-[--p-text-1] mb-4">
          <BarChart3 className="w-4 h-4 text-[--p-accent]" />
          {tituloSerie}
        </div>
        {stats.total === 0 ? (
          <p className="text-sm text-[--p-text-3] py-6 text-center">Nenhum agendamento neste período.</p>
        ) : (
          <div className="flex items-end gap-2 pb-2 overflow-x-auto" style={{ height: BAR_AREA_PX + 48 }}>
            {stats.serie.map((m, idx) => {
              const series = [
                { key: 'c', value: m.concluidas, cls: 'bg-emerald-500', label: 'concluídas' },
                { key: 'd', value: m.desmarcadas, cls: 'bg-rose-500', label: 'desmarcadas' },
                { key: 'f', value: m.faltas, cls: 'bg-amber-500', label: 'faltas' },
              ]
              return (
                <div key={idx} className="flex flex-1 min-w-[68px] flex-col items-center justify-end gap-2">
                  <div className="flex items-end justify-center gap-1.5 w-full" style={{ height: BAR_AREA_PX }}>
                    {series.map((s) => {
                      const h = s.value > 0 ? Math.max(Math.round((s.value / maxSerie) * BAR_AREA_PX), 4) : 0
                      return (
                        <div key={s.key} className="flex flex-col items-center justify-end gap-1" style={{ height: BAR_AREA_PX }}>
                          {s.value > 0 && <span className="text-[10px] font-semibold text-[--p-text-2]">{s.value}</span>}
                          <div
                            className={`w-4 sm:w-6 rounded-t-md ${s.cls}`}
                            style={{ height: h }}
                            title={`${m.label}: ${s.value} ${s.label}`}
                          />
                        </div>
                      )
                    })}
                  </div>
                  <span className="text-[11px] text-[--p-text-3] capitalize truncate max-w-full">{m.label}</span>
                </div>
              )
            })}
          </div>
        )}
        {stats.total > 0 && (
          <div className="flex items-center gap-4 mt-3 text-xs text-[--p-text-3]">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-500" /> Concluídas
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-rose-500" /> Desmarcadas
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-amber-500" /> Faltas
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
