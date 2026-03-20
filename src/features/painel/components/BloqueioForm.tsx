'use client'

import { useState, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Ban, Plus, Trash2, X, AlertCircle, Calendar, Clock, CalendarRange } from 'lucide-react'
import { criarBloqueio, excluirBloqueio } from '../actions/bloqueios'
import type { BloqueioTimeSlot } from '../types'

const TIPOS = [
  { value: 'dia', label: 'Dia Inteiro', icon: Calendar },
  { value: 'horario', label: 'Horário Específico', icon: Clock },
  { value: 'intervalo', label: 'Intervalo de Datas', icon: CalendarRange },
] as const

const DIAS_PT: Record<string, string> = {
  sunday: 'Dom', monday: 'Seg', tuesday: 'Ter', wednesday: 'Qua',
  thursday: 'Qui', friday: 'Sex', saturday: 'Sáb',
}

function parseWeekdays(weekdays: unknown): string[] {
  if (!weekdays) return []
  if (Array.isArray(weekdays)) return weekdays as string[]
  if (typeof weekdays === 'object') {
    // Handle {"monday": true, "tuesday": false, ...}
    return Object.entries(weekdays as Record<string, unknown>)
      .filter(([, v]) => v)
      .map(([k]) => k)
  }
  return []
}

function formatDate(b: BloqueioTimeSlot) {
  const d = b.date
  if (!d || d === 'DIA_INTEIRO') return '—'
  if (d === 'RECORRENTE_DIA_SEMANA') {
    const dias = parseWeekdays(b.weekdays).map((w) => { const s = String(w).toLowerCase(); return DIAS_PT[s] ?? s }).join(', ')
    return dias ? `Semanal (${dias})` : 'Recorrente semanal'
  }
  // range: date might be stored as "YYYY-MM-DD" or "YYYY-MM-DD/YYYY-MM-DD"
  if (d.includes('/')) {
    const [start, end] = d.split('/')
    return `${formatSingle(start)} – ${formatSingle(end)}`
  }
  return formatSingle(d)
}

function formatSingle(d: string) {
  const parts = d.split('-')
  if (parts.length !== 3) return d
  const [y, m, day] = parts
  return `${day}/${m}/${y}`
}

interface Props {
  bloqueios: BloqueioTimeSlot[]
  instrutores: string[]
  autoescola_id: string
}

export function BloqueioForm({ bloqueios: initial, instrutores, autoescola_id }: Props) {
  const [bloqueios, setBloqueios] = useState<BloqueioTimeSlot[]>(initial)
  const [showForm, setShowForm] = useState(false)
  const [tipo, setTipo] = useState<'dia' | 'horario' | 'intervalo'>('dia')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    date: '',
    date_start: '',
    date_end: '',
    time_slot: '',
    vehicle_type: 'TODOS',
    instructor: '' as string | null,
    reason: '',
  })

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    startTransition(async () => {
      const result = await criarBloqueio({
        tipo,
        date: form.date || undefined,
        date_start: form.date_start || undefined,
        date_end: form.date_end || undefined,
        time_slot: form.time_slot || undefined,
        vehicle_type: form.vehicle_type,
        instructor: form.instructor || null,
        reason: form.reason,
        autoescola_id,
      })
      if (!result.success) { setError(result.error); return }
      setBloqueios((prev) => [...result.data, ...prev])
      setShowForm(false)
      setForm({ date: '', date_start: '', date_end: '', time_slot: '', vehicle_type: 'TODOS', instructor: '', reason: '' })
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await excluirBloqueio(id, autoescola_id)
      if (result.success) setBloqueios((prev) => prev.filter((b) => b.id !== id))
    })
  }

  const TipoIcon = TIPOS.find((t) => t.value === tipo)?.icon ?? Calendar

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Ban className="w-5 h-5 text-red-400" />
          <div>
            <h1 className="text-xl font-bold text-[--p-text-1]">Bloqueios</h1>
            <p className="text-sm text-[--p-text-3]">{bloqueios.length} bloqueio{bloqueios.length !== 1 ? 's' : ''} ativo{bloqueios.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 px-4 py-2.5 bg-red-500 text-white text-sm font-semibold rounded-xl hover:bg-red-600 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Novo Bloqueio
        </button>
      </div>

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            onSubmit={handleCreate}
            className="bg-[--p-bg-card] rounded-2xl border border-[--p-border] p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[--p-text-1]">Novo Bloqueio</h3>
              <button type="button" onClick={() => setShowForm(false)} className="text-[--p-text-3] hover:text-[--p-text-1]">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tipo tabs */}
            <div className="flex gap-2">
              {TIPOS.map((t) => {
                const Icon = t.icon
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setTipo(t.value)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      tipo === t.value
                        ? 'bg-red-500 text-[--p-text-1]'
                        : 'bg-[--p-hover] text-[--p-text-3] hover:text-[--p-text-1] hover:bg-[--p-hover]'
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    {t.label}
                  </button>
                )
              })}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {tipo === 'dia' && (
                <div>
                  <label className="block text-xs text-[--p-text-3] mb-1">Data</label>
                  <input
                    type="date"
                    required
                    value={form.date}
                    onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-[--p-bg-input] border border-[--p-border] text-sm text-[--p-text-1] focus:outline-none focus:ring-1 focus:ring-red-400/40"
                  />
                </div>
              )}

              {tipo === 'horario' && (
                <>
                  <div>
                    <label className="block text-xs text-[--p-text-3] mb-1">Data</label>
                    <input
                      type="date"
                      required
                      value={form.date}
                      onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-[--p-bg-input] border border-[--p-border] text-sm text-[--p-text-1] focus:outline-none focus:ring-1 focus:ring-red-400/40"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[--p-text-3] mb-1">Horário</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: 08:00"
                      value={form.time_slot}
                      onChange={(e) => setForm((p) => ({ ...p, time_slot: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-[--p-bg-input] border border-[--p-border] text-sm text-[--p-text-1] focus:outline-none focus:ring-1 focus:ring-red-400/40"
                    />
                  </div>
                </>
              )}

              {tipo === 'intervalo' && (
                <>
                  <div>
                    <label className="block text-xs text-[--p-text-3] mb-1">Data Início</label>
                    <input
                      type="date"
                      required
                      value={form.date_start}
                      onChange={(e) => setForm((p) => ({ ...p, date_start: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-[--p-bg-input] border border-[--p-border] text-sm text-[--p-text-1] focus:outline-none focus:ring-1 focus:ring-red-400/40"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[--p-text-3] mb-1">Data Fim</label>
                    <input
                      type="date"
                      required
                      value={form.date_end}
                      onChange={(e) => setForm((p) => ({ ...p, date_end: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-[--p-bg-input] border border-[--p-border] text-sm text-[--p-text-1] focus:outline-none focus:ring-1 focus:ring-red-400/40"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[--p-text-3] mb-1">Horário (opcional)</label>
                    <input
                      type="text"
                      placeholder="Ex: 08:00 (ou deixe vazio para dia inteiro)"
                      value={form.time_slot}
                      onChange={(e) => setForm((p) => ({ ...p, time_slot: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-[--p-bg-input] border border-[--p-border] text-sm text-[--p-text-1] placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-red-400/40"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs text-[--p-text-3] mb-1">Instrutor</label>
                <select
                  value={form.instructor ?? ''}
                  onChange={(e) => setForm((p) => ({ ...p, instructor: e.target.value || null }))}
                  className="w-full px-3 py-2 rounded-xl bg-[--p-bg-input] border border-[--p-border] text-sm text-[--p-text-1] focus:outline-none focus:ring-1 focus:ring-red-400/40"
                >
                  <option value="">Todos os instrutores</option>
                  {instrutores.map((i) => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs text-[--p-text-3] mb-1">Tipo de Veículo</label>
                <select
                  value={form.vehicle_type}
                  onChange={(e) => setForm((p) => ({ ...p, vehicle_type: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-[--p-bg-input] border border-[--p-border] text-sm text-[--p-text-1] focus:outline-none focus:ring-1 focus:ring-red-400/40"
                >
                  <option value="TODOS">TODOS</option>
                  <option value="CARRO">CARRO</option>
                  <option value="MOTO">MOTO</option>
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-xs text-[--p-text-3] mb-1">Motivo</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Falta do instrutor, manutenção..."
                  value={form.reason}
                  onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-[--p-bg-input] border border-[--p-border] text-sm text-[--p-text-1] placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-red-400/40"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-400">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-[--p-text-3] hover:text-[--p-text-1]">
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="px-5 py-2 bg-red-500 text-white text-sm font-semibold rounded-xl hover:bg-red-600 disabled:opacity-50"
              >
                {isPending ? 'Criando…' : 'Criar Bloqueio'}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* List */}
      {bloqueios.length === 0 ? (
        <div className="text-center py-16 bg-[--p-bg-card] rounded-2xl border border-[--p-border]">
          <Ban className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-[--p-text-3] font-medium">Nenhum bloqueio ativo</p>
          <p className="text-slate-600 text-sm mt-1">Clique em "Novo Bloqueio" para adicionar.</p>
        </div>
      ) : (
        <div className="bg-[--p-bg-card] rounded-2xl border border-[--p-border] overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="sticky top-0 z-10 bg-[--p-bg-card]">
              <tr className="border-b border-[--p-border]">
                <th className="text-left text-xs font-semibold text-[--p-text-3] uppercase px-6 py-3.5">Data</th>
                <th className="text-left text-xs font-semibold text-[--p-text-3] uppercase px-4 py-3.5">Horário</th>
                <th className="text-left text-xs font-semibold text-[--p-text-3] uppercase px-4 py-3.5">Instrutor</th>
                <th className="text-left text-xs font-semibold text-[--p-text-3] uppercase px-4 py-3.5">Veículo</th>
                <th className="text-left text-xs font-semibold text-[--p-text-3] uppercase px-4 py-3.5">Motivo</th>
                <th className="px-4 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[--p-border]">
              {bloqueios.map((b) => (
                <tr key={b.id} className="hover:bg-[--p-hover] transition-colors">
                  <td className="px-6 py-3.5 text-[--p-text-1] font-medium">{formatDate(b)}</td>
                  <td className="px-4 py-3.5">
                    <span className="text-slate-300">
                      {b.time_slot === 'DIA_INTEIRO' ? (
                        <span className="px-2 py-0.5 bg-red-500/10 text-red-400 text-xs font-medium rounded-md">Dia inteiro</span>
                      ) : b.time_slot}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-[--p-text-2]">{b.instructor ?? 'Todos'}</td>
                  <td className="px-4 py-3.5">
                    <span className="px-2 py-0.5 text-xs font-medium rounded-md bg-[--p-hover] text-[--p-text-3]">
                      {b.vehicle_type}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-[--p-text-3] max-w-[200px] truncate">{b.reason}</td>
                  <td className="px-4 py-3.5 text-right">
                    <button
                      onClick={() => handleDelete(b.id)}
                      disabled={isPending}
                      className="p-1.5 text-[--p-text-3] hover:text-red-400 hover:bg-red-400/5 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  )
}
