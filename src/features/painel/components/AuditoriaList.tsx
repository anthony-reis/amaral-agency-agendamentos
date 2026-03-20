'use client'

import { useState, useTransition } from 'react'
import { motion } from 'framer-motion'
import { Activity, Search, Filter, Download, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { listarLogs, getLogStats } from '../actions/auditoria'
import type { LogAtividade, LogStats } from '../types'

const ACTION_LABELS: Record<string, { label: string; cls: string }> = {
  login:        { label: 'Login', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400' },
  logout:       { label: 'Logout', cls: 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-400' },
  usuario:      { label: 'Usuário', cls: 'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-300' },
  usuarios:     { label: 'Usuário', cls: 'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-300' },
  agendamento:  { label: 'Agendamento', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' },
  agendamentos: { label: 'Agendamento', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' },
  credito:      { label: 'Crédito', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' },
  creditos:     { label: 'Crédito', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' },
  aluno:        { label: 'Aluno', cls: 'bg-teal-100 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400' },
  alunos:       { label: 'Aluno', cls: 'bg-teal-100 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400' },
  bloqueio:     { label: 'Bloqueio', cls: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400' },
  bloqueios:    { label: 'Bloqueio', cls: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400' },
}

const PAGE_SIZE = 30

function getRelativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3600000)
  if (h < 1) return `Há ${Math.max(1, Math.floor(diff / 60000))}min`
  if (h < 24) return `Há ${h}h`
  const d = Math.floor(h / 24)
  return `Há ${d} dia${d !== 1 ? 's' : ''}`
}

function initials(username: string) {
  const parts = username.split(/[\s._-]/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return username.slice(0, 2).toUpperCase()
}

interface Props {
  autoescola_id: string
  initialData: LogAtividade[]
  initialStats: LogStats
  initialTotal: number
  usuarios: string[]
  dateStart: string
  dateEnd: string
}

export function AuditoriaList({ autoescola_id, initialData, initialStats, initialTotal, usuarios, dateStart: initStart, dateEnd: initEnd }: Props) {
  const [logs, setLogs] = useState<LogAtividade[]>(initialData)
  const [stats, setStats] = useState<LogStats>(initialStats)
  const [total, setTotal] = useState(initialTotal)
  const [page, setPage] = useState(0)
  const [isPending, startTransition] = useTransition()

  const [filters, setFilters] = useState({
    dateStart: initStart,
    dateEnd: initEnd,
    username: 'TODOS',
    action_type: 'TODAS',
    search: '',
  })

  function getPresetDates(preset: 'today' | '7d' | '30d') {
    const today = new Date().toISOString().split('T')[0]
    if (preset === 'today') return { dateStart: today, dateEnd: today }
    const ago = (days: number) => new Date(Date.now() - days * 86400000).toISOString().split('T')[0]
    if (preset === '7d') return { dateStart: ago(7), dateEnd: today }
    return { dateStart: ago(30), dateEnd: today }
  }

  async function fetchPage(f: typeof filters, p: number) {
    const [data, newStats] = await Promise.all([
      listarLogs({
        autoescola_id,
        dateStart: f.dateStart,
        dateEnd: f.dateEnd,
        username: f.username !== 'TODOS' ? f.username : undefined,
        action_type: f.action_type !== 'TODAS' ? f.action_type : undefined,
        search: f.search || undefined,
        limit: PAGE_SIZE,
        offset: p * PAGE_SIZE,
      }),
      getLogStats(autoescola_id, f.dateStart, f.dateEnd),
    ])
    setLogs(data.data)
    setTotal(data.total)
    setStats(newStats)
    setPage(p)
  }

  function applyFilters() {
    startTransition(() => fetchPage(filters, 0))
  }

  function applyPreset(preset: 'today' | '7d' | '30d') {
    const dates = getPresetDates(preset)
    const newFilters = { ...filters, ...dates }
    setFilters(newFilters)
    startTransition(() => fetchPage(newFilters, 0))
  }

  function handleExportCSV() {
    const header = 'Data,Usuário,Tipo,Descrição'
    const rows = logs.map((l) => [
      new Date(l.created_at).toLocaleString('pt-BR'),
      l.username,
      l.action_type,
      `"${l.description.replace(/"/g, '""')}"`,
    ].join(','))
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `auditoria-${filters.dateStart}-${filters.dateEnd}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const inputCls = 'w-full px-3 py-2 rounded-xl bg-[--p-bg-input] border border-[--p-border] text-sm text-[--p-text-1] placeholder:text-[--p-text-3] focus:outline-none focus:ring-1 focus:ring-[#0ea5e9]/40'

  const STAT_CARDS = [
    { label: 'Total', value: stats.total, cls: 'text-[--p-text-1]' },
    { label: 'Logins', value: stats.logins, cls: 'text-blue-500' },
    { label: 'Usuários', value: stats.usuarios, cls: 'text-purple-400' },
    { label: 'Agendamentos', value: stats.agendamentos, cls: 'text-emerald-400' },
    { label: 'Créditos', value: stats.creditos, cls: 'text-amber-400' },
    { label: 'Alunos', value: stats.alunos, cls: 'text-teal-400' },
    { label: 'Bloqueios', value: stats.bloqueios, cls: 'text-red-400' },
  ]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Activity className="w-5 h-5 text-[#0ea5e9]" />
        <div>
          <h1 className="text-xl font-bold text-[--p-text-1]">Auditoria de Atividades</h1>
          <p className="text-sm text-[--p-text-3]">Monitore todas as ações realizadas no sistema</p>
        </div>
        <div className="ml-auto">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-[--p-text-2] border border-[--p-border] rounded-xl hover:bg-[--p-hover] transition-colors bg-[--p-bg-card]"
          >
            <Download className="w-4 h-4" />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {STAT_CARDS.map((s) => (
          <div key={s.label} className="bg-[--p-bg-card] rounded-xl border border-[--p-border] p-3">
            <p className="text-xs text-[--p-text-3] mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.cls}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-[--p-bg-card] rounded-2xl border border-[--p-border] p-5 space-y-3">
        {/* Presets */}
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { key: 'today' as const, label: 'Hoje' },
            { key: '7d' as const, label: 'Últimos 7 dias' },
            { key: '30d' as const, label: 'Últimos 30 dias' },
          ].map((p) => (
            <button
              key={p.key}
              onClick={() => applyPreset(p.key)}
              disabled={isPending}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[--p-border] text-[--p-text-2] hover:bg-[--p-hover] transition-colors disabled:opacity-50"
            >
              {p.label}
            </button>
          ))}
          {filters.search || filters.username !== 'TODOS' || filters.action_type !== 'TODAS' ? (
            <button
              onClick={() => {
                const reset = { ...filters, search: '', username: 'TODOS', action_type: 'TODAS' }
                setFilters(reset)
                startTransition(() => fetchPage(reset, 0))
              }}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-[--p-border] text-red-400 hover:bg-red-500/5 transition-colors"
            >
              <X className="w-3 h-3" />
              Limpar Filtros
            </button>
          ) : null}
        </div>

        {/* Advanced filters */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="col-span-2 lg:col-span-1">
            <label className="block text-xs text-[--p-text-3] mb-1">Buscar</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[--p-text-3]" />
              <input
                type="text"
                placeholder="Descrição..."
                value={filters.search}
                onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
                className={`${inputCls} pl-8`}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-[--p-text-3] mb-1">Data Início</label>
            <input type="date" value={filters.dateStart} onChange={(e) => setFilters((p) => ({ ...p, dateStart: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs text-[--p-text-3] mb-1">Data Fim</label>
            <input type="date" value={filters.dateEnd} onChange={(e) => setFilters((p) => ({ ...p, dateEnd: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs text-[--p-text-3] mb-1">Usuário</label>
            <select value={filters.username} onChange={(e) => setFilters((p) => ({ ...p, username: e.target.value }))} className={inputCls}>
              <option value="TODOS">TODOS</option>
              {usuarios.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-[--p-text-3] mb-1">Tipo de Ação</label>
            <select value={filters.action_type} onChange={(e) => setFilters((p) => ({ ...p, action_type: e.target.value }))} className={inputCls}>
              <option value="TODAS">TODAS</option>
              {['login', 'logout', 'agendamento', 'credito', 'aluno', 'bloqueio', 'usuario'].map((t) => (
                <option key={t} value={t}>{ACTION_LABELS[t]?.label ?? t}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex justify-end">
          <button onClick={applyFilters} disabled={isPending} className="px-4 py-2 bg-[#0ea5e9] text-white text-sm font-semibold rounded-xl hover:bg-[#0284c7] disabled:opacity-50 transition-colors">
            {isPending ? 'Carregando…' : 'Aplicar'}
          </button>
        </div>
      </div>

      {/* Feed */}
      {logs.length === 0 ? (
        <div className="text-center py-16 bg-[--p-bg-card] rounded-2xl border border-[--p-border]">
          <Activity className="w-10 h-10 text-[--p-text-3] mx-auto mb-3" />
          <p className="text-[--p-text-2] font-medium">Nenhuma atividade encontrada</p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log, idx) => {
            const badge = ACTION_LABELS[log.action_type] ?? { label: log.action_type, cls: 'bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-400' }
            return (
              <motion.div
                key={log.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: idx * 0.01 }}
                className="flex items-center gap-4 px-4 py-3.5 bg-[--p-bg-card] rounded-xl border border-[--p-border] hover:bg-[--p-hover] transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-[#0ea5e9]/20 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-[#0ea5e9]">{initials(log.username)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[--p-text-1]">
                    <span className="font-semibold">{log.username}</span>
                    {' · '}
                    <span className="text-[--p-text-2]">{log.description}</span>
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${badge.cls}`}>
                    {badge.label}
                  </span>
                  <span className="text-xs text-[--p-text-3]">{getRelativeTime(log.created_at)}</span>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-[--p-text-3]">
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} de {total}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => startTransition(() => fetchPage(filters, page - 1))}
              disabled={page === 0 || isPending}
              className="p-2 rounded-lg bg-[--p-hover] text-[--p-text-3] hover:text-[--p-text-1] disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => startTransition(() => fetchPage(filters, page + 1))}
              disabled={page >= totalPages - 1 || isPending}
              className="p-2 rounded-lg bg-[--p-hover] text-[--p-text-3] hover:text-[--p-text-1] disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
