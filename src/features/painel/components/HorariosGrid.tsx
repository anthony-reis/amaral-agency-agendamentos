'use client'

import { useState, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, Plus, Trash2, X, AlertCircle } from 'lucide-react'
import { criarHorario, toggleHorario, excluirHorario } from '../actions/horarios'
import type { HorarioDisponivel } from '../types'

interface Props {
  horarios: HorarioDisponivel[]
  instrutores: string[]
  autoescola_id: string
}

export function HorariosGrid({ horarios: initial, instrutores, autoescola_id }: Props) {
  const [horarios, setHorarios] = useState<HorarioDisponivel[]>(initial)
  const [isPending, startTransition] = useTransition()
  const [showForm, setShowForm] = useState(false)
  const [selectedInstrutor, setSelectedInstrutor] = useState<string | null>(null)
  const [novoHorario, setNovoHorario] = useState('')
  const [error, setError] = useState('')

  // Group by instructor (null = global)
  const groups = new Map<string, HorarioDisponivel[]>()
  groups.set('Global', [])
  for (const inst of instrutores) groups.set(inst, [])
  for (const h of horarios) {
    const key = h.instrutor ?? 'Global'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(h)
  }

  function handleToggle(id: string, ativo: boolean) {
    startTransition(async () => {
      const result = await toggleHorario(id, !ativo, autoescola_id)
      if (result.success) {
        setHorarios((prev) => prev.map((h) => h.id === id ? { ...h, ativo: !ativo } : h))
      }
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await excluirHorario(id, autoescola_id)
      if (result.success) setHorarios((prev) => prev.filter((h) => h.id !== id))
    })
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    startTransition(async () => {
      const result = await criarHorario(novoHorario, selectedInstrutor, autoescola_id)
      if (!result.success) { setError(result.error); return }
      setHorarios((prev) => [...prev, result.data])
      setNovoHorario('')
      setShowForm(false)
    })
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-[#0ea5e9]" />
          <div>
            <h1 className="text-xl font-bold text-[--p-text-1]">Horários</h1>
            <p className="text-sm text-[--p-text-3]">Gerencie os horários disponíveis por instrutor</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#0ea5e9] text-white text-sm font-semibold rounded-xl hover:bg-[#0284c7] transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Novo Horário
        </button>
      </div>

      {/* Add form */}
      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            onSubmit={handleCreate}
            className="flex flex-wrap items-end gap-3 p-4 bg-[--p-bg-card] border border-[--p-border] rounded-2xl"
          >
            <div>
              <label className="block text-xs text-[--p-text-3] mb-1">Instrutor</label>
              <select
                value={selectedInstrutor ?? ''}
                onChange={(e) => setSelectedInstrutor(e.target.value || null)}
                className="px-3 py-2.5 rounded-xl bg-[--p-bg-input] border border-[--p-border] text-sm text-[--p-text-1] focus:outline-none focus:ring-1 focus:ring-[#0ea5e9]/40"
              >
                <option value="">Global (todos)</option>
                {instrutores.map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div className="flex-1 min-w-[140px]">
              <label className="block text-xs text-[--p-text-3] mb-1">Horário</label>
              <input
                required
                type="text"
                placeholder="Ex: 08:00"
                value={novoHorario}
                onChange={(e) => setNovoHorario(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[--p-bg-input] border border-[--p-border] text-sm text-[--p-text-1] placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-[#0ea5e9]/40"
              />
            </div>
            {error && <p className="text-sm text-red-400 w-full">{error}</p>}
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2.5 bg-[#0ea5e9] text-white text-sm font-semibold rounded-xl hover:bg-[#0284c7] disabled:opacity-50"
            >
              Adicionar
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="p-2.5 text-[--p-text-3] hover:text-[--p-text-1]">
              <X className="w-4 h-4" />
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Groups */}
      <div className="space-y-4">
        {Array.from(groups.entries()).map(([instrutor, items]) => (
          <div key={instrutor} className="bg-[--p-bg-card] rounded-2xl border border-[--p-border] overflow-hidden">
            <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-[--p-border]">
              <div className="w-7 h-7 rounded-full bg-[#0ea5e9]/10 flex items-center justify-center">
                <span className="text-xs font-bold text-[#0ea5e9]">{instrutor.charAt(0)}</span>
              </div>
              <span className="text-sm font-semibold text-[--p-text-1]">{instrutor}</span>
              <span className="ml-auto text-xs text-[--p-text-3]">{items.length} horário{items.length !== 1 ? 's' : ''}</span>
            </div>

            {items.length === 0 ? (
              <p className="px-5 py-4 text-sm text-slate-600">Nenhum horário configurado.</p>
            ) : (
              <div className="p-4 flex flex-wrap gap-2">
                {items.sort((a, b) => a.ordem - b.ordem).map((h) => (
                  <div
                    key={h.id}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm font-medium transition-all ${
                      h.ativo
                        ? 'bg-[#0ea5e9]/10 border-[#0ea5e9]/20 text-[#0ea5e9]'
                        : 'bg-[--p-hover] border-[--p-border] text-[--p-text-3] line-through'
                    }`}
                  >
                    <button
                      onClick={() => handleToggle(h.id, h.ativo)}
                      disabled={isPending}
                      className="hover:scale-110 transition-transform"
                      title={h.ativo ? 'Desativar' : 'Ativar'}
                    >
                      {h.horario}
                    </button>
                    <button
                      onClick={() => handleDelete(h.id)}
                      disabled={isPending}
                      className="text-current opacity-40 hover:opacity-100 hover:text-red-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="text-xs text-slate-600 text-center">
        Clique no horário para ativar/desativar · Clique no × para excluir
      </p>
    </div>
  )
}
