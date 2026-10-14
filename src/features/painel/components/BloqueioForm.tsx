'use client'

import { useMemo, useState, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Ban, Plus, Trash2, Pencil, X, AlertCircle, Calendar, Clock, CalendarRange, CalendarDays, Search } from 'lucide-react'
import { criarBloqueio, criarBloqueioSemanalVarios, editarBloqueio, excluirBloqueio, atualizarBloqueioSemanal, limparBloqueiosOrfaos } from '../actions/bloqueios'
import { BloqueioSemanalCampos, tipoDoTimeSlot, type CamposBloqueioSemanal } from './BloqueioSemanalCampos'
import { canEditPainel, type BloqueioTimeSlot } from '../types'

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


// ─── Lista: filtros e agrupamento ─────────────────────────────────────────────

const NOMES_DIA = ['', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const NOME_EN: Record<string, number> = { monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6, sunday: 7 }
const TODOS_INSTR = '__todos__'
const POR_PAGINA = 40

const ehSemanal = (b: BloqueioTimeSlot) => b.date === 'RECORRENTE_DIA_SEMANA'
const instrutorDe = (b: BloqueioTimeSlot) => (!b.instructor || b.instructor.trim().toUpperCase() === 'TODOS' ? null : b.instructor)
const primeiroNome = (n: string) => n.split(' - ')[0].trim()
const dataInicio = (b: BloqueioTimeSlot) => (b.date ?? '').split('/')[0]

/** Dias da semana (ISO 1–7) de um bloqueio recorrente: aceita [1,2], "[1,2]", [0] (domingo) e nomes em inglês. */
function diasIso(b: BloqueioTimeSlot): number[] {
  let w: unknown = b.weekdays
  if (typeof w === 'string') { try { w = JSON.parse(w) } catch { w = [] } }
  let lista: unknown[] = []
  if (Array.isArray(w)) lista = w
  else if (w && typeof w === 'object') lista = Object.entries(w as Record<string, unknown>).filter(([, v]) => v).map(([k]) => k)
  const out = lista.map((x) => {
    if (typeof x === 'string' && NOME_EN[x.toLowerCase()]) return NOME_EN[x.toLowerCase()]
    const n = Number(x)
    return n === 0 ? 7 : n
  }).filter((n) => n >= 1 && n <= 7)
  return [...new Set(out)].sort()
}

function resumoDiasIso(d: number[]): string {
  if (d.length === 0) return 'Semanal'
  if (d.length === 7) return 'Seg–Dom'
  if (d.join() === '1,2,3,4,5') return 'Seg–Sex'
  if (d.join() === '6,7') return 'Sáb e Dom'
  return d.map((x) => NOMES_DIA[x]).join(', ')
}

function rotuloHorario(t: string): { texto: string; tom: 'dia' | 'apos' | 'hora' } {
  if (t === 'DIA_INTEIRO' || t === 'TODOS') return { texto: 'Dia inteiro', tom: 'dia' }
  if (t?.startsWith('APOS_')) return { texto: `A partir das ${t.slice(5)}`, tom: 'apos' }
  return { texto: t, tom: 'hora' }
}

function rotuloDia(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y) return iso
  const dow = new Date(y, m - 1, d).getDay()
  return `${['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][dow]}, ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`
}

function rotuloMes(chave: string): string {
  const [y, m] = chave.split('-').map(Number)
  return m ? `${MESES[m - 1][0].toUpperCase()}${MESES[m - 1].slice(1)} de ${y}` : chave
}

function Selo({ b }: { b: BloqueioTimeSlot }) {
  const r = rotuloHorario(b.time_slot)
  const cls = r.tom === 'dia' ? 'bg-red-500/10 text-red-400' : r.tom === 'apos' ? 'bg-orange-500/10 text-orange-400' : 'bg-[--p-hover] text-[--p-text-1]'
  return <span className={`px-2 py-0.5 text-xs font-medium rounded-md tabular-nums whitespace-nowrap ${cls}`}>{r.texto}</span>
}

type Aba = 'proximos' | 'semanais' | 'passados' | 'todos'

interface Props {
  bloqueios: BloqueioTimeSlot[]
  hoje: string
  instrutores: string[]
  autoescola_id: string
  userRole: string
}

export function BloqueioForm({ bloqueios: initial, hoje, instrutores, autoescola_id, userRole }: Props) {
  const canEdit = canEditPainel(userRole)
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

  const [confirmarLimpeza, setConfirmarLimpeza] = useState(false)

  // Filtros da lista
  const [aba, setAba] = useState<Aba>('proximos')
  const [fInstrutor, setFInstrutor] = useState('')
  const [fVeiculo, setFVeiculo] = useState('')
  const [fBusca, setFBusca] = useState('')
  const [fDe, setFDe] = useState('')
  const [fAte, setFAte] = useState('')
  const [limite, setLimite] = useState(POR_PAGINA)

  // Edição de bloqueio semanal (vários dias, tipo, horário, motivo, instrutor, veículo)
  const [edSem, setEdSem] = useState<CamposBloqueioSemanal & { instrutor: string; vehicle: string }>({
    tipo: 'dia_inteiro', horario: '', dias: [6], reason: '', instrutor: '', vehicle: 'TODOS',
  })

  // Estado de edição
  const [editingId, setEditingId] = useState<string | null>(null)

  function openEdit(b: BloqueioTimeSlot) {
    setEditingId(b.id)
    setError('')
    setSuccessMsg('')
    if (b.date === 'RECORRENTE_DIA_SEMANA') {
      setTipo('semanal')
      setEdSem({
        ...tipoDoTimeSlot(b.time_slot),
        dias: diasIso(b),
        reason: b.reason ?? '',
        instrutor: instrutorDe(b) ?? '',
        vehicle: b.vehicle_type ?? 'TODOS',
      })
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
    setEdSem({ tipo: 'dia_inteiro', horario: '', dias: [6], reason: '', instrutor: '', vehicle: 'TODOS' })
  }

  // Instrutores escolhidos na criação de bloqueio semanal (nenhum = todos)
  const [semInstrs, setSemInstrs] = useState<string[]>([])

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccessMsg('')

    if (tipo === 'semanal' && editingId) {
      startTransition(async () => {
        const result = await atualizarBloqueioSemanal(editingId, {
          dias: edSem.dias, tipo: edSem.tipo, horario: edSem.horario, reason: edSem.reason,
          instrutor: edSem.instrutor || null, vehicle_type: edSem.vehicle,
        }, autoescola_id)
        if (!result.success) { setError(result.error); return }
        setBloqueios((prev) => prev.map((b) => (b.id === editingId ? result.data : b)))
        setSuccessMsg('Bloqueio atualizado.')
        closeForm()
      })
      return
    }

    if (tipo === 'semanal') {
      startTransition(async () => {
        const result = await criarBloqueioSemanalVarios({
          dias: edSem.dias, tipo: edSem.tipo, horario: edSem.horario, reason: edSem.reason,
          instrutores: semInstrs, vehicle_type: edSem.vehicle, autoescola_id,
        })
        if (!result.success) { setError(result.error); return }
        setBloqueios((prev) => [...result.data, ...prev])
        setSuccessMsg(`${result.data.length} bloqueio${result.data.length !== 1 ? 's' : ''} semanal${result.data.length !== 1 ? 'is' : ''} criado${result.data.length !== 1 ? 's' : ''}.`)
        setSemInstrs([])
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

  const nomesNaLista = useMemo(() => {
    const set = new Set<string>(instrutores)
    for (const b of bloqueios) { const i = instrutorDe(b); if (i) set.add(i) }
    return [...set].sort((a, b) => a.localeCompare(b))
  }, [bloqueios, instrutores])

  // Filtros que valem para qualquer aba (os contadores das abas respeitam eles)
  const baseFiltrada = useMemo(() => {
    const q = fBusca.trim().toLowerCase()
    return bloqueios.filter((b) => {
      if (fInstrutor === TODOS_INSTR ? instrutorDe(b) !== null : fInstrutor && instrutorDe(b) !== fInstrutor) return false
      if (fVeiculo && (b.vehicle_type ?? '').toUpperCase() !== fVeiculo) return false
      if (q && !`${b.reason ?? ''} ${instrutorDe(b) ?? 'todos'}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [bloqueios, fInstrutor, fVeiculo, fBusca])

  const contagem = useMemo(() => ({
    proximos: baseFiltrada.filter((b) => !ehSemanal(b) && dataInicio(b) >= hoje).length,
    semanais: baseFiltrada.filter(ehSemanal).length,
    passados: baseFiltrada.filter((b) => !ehSemanal(b) && dataInicio(b) < hoje).length,
    todos: baseFiltrada.length,
  }), [baseFiltrada, hoje])

  const visiveis = useMemo(() => {
    let l = baseFiltrada.filter((b) => {
      if (aba === 'semanais') return ehSemanal(b)
      if (aba === 'proximos') return !ehSemanal(b) && dataInicio(b) >= hoje
      if (aba === 'passados') return !ehSemanal(b) && dataInicio(b) < hoje
      return true
    })
    if (aba !== 'semanais' && (fDe || fAte)) {
      l = l.filter((b) => ehSemanal(b) || ((!fDe || dataInicio(b) >= fDe) && (!fAte || dataInicio(b) <= fAte)))
    }
    return l
  }, [baseFiltrada, aba, hoje, fDe, fAte])

  const semanais = visiveis.filter(ehSemanal)
  const porData = useMemo(() => {
    const datados = visiveis.filter((b) => !ehSemanal(b))
    datados.sort((a, b) => (aba === 'proximos' ? dataInicio(a).localeCompare(dataInicio(b)) : dataInicio(b).localeCompare(dataInicio(a))) || (a.time_slot ?? '').localeCompare(b.time_slot ?? ''))
    const dias = new Map<string, BloqueioTimeSlot[]>()
    for (const b of datados.slice(0, limite)) {
      const k = dataInicio(b)
      dias.set(k, [...(dias.get(k) ?? []), b])
    }
    const meses = new Map<string, Array<[string, BloqueioTimeSlot[]]>>()
    for (const [dia, lista] of dias) {
      const m = dia.slice(0, 7)
      meses.set(m, [...(meses.get(m) ?? []), [dia, lista]])
    }
    return { meses, total: datados.length, mostrados: Math.min(limite, datados.length) }
  }, [visiveis, aba, limite])

  const gruposSemanais = useMemo(() => {
    const m = new Map<string, BloqueioTimeSlot[]>()
    for (const b of semanais) { const k = instrutorDe(b) ?? ''; m.set(k, [...(m.get(k) ?? []), b]) }
    return [...m.entries()].sort(([a], [b]) => (a === '' ? -1 : b === '' ? 1 : a.localeCompare(b)))
  }, [semanais])

  const filtrando = !!(fInstrutor || fVeiculo || fBusca || fDe || fAte)
  function limparFiltros() { setFInstrutor(''); setFVeiculo(''); setFBusca(''); setFDe(''); setFAte(''); setLimite(POR_PAGINA) }
  const mudarFiltro = <T,>(set: (v: T) => void) => (v: T) => { set(v); setLimite(POR_PAGINA) }

  function Acoes({ b }: { b: BloqueioTimeSlot }) {
    if (!canEdit) return null
    return (
      <div className="flex items-center justify-end gap-1 shrink-0">
        <button
          onClick={() => openEdit(b)}
          disabled={isPending}
          title="Editar"
          aria-label="Editar bloqueio"
          className="p-1.5 text-[--p-text-3] hover:text-blue-400 hover:bg-blue-400/5 rounded-lg transition-colors"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleDelete(b.id)}
          disabled={isPending}
          aria-label="Excluir bloqueio"
          className="p-1.5 text-[--p-text-3] hover:text-red-400 hover:bg-red-400/5 rounded-lg transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    )
  }

  // Bloqueios de instrutores que não existem mais (sobras de exclusões antigas)
  const orfaos = useMemo(() => {
    const existentes = new Set(instrutores)
    return bloqueios.filter((b) => { const i = instrutorDe(b); return i !== null && !existentes.has(i) })
  }, [bloqueios, instrutores])

  function limparOrfaos() {
    startTransition(async () => {
      const r = await limparBloqueiosOrfaos(autoescola_id)
      setConfirmarLimpeza(false)
      if (!r.success) { setError(r.error); return }
      const ids = new Set(orfaos.map((b) => b.id))
      setBloqueios((prev) => prev.filter((b) => !ids.has(b.id)))
      setSuccessMsg(`${r.data.removidos} bloqueio${r.data.removidos !== 1 ? 's' : ''} de instrutores removidos excluído${r.data.removidos !== 1 ? 's' : ''}.`)
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
        {canEdit && (
          <button
            onClick={() => { if (editingId) closeForm(); setEditingId(null); setShowForm((v) => !v) }}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-500 text-white text-sm font-semibold rounded-xl hover:bg-red-600 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Novo Bloqueio
          </button>
        )}
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
            {!editingId && <div className="flex gap-2">
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
            </div>}

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

            {/* Semanal: edição completa (vários dias) */}
            {tipo === 'semanal' && editingId && (
              <div className="space-y-4 max-w-md">
                <BloqueioSemanalCampos value={edSem} onChange={(v) => setEdSem((p) => ({ ...p, ...v }))} idPrefix="ed" />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="ed-instr" className="block text-xs font-medium text-[--p-text-2] mb-1.5">Instrutor</label>
                    <select id="ed-instr" value={edSem.instrutor} onChange={(e) => setEdSem((p) => ({ ...p, instrutor: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl bg-[--p-bg-input] border border-[--p-border] text-sm text-[--p-text-1] focus:outline-none focus:ring-2 focus:ring-rose-500/40">
                      <option value="">Todos os instrutores</option>
                      {[...new Set([...instrutores, ...(edSem.instrutor ? [edSem.instrutor] : [])])].map((i) => <option key={i} value={i}>{i}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="ed-veic" className="block text-xs font-medium text-[--p-text-2] mb-1.5">Veículo</label>
                    <select id="ed-veic" value={edSem.vehicle} onChange={(e) => setEdSem((p) => ({ ...p, vehicle: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl bg-[--p-bg-input] border border-[--p-border] text-sm text-[--p-text-1] focus:outline-none focus:ring-2 focus:ring-rose-500/40">
                      <option value="TODOS">Qualquer veículo</option>
                      <option value="CARRO">Carro</option>
                      <option value="MOTO">Moto</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Semanal: criação (vários dias de uma vez) */}
            {tipo === 'semanal' && !editingId && (
              <div className="space-y-4 max-w-md">
                <BloqueioSemanalCampos value={edSem} onChange={(v) => setEdSem((p) => ({ ...p, ...v }))} idPrefix="cr" />
                <div>
                  <label htmlFor="cr-veic" className="block text-xs font-medium text-[--p-text-2] mb-1.5">Veículo</label>
                  <select id="cr-veic" value={edSem.vehicle} onChange={(e) => setEdSem((p) => ({ ...p, vehicle: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl bg-[--p-bg-input] border border-[--p-border] text-sm text-[--p-text-1] focus:outline-none focus:ring-2 focus:ring-rose-500/40">
                    <option value="TODOS">Qualquer veículo</option>
                    <option value="CARRO">Carro</option>
                    <option value="MOTO">Moto</option>
                  </select>
                </div>
                <div>
                  <span className="block text-xs font-medium text-[--p-text-2] mb-1.5">
                    Instrutores <span className="text-[--p-text-3] font-normal">(nenhum selecionado = todos)</span>
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {instrutores.map((name) => {
                      const sel = semInstrs.includes(name)
                      return (
                        <button key={name} type="button" aria-pressed={sel}
                          onClick={() => setSemInstrs((p) => (sel ? p.filter((x) => x !== name) : [...p, name]))}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${sel ? 'bg-rose-500 text-white' : 'bg-[--p-hover] text-[--p-text-2] hover:text-[--p-text-1]'}`}>
                          {primeiroNome(name)}
                        </button>
                      )
                    })}
                  </div>
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

      {/* Lista */}
      {bloqueios.length === 0 ? (
        <div className="text-center py-16 bg-[--p-bg-card] rounded-2xl border border-[--p-border]">
          <Ban className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-[--p-text-3] font-medium">Nenhum bloqueio ativo</p>
          <p className="text-slate-600 text-sm mt-1">Clique em "Novo Bloqueio" para adicionar.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {canEdit && orfaos.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 text-sm text-[--p-text-1]">
              <span>
                <b>{orfaos.length}</b> bloqueio{orfaos.length !== 1 ? 's' : ''} {orfaos.length !== 1 ? 'são' : 'é'} de instrutores que não existem mais
                ({[...new Set(orfaos.map((b) => primeiroNome(instrutorDe(b)!)))].join(', ')}). Excluir um instrutor agora apaga os bloqueios dele automaticamente.
              </span>
              {confirmarLimpeza ? (
                <span className="flex items-center gap-2">
                  <button onClick={limparOrfaos} disabled={isPending} className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-semibold hover:bg-red-600 disabled:opacity-50">
                    Excluir {orfaos.length} definitivamente
                  </button>
                  <button onClick={() => setConfirmarLimpeza(false)} className="px-3 py-1.5 text-xs text-[--p-text-2] hover:text-[--p-text-1]">Cancelar</button>
                </span>
              ) : (
                <button onClick={() => setConfirmarLimpeza(true)} className="px-3 py-1.5 rounded-lg border border-amber-500/50 text-xs font-semibold hover:bg-amber-500/10">
                  Limpar
                </button>
              )}
            </div>
          )}

          {/* Abas */}
          <div className="flex flex-wrap gap-2">
            {([
              ['proximos', 'Próximos'],
              ['semanais', 'Semanais'],
              ['passados', 'Passados'],
              ['todos', 'Todos'],
            ] as const).map(([k, label]) => (
              <button
                key={k}
                onClick={() => { setAba(k); setLimite(POR_PAGINA) }}
                aria-pressed={aba === k}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-sm font-medium transition-colors ${
                  aba === k ? 'bg-red-500/10 border-red-500/60 text-[--p-text-1]' : 'bg-[--p-bg-card] border-[--p-border] text-[--p-text-2] hover:bg-[--p-hover]'
                }`}
              >
                {label}
                <span className={`text-xs tabular-nums px-1.5 py-0.5 rounded-md ${aba === k ? 'bg-red-500 text-white' : 'bg-[--p-hover] text-[--p-text-3]'}`}>{contagem[k]}</span>
              </button>
            ))}
          </div>

          {/* Filtros */}
          <div className="flex flex-wrap items-end gap-3 bg-[--p-bg-card] border border-[--p-border] rounded-2xl p-3">
            <div className="relative flex-1 min-w-[180px]">
              <label htmlFor="f-busca" className="block text-xs text-[--p-text-3] mb-1">Buscar</label>
              <Search className="w-4 h-4 absolute left-3 bottom-2.5 text-[--p-text-3] pointer-events-none" />
              <input
                id="f-busca"
                type="search"
                placeholder="Motivo ou instrutor"
                value={fBusca}
                onChange={(e) => mudarFiltro(setFBusca)(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-[--p-bg-input] border border-[--p-border] text-sm text-[--p-text-1] placeholder:text-[--p-text-3] focus:outline-none focus:ring-1 focus:ring-red-400/40"
              />
            </div>
            <div>
              <label htmlFor="f-instr" className="block text-xs text-[--p-text-3] mb-1">Instrutor</label>
              <select id="f-instr" value={fInstrutor} onChange={(e) => mudarFiltro(setFInstrutor)(e.target.value)}
                className="px-3 py-2 rounded-xl bg-[--p-bg-input] border border-[--p-border] text-sm text-[--p-text-1] focus:outline-none focus:ring-1 focus:ring-red-400/40">
                <option value="">Todos</option>
                <option value={TODOS_INSTR}>Valem para todos os instrutores</option>
                {nomesNaLista.map((n) => <option key={n} value={n}>{primeiroNome(n)}{instrutores.includes(n) ? '' : ' (removido)'}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="f-veic" className="block text-xs text-[--p-text-3] mb-1">Veículo</label>
              <select id="f-veic" value={fVeiculo} onChange={(e) => mudarFiltro(setFVeiculo)(e.target.value)}
                className="px-3 py-2 rounded-xl bg-[--p-bg-input] border border-[--p-border] text-sm text-[--p-text-1] focus:outline-none focus:ring-1 focus:ring-red-400/40">
                <option value="">Todos</option>
                <option value="CARRO">Carro</option>
                <option value="MOTO">Moto</option>
                <option value="TODOS">Qualquer veículo</option>
              </select>
            </div>
            {aba !== 'semanais' && (
              <>
                <div>
                  <label htmlFor="f-de" className="block text-xs text-[--p-text-3] mb-1">De</label>
                  <input id="f-de" type="date" value={fDe} onChange={(e) => mudarFiltro(setFDe)(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-[--p-bg-input] border border-[--p-border] text-sm text-[--p-text-1] focus:outline-none focus:ring-1 focus:ring-red-400/40" />
                </div>
                <div>
                  <label htmlFor="f-ate" className="block text-xs text-[--p-text-3] mb-1">Até</label>
                  <input id="f-ate" type="date" value={fAte} onChange={(e) => mudarFiltro(setFAte)(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-[--p-bg-input] border border-[--p-border] text-sm text-[--p-text-1] focus:outline-none focus:ring-1 focus:ring-red-400/40" />
                </div>
              </>
            )}
            {filtrando && (
              <button onClick={limparFiltros} className="px-3 py-2 text-sm text-red-400 hover:underline">Limpar filtros</button>
            )}
          </div>

          {visiveis.length === 0 && (
            <div className="text-center py-12 bg-[--p-bg-card] rounded-2xl border border-[--p-border]">
              <p className="text-[--p-text-2] font-medium">Nenhum bloqueio encontrado</p>
              <p className="text-sm text-[--p-text-3] mt-1">{filtrando ? 'Tente remover algum filtro.' : 'Não há bloqueios nesta aba.'}</p>
            </div>
          )}

          {/* Semanais, agrupados por instrutor */}
          {gruposSemanais.length > 0 && (
            <div className="space-y-3">
              {gruposSemanais.map(([nome, lista]) => (
                <section key={nome || 'todos'} className="bg-[--p-bg-card] rounded-2xl border border-[--p-border] overflow-hidden">
                  <h3 className="px-4 py-2.5 text-sm font-semibold text-[--p-text-1] border-b border-[--p-border] flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-red-400" />
                    {nome ? primeiroNome(nome) : 'Todos os instrutores'}
                    <span className="text-xs font-normal text-[--p-text-3] tabular-nums">{lista.length} semanal{lista.length !== 1 ? 'is' : ''}</span>
                  </h3>
                  <ul className="divide-y divide-[--p-border]">
                    {lista.map((b) => (
                      <li key={b.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 text-sm hover:bg-[--p-hover] transition-colors">
                        <span className="font-medium text-[--p-text-1] min-w-[96px]">{resumoDiasIso(diasIso(b))}</span>
                        <Selo b={b} />
                        <span className="text-xs text-[--p-text-3]">{b.vehicle_type === 'TODOS' ? 'Qualquer veículo' : b.vehicle_type}</span>
                        <span className="text-xs text-[--p-text-3] truncate flex-1 min-w-[80px]">{b.reason}</span>
                        <Acoes b={b} />
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}

          {/* Por data: mês → dia */}
          {[...porData.meses.entries()].map(([mes, dias]) => (
            <section key={mes} className="bg-[--p-bg-card] rounded-2xl border border-[--p-border] overflow-hidden">
              <h3 className="px-4 py-2.5 text-sm font-semibold text-[--p-text-1] border-b border-[--p-border] bg-[--p-hover]">
                {rotuloMes(mes)}
                <span className="ml-2 text-xs font-normal text-[--p-text-3] tabular-nums">{dias.reduce((n, [, l]) => n + l.length, 0)}</span>
              </h3>
              <div className="divide-y divide-[--p-border]">
                {dias.map(([dia, lista]) => (
                  <div key={dia} className="flex gap-4 px-4 py-3">
                    <div className="w-24 shrink-0 text-sm font-semibold text-[--p-text-1] tabular-nums pt-0.5">
                      {rotuloDia(dia)}
                      {dia === hoje && <span className="block text-[10px] font-semibold text-sky-500">hoje</span>}
                    </div>
                    <ul className="flex-1 min-w-0 space-y-1.5">
                      {lista.map((b) => (
                        <li key={b.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                          <span className="text-[--p-text-2] min-w-[90px]">{instrutorDe(b) ? primeiroNome(instrutorDe(b)!) : 'Todos'}</span>
                          <Selo b={b} />
                          <span className="text-xs text-[--p-text-3]">{b.vehicle_type === 'TODOS' ? '' : b.vehicle_type}</span>
                          <span className="text-xs text-[--p-text-3] truncate flex-1 min-w-[80px]">{b.reason}</span>
                          <Acoes b={b} />
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          ))}

          {porData.total > porData.mostrados && (
            <div className="flex items-center justify-center gap-3 text-sm text-[--p-text-3]">
              Mostrando {porData.mostrados} de {porData.total}
              <button onClick={() => setLimite((l) => l + POR_PAGINA)} className="px-3.5 py-1.5 rounded-xl border border-[--p-border] text-[--p-text-1] hover:bg-[--p-hover]">
                Mostrar mais
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
