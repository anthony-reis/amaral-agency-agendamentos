'use client'

import { useState, useTransition } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Activity, Search, Trash2, CheckCircle, XCircle, Clock } from 'lucide-react'
import { canEditPainel, type Agendamento, type AgendamentoStatus } from '../types'
import { atualizarStatusAgendamentosEmMassa } from '../actions/agendamentos'

interface Filter {
  date_start?: string
  date_end?: string
  instructor_name?: string
  category?: string
  status?: string
  search?: string
}

interface Props {
  initialAgendamentos: Agendamento[]
  total: number
  filter: Filter
  autoescola_id: string
  escolaSlug: string
  instrutores: string[]
  userRole: string
}

const statusLabels: Record<AgendamentoStatus, { text: string; bg: string; color: string }> = {
  scheduled: { text: 'Agendado', bg: 'bg-[#0ea5e9]/10', color: 'text-[#0ea5e9]' },
  confirmed: { text: 'Confirmado', bg: 'bg-emerald-500/10', color: 'text-emerald-500' },
  in_progress: { text: 'Em Andamento', bg: 'bg-violet-500/10', color: 'text-violet-500' },
  completed: { text: 'Concluído', bg: 'bg-purple-500/10', color: 'text-purple-500' },
  absent: { text: 'Falta', bg: 'bg-red-500/10', color: 'text-red-500' },
  cancelled: { text: 'Cancelado', bg: 'bg-gray-500/10', color: 'text-gray-500' },
}

export function ListaAgendamentosView({ initialAgendamentos, total, filter, autoescola_id, escolaSlug, instrutores, userRole }: Props) {
  const canEdit = canEditPainel(userRole)
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  
  // Fitros locais
  const [search, setSearch] = useState(filter.search ?? '')
  const [status, setStatus] = useState(filter.status ?? 'TODOS')
  const [dateStart, setDateStart] = useState(filter.date_start ?? '')
  const [dateEnd, setDateEnd] = useState(filter.date_end ?? '')
  const [instructor, setInstructor] = useState(filter.instructor_name ?? 'TODOS')
  const [category, setCategory] = useState(filter.category ?? 'TODAS')

  // Seleção
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  function applyFilters(e: React.FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (status && status !== 'TODOS') params.set('status', status)
    if (instructor && instructor !== 'TODOS') params.set('instructor', instructor)
    if (category && category !== 'TODAS') params.set('category', category)
    if (dateStart) params.set('date_start', dateStart)
    if (dateEnd) params.set('date_end', dateEnd)
    
    router.push(`${pathname}?${params.toString()}`)
    setSelectedIds(new Set()) // Reseta selecao ao mudar filtros
  }

  function handleSelectAll() {
    if (selectedIds.size === initialAgendamentos.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(initialAgendamentos.map(a => a.id)))
    }
  }

  function toggleSelection(id: string) {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  function handleBatchUpdate(newStatus: AgendamentoStatus) {
    if (selectedIds.size === 0) return

    const idsToUpdate = Array.from(selectedIds).filter(id => {
      const ag = initialAgendamentos.find(a => a.id === id)
      if (!ag) return false
      // Ignora se o status já é o desejado
      if (ag.status === newStatus) return false
      // Evita alterar aulas já canceladas para outro status em lote (para não bugar o reembolso)
      if (ag.status === 'cancelled') return false
      
      return true
    })

    if (idsToUpdate.length === 0) {
      alert(`Nenhuma aula válida para esta ação.\nAulas que já possuem este status ou que já foram canceladas são ignoradas.`)
      return
    }

    const ids = idsToUpdate
    
    // Confirmação para cancelamento que devolve crédito
    if (newStatus === 'cancelled') {
      if (!confirm(`Deseja realmente CANCELAR ${ids.length} agendamento(s)? O crédito será devolvido aos alunos se aplicável.`)) return
    } else {
      if (!confirm(`Deseja alterar o status de ${ids.length} agendamento(s) para ${statusLabels[newStatus].text}?`)) return
    }

    startTransition(async () => {
      const result = await atualizarStatusAgendamentosEmMassa(ids, newStatus, autoescola_id)
      if (result.success) {
        setSelectedIds(new Set())
      } else {
        alert(result.error ?? 'Erro ao atualizar agendamentos')
      }
    })
  }

  const inputCls = 'w-full px-3 py-2 rounded-xl bg-[--p-bg-input] border border-[--p-border] text-sm text-[--p-text-1] placeholder:text-[--p-text-3] outline-none focus:ring-2 focus:ring-[#0ea5e9]/30'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Activity className="w-5 h-5 text-[#0ea5e9]" />
        <div>
          <h1 className="text-xl font-bold text-[--p-text-1]">Lista de Agendamentos</h1>
          <p className="text-sm text-[--p-text-3]">Verifique, filtre e gerencie todas as aulas em lote.</p>
        </div>
      </div>

      {/* Bar de Ações em Massa */}
      <AnimatePresence>
        {canEdit && selectedIds.size > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-wrap items-center justify-between p-4 bg-[#0ea5e9]/10 border border-[#0ea5e9]/20 rounded-2xl"
          >
            <span className="text-sm font-semibold text-[#0ea5e9]">
              {selectedIds.size} itens selecionados
            </span>
            <div className="flex gap-2">
              <button 
                onClick={() => handleBatchUpdate('completed')}
                disabled={isPending}
                className="flex items-center gap-2 px-3 py-2 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                <CheckCircle className="w-4 h-4" /> Concluir
              </button>
              <button 
                onClick={() => handleBatchUpdate('absent')}
                disabled={isPending}
                className="flex items-center gap-2 px-3 py-2 bg-red-500 hover:bg-red-400 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                <Clock className="w-4 h-4" /> Registrar Falta
              </button>
              <button 
                onClick={() => handleBatchUpdate('cancelled')}
                disabled={isPending}
                className="flex items-center gap-2 px-3 py-2 bg-[--p-bg-input] border border-[--p-border] text-[--p-text-2] hover:text-red-400 hover:border-red-400/30 text-xs font-semibold rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" /> Cancelar (devolve crédito)
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filtros */}
      <form onSubmit={applyFilters} className="flex flex-wrap items-end gap-3 bg-[--p-bg-card] p-4 rounded-2xl border border-[--p-border]">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-bold text-[--p-text-3] mb-1.5 ml-1">Buscar (Nome / CPF)</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[--p-text-3]" />
            <input
              type="text"
              placeholder="Digite para buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`${inputCls} pl-9`}
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-[--p-text-3] mb-1.5 ml-1">Data Inicial</label>
          <input type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-bold text-[--p-text-3] mb-1.5 ml-1">Data Final</label>
          <input type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-bold text-[--p-text-3] mb-1.5 ml-1">Instrutor</label>
          <select value={instructor} onChange={(e) => setInstructor(e.target.value)} className={inputCls}>
            <option value="TODOS">Todos</option>
            {instrutores.map(inst => (
              <option key={inst} value={inst}>{inst}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-[--p-text-3] mb-1.5 ml-1">Categoria</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
            <option value="TODAS">Todas</option>
            <option value="CARRO">Carro</option>
            <option value="MOTO">Moto</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-[--p-text-3] mb-1.5 ml-1">Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
            <option value="TODOS">Todos os Status</option>
            <option value="scheduled">Agendado</option>
            <option value="confirmed">Confirmado</option>
            <option value="completed">Concluída</option>
            <option value="absent">Falta</option>
            <option value="cancelled">Cancelado</option>
          </select>
        </div>
        <button
          type="submit"
          className="px-5 py-2.5 bg-[#0ea5e9] text-white text-sm font-semibold rounded-xl hover:bg-[#0284c7] transition-colors h-[42px]"
        >
          Filtrar
        </button>
      </form>

      {/* Tabela */}
      <div className="bg-[--p-bg-card] rounded-2xl border border-[--p-border] overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead className="bg-[#0ea5e9]/5 border-b border-[--p-border]">
            <tr>
              {canEdit && (
                <th className="px-4 py-3.5 text-left w-12">
                  <input
                    type="checkbox"
                    checked={selectedIds.size > 0 && selectedIds.size === initialAgendamentos.length}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-[--p-border] text-[#0ea5e9] focus:ring-[#0ea5e9]"
                  />
                </th>
              )}
              <th className="px-5 py-3.5 text-left text-xs font-bold text-[--p-text-3] uppercase tracking-wider">Aluno</th>
              <th className="px-4 py-3.5 text-left text-xs font-bold text-[--p-text-3] uppercase tracking-wider">Instrutor</th>
              <th className="px-4 py-3.5 text-left text-xs font-bold text-[--p-text-3] uppercase tracking-wider">Data/Hora</th>
              <th className="px-4 py-3.5 text-center text-xs font-bold text-[--p-text-3] uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[--p-border]">
            {initialAgendamentos.length === 0 ? (
              <tr>
                <td colSpan={canEdit ? 5 : 4} className="py-12 text-center text-[--p-text-3]">
                  Nenhum agendamento encontrado para os filtros selecionados.
                </td>
              </tr>
            ) : (
              initialAgendamentos.map((ag) => {
                const isSelected = selectedIds.has(ag.id)
                const sl = statusLabels[ag.status]
                const doc = ag.cpf_cnh ?? ag.student_document
                return (
                  <motion.tr 
                    key={ag.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`hover:bg-[--p-hover] transition-colors ${isSelected ? 'bg-[#0ea5e9]/5' : ''}`}
                    onClick={() => canEdit && toggleSelection(ag.id)}
                  >
                    {canEdit && (
                      <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelection(ag.id)}
                          className="w-4 h-4 rounded border-[--p-border] text-[#0ea5e9] focus:ring-[#0ea5e9] cursor-pointer"
                        />
                      </td>
                    )}
                    <td className="px-5 py-4 cursor-pointer">
                      <p className="font-semibold text-[--p-text-1] truncate max-w-[200px]">{ag.student_name}</p>
                      <p className="text-xs text-[--p-text-3] mt-0.5">{doc}</p>
                    </td>
                    <td className="px-4 py-4 text-[--p-text-2] cursor-pointer">
                      <p className="font-medium max-w-[150px] truncate">{ag.instructor_name || 'Sem Instrutor'}</p>
                      <p className="text-xs text-[--p-text-3] mt-0.5">{ag.instructorCategory || '—'}</p>
                    </td>
                    <td className="px-4 py-4 text-[--p-text-2] cursor-pointer font-mono text-[13px]">
                      <span className="font-medium">{ag.date.split('-').reverse().join('/')}</span> • {ag.time_slot}
                    </td>
                    <td className="px-4 py-4 text-center cursor-pointer">
                      <span className={`inline-flex items-center px-2 py-1 rounded border border-transparent ${sl.bg} ${sl.color} text-[11px] font-bold uppercase tracking-wider`}>
                        {sl.text}
                      </span>
                    </td>
                  </motion.tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
      
      {total > 100 && (
        <p className="text-xs text-center text-[--p-text-3]">Listando os últimos 100 resultados. Use os filtros para refinar.</p>
      )}
    </div>
  )
}
