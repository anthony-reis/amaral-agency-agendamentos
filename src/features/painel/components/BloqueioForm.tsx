'use client'

import { useState, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Ban, Plus, Trash2, Pencil, X, AlertCircle, Calendar, Clock, CalendarRange, CalendarDays, UserX, Clock3 } from 'lucide-react'
import { criarBloqueio, criarBloqueioSemanais, editarBloqueio, excluirBloqueio } from '../actions/bloqueios'
import type { BloqueioTimeSlot, GrupoBloqueioSemanal } from '../types'

const TIPOS = [
  { value: 'dia', label: 'Dia Inteiro', icon: Calendar },
  { value: 'horario', label: 'Horário Específico', icon: Clock },
  { value: 'intervalo', label: 'Intervalo de Datas', icon: CalendarRange },
  { value: 'semanal', label: 'Semanal / Anual', icon: CalendarDays },
] as const

const DIAS_SEMANA = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Segunda' },
  { value: 2, label: 'Terça' },
  { value: 3, label: 'Quarta' },
  { value: 4, label: 'Quinta' },
  { value: 5, label: 'Sexta' },
  { value: 6, label: 'Sábado' },
]

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

type GrupoUI = GrupoBloqueioSemanal & { id: number }

export function BloqueioForm({ bloqueios: initial, instrutores, autoescola_id }: Props) {
  const [bloqueios, setBloqueios] = useState<BloqueioTimeSlot[]>(initial)
  const [showForm, setShowForm] = useState(false)
  const [tipo, setTipo] = useState<'dia' | 'horario' | 'intervalo' | 'semanal'>('dia')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [form, setForm] = useState({
    date: '',
    date_start: '',
    date_end: '',
    time_slot: '',
    vehicle_type: 'TODOS',
    instructor: '' as string | null,
    reason: '',
  })

  // Estado de edição
  const [editingId, setEditingId] = useState<string | null>(null)

  function openEdit(b: BloqueioTimeSlot) {
    setEditingId(b.id)
    setError('')
    setSuccessMsg('')
    if (b.date === 'RECORRENTE_DIA_SEMANA') {
      setTipo('semanal')
      const wds = Array.isArray(b.weekdays) ? b.weekdays : []
      setSemanalDia(Number(wds[0] ?? 6))
      setSemanalVehicle(b.vehicle_type ?? 'TODOS')
      setSemanalReason(b.reason ?? '')
      const horarioCorte = b.time_slot?.startsWith('APOS_') ? b.time_slot.replace('APOS_', '') : undefined
      setGrupos([{
        id: 1,
        instrutores: b.instructor ? [b.instructor] : [],
        tipo: b.time_slot === 'DIA_INTEIRO' ? 'dia_inteiro' : 'apos_horario',
        horario_corte: horarioCorte,
      }])
    } else {
      const t = b.time_slot === 'DIA_INTEIRO' ? 'dia' : 'horario'
      setTipo(t)
      setForm({
        date: b.date ?? '',
        date_start: '',
        date_end: '',
        time_slot: b.time_slot === 'DIA_INTEIRO' ? '' : (b.time_slot ?? ''),
        vehicle_type: b.vehicle_type ?? 'TODOS',
        instructor: b.instructor ?? '',
        reason: b.reason ?? '',
      })
    }
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
    setError('')
  }

  // Estado para o modo semanal
  const [semanalDia, setSemanalDia] = useState(6)
  const [semanalVehicle, setSemanalVehicle] = useState('TODOS')
  const [semanalReason, setSemanalReason] = useState('')
  const [grupos, setGrupos] = useState<GrupoUI[]>([
    { id: 1, instrutores: [], tipo: 'dia_inteiro' },
  ])
  const nextGrupoId = () => Date.now()

  function addGrupo() {
    setGrupos((g) => [...g, { id: nextGrupoId(), instrutores: [], tipo: 'dia_inteiro' }])
  }

  function removeGrupo(id: number) {
    setGrupos((g) => g.filter((x) => x.id !== id))
  }

  function updateGrupo(id: number, patch: Partial<GrupoBloqueioSemanal>) {
    setGrupos((g) => g.map((x) => x.id === id ? { ...x, ...patch } : x))
  }

  function toggleInstrutor(grupoId: number, name: string) {
    setGrupos((g) => g.map((x) => {
      if (x.id !== grupoId) return x
      const has = x.instrutores.includes(name)
      return { ...x, instrutores: has ? x.instrutores.filter((i) => i !== name) : [...x.instrutores, name] }
    }))
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccessMsg('')

    if (tipo === 'semanal') {
      if (grupos.length === 0) { setError('Adicione ao menos um grupo.'); return }
      for (const g of grupos) {
        if (g.tipo === 'apos_horario' && !g.horario_corte) {
          setError('Informe o horário de corte em todos os grupos "Após horário".'); return
        }
      }

      if (editingId) {
        // Edição de bloco recorrente individual
        const grupo = grupos[0]
        const time_slot = grupo.tipo === 'dia_inteiro' ? 'DIA_INTEIRO' : `APOS_${grupo.horario_corte}`
        startTransition(async () => {
          const result = await editarBloqueio(editingId, {
            time_slot,
            vehicle_type: semanalVehicle,
            instructor: grupo.instrutores[0] ?? null,
            reason: semanalReason || 'Bloqueio recorrente',
            weekdays: [semanalDia] as unknown as string[],
          }, autoescola_id)
          if (!result.success) { setError(result.error); return }
          setBloqueios((prev) => prev.map((b) => b.id === editingId
            ? { ...b, time_slot, vehicle_type: semanalVehicle, instructor: grupo.instrutores[0] ?? null, reason: semanalReason }
            : b
          ))
          setSuccessMsg('Bloqueio atualizado.')
          closeForm()
        })
        return
      }

      startTransition(async () => {
        const result = await criarBloqueioSemanais({
          dia_semana: semanalDia,
          grupos: grupos.map(({ id: _id, ...g }) => g),
          vehicle_type: semanalVehicle,
          reason: semanalReason || 'Bloqueio recorrente',
          autoescola_id,
        })
        if (!result.success) { setError(result.error); return }
        setBloqueios((prev) => [...result.data.registros, ...prev])
        setSuccessMsg(`${result.data.total} bloqueio(s) recorrente(s) criado(s).`)
        closeForm()
      })
      return
    }

    if (editingId) {
      startTransition(async () => {
        const result = await editarBloqueio(editingId, {
          time_slot: tipo === 'dia' ? 'DIA_INTEIRO' : (form.time_slot || undefined),
          vehicle_type: form.vehicle_type,
          instructor: form.instructor || null,
          reason: form.reason,
        }, autoescola_id)
        if (!result.success) { setError(result.error); return }
        setBloqueios((prev) => prev.map((b) => b.id === editingId
          ? { ...b, time_slot: tipo === 'dia' ? 'DIA_INTEIRO' : form.time_slot, vehicle_type: form.vehicle_type, instructor: form.instructor || null, reason: form.reason }
          : b
        ))
        setSuccessMsg('Bloqueio atualizado.')
        closeForm()
      })
      return
    }

    startTransition(async () => {
      const result = await criarBloqueio({
        tipo: tipo as 'dia' | 'horario' | 'intervalo',
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
      closeForm()
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
          onClick={() => { setEditingId(null); setShowForm((v) => !v) }}
          className="flex items-center gap-2 px-4 py-2.5 bg-red-500 text-white text-sm font-semibold rounded-xl hover:bg-red-600 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Novo Bloqueio
        </button>
      </div>

      {/* Success toast */}
      <AnimatePresence>
        {successMsg && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-2 px-4 py-3 bg-green-500/10 border border-green-500/20 rounded-xl text-sm text-green-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {successMsg}
            <button type="button" onClick={() => setSuccessMsg('')} className="ml-auto"><X className="w-3.5 h-3.5" /></button>
          </motion.div>
        )}
      </AnimatePresence>

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
              <h3 className="text-sm font-semibold text-[--p-text-1]">
                {editingId ? 'Editar Bloqueio' : 'Novo Bloqueio'}
              </h3>
              <button type="button" onClick={closeForm} className="text-[--p-text-3] hover:text-[--p-text-1]">
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

              {tipo !== 'semanal' && (
                <>
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
                </>
              )}
            </div>

            {/* Semanal/Recorrente */}
            {tipo === 'semanal' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[--p-text-3] mb-1">Dia da Semana</label>
                    <select
                      value={semanalDia}
                      onChange={(e) => setSemanalDia(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-[--p-bg-input] border border-[--p-border] text-sm text-[--p-text-1] focus:outline-none focus:ring-1 focus:ring-red-400/40"
                    >
                      {DIAS_SEMANA.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[--p-text-3] mb-1">Veículo</label>
                    <select value={semanalVehicle} onChange={(e) => setSemanalVehicle(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[--p-bg-input] border border-[--p-border] text-sm text-[--p-text-1] focus:outline-none focus:ring-1 focus:ring-red-400/40">
                      <option value="TODOS">TODOS</option>
                      <option value="CARRO">CARRO</option>
                      <option value="MOTO">MOTO</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-[--p-text-3] mb-1">Motivo</label>
                    <input type="text" placeholder="Ex: Sábado - não atende" value={semanalReason} onChange={(e) => setSemanalReason(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[--p-bg-input] border border-[--p-border] text-sm text-[--p-text-1] placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-red-400/40" />
                  </div>
                </div>

                {/* Grupos de instrutores */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-[--p-text-2]">Grupos de Instrutores</p>
                    <button type="button" onClick={addGrupo}
                      className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 font-medium">
                      <Plus className="w-3 h-3" /> Adicionar grupo
                    </button>
                  </div>

                  {grupos.map((grupo, idx) => (
                    <div key={grupo.id} className="rounded-xl border border-[--p-border] bg-[--p-bg-input] p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-[--p-text-2]">Grupo {idx + 1}</span>
                        {grupos.length > 1 && (
                          <button type="button" onClick={() => removeGrupo(grupo.id)} className="text-[--p-text-3] hover:text-red-400">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Tipo do grupo */}
                      <div className="flex gap-2">
                        <button type="button"
                          onClick={() => updateGrupo(grupo.id, { tipo: 'dia_inteiro' })}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${grupo.tipo === 'dia_inteiro' ? 'bg-red-500 text-white' : 'bg-[--p-hover] text-[--p-text-3] hover:text-[--p-text-1]'}`}>
                          <UserX className="w-3 h-3" /> Dia inteiro
                        </button>
                        <button type="button"
                          onClick={() => updateGrupo(grupo.id, { tipo: 'apos_horario' })}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${grupo.tipo === 'apos_horario' ? 'bg-red-500 text-white' : 'bg-[--p-hover] text-[--p-text-3] hover:text-[--p-text-1]'}`}>
                          <Clock3 className="w-3 h-3" /> Após horário
                        </button>
                      </div>

                      {/* Horário de corte */}
                      {grupo.tipo === 'apos_horario' && (
                        <div>
                          <label className="block text-xs text-[--p-text-3] mb-1">Bloquear a partir de (inclusive)</label>
                          <input type="time" value={grupo.horario_corte ?? ''} onChange={(e) => updateGrupo(grupo.id, { horario_corte: e.target.value })}
                            className="w-32 px-3 py-1.5 rounded-lg bg-[--p-bg-input] border border-[--p-border] text-sm text-[--p-text-1] focus:outline-none focus:ring-1 focus:ring-red-400/40" />
                        </div>
                      )}

                      {/* Seleção de instrutores */}
                      <div>
                        <label className="block text-xs text-[--p-text-3] mb-1.5">
                          Instrutores <span className="text-slate-500">(nenhum selecionado = todos)</span>
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {instrutores.map((name) => {
                            const sel = grupo.instrutores.includes(name)
                            return (
                              <button key={name} type="button" onClick={() => toggleInstrutor(grupo.id, name)}
                                className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors ${sel ? 'bg-red-500 text-white' : 'bg-[--p-hover] text-[--p-text-3] hover:text-[--p-text-1]'}`}>
                                {name.split(' - ')[0]}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-400">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <button type="button" onClick={closeForm} className="px-4 py-2 text-sm text-[--p-text-3] hover:text-[--p-text-1]">
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="px-5 py-2 bg-red-500 text-white text-sm font-semibold rounded-xl hover:bg-red-600 disabled:opacity-50"
              >
                {isPending ? (editingId ? 'Salvando…' : 'Criando…') : (editingId ? 'Salvar' : 'Criar Bloqueio')}
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
                    {b.time_slot === 'DIA_INTEIRO' ? (
                      <span className="px-2 py-0.5 bg-red-500/10 text-red-400 text-xs font-medium rounded-md">Dia inteiro</span>
                    ) : b.time_slot?.startsWith('APOS_') ? (
                      <span className="px-2 py-0.5 bg-orange-500/10 text-orange-400 text-xs font-medium rounded-md">
                        Após {b.time_slot.replace('APOS_', '')}
                      </span>
                    ) : (
                      <span className="text-slate-300">{b.time_slot}</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-[--p-text-2]">{b.instructor ?? 'Todos'}</td>
                  <td className="px-4 py-3.5">
                    <span className="px-2 py-0.5 text-xs font-medium rounded-md bg-[--p-hover] text-[--p-text-3]">
                      {b.vehicle_type}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-[--p-text-3] max-w-[200px] truncate">{b.reason}</td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(b)}
                        disabled={isPending}
                        className="p-1.5 text-[--p-text-3] hover:text-blue-400 hover:bg-blue-400/5 rounded-lg transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(b.id)}
                        disabled={isPending}
                        className="p-1.5 text-[--p-text-3] hover:text-red-400 hover:bg-red-400/5 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
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
