'use client'

import { useState, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GraduationCap, Plus, Search, Download, Pencil, Trash2, X, Minus, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'
import { criarAluno, editarAluno, excluirAluno, ajustarCredito } from '../actions/alunos'
import type { AlunoComCreditos } from '../types'

interface Props {
  alunos: AlunoComCreditos[]
  autoescola_id: string
}

const CATS = ['a', 'b', 'c', 'd', 'e'] as const
type Cat = typeof CATS[number]

function totalCreditos(a: AlunoComCreditos) {
  if (!a.creditos) return 0
  return CATS.reduce((sum, c) => sum + (a.creditos![`aulas_cat_${c}` as keyof typeof a.creditos] as number ?? 0), 0)
}

function formatDoc(doc: string) {
  if (doc.length === 11) {
    return doc.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }
  return doc
}

type SortCol = 'a' | 'b' | 'c' | 'd' | 'e' | 'total' | null
type SortDir = 'asc' | 'desc'

export function AlunosList({ alunos: initial, autoescola_id }: Props) {
  const [alunos, setAlunos] = useState<AlunoComCreditos[]>(initial)
  const [search, setSearch] = useState('')
  const [isPending, startTransition] = useTransition()
  const [sortCol, setSortCol] = useState<SortCol>(null)
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  // Modal state
  const [modalNovo, setModalNovo] = useState(false)
  const [modalEditar, setModalEditar] = useState<AlunoComCreditos | null>(null)
  const [formData, setFormData] = useState({ name: '', document_id: '', phone: '', email: '' })
  const [formError, setFormError] = useState('')

  function handleSort(col: SortCol) {
    if (sortCol === col) {
      setSortDir((d) => d === 'desc' ? 'asc' : 'desc')
    } else {
      setSortCol(col)
      setSortDir('desc')
    }
  }

  const filtered = alunos
    .filter((a) => {
      if (!search) return true
      const s = search.toLowerCase()
      const stripped = search.replace(/\D/g, '')
      return (
        a.name.toLowerCase().includes(s) ||
        (stripped.length > 0 && a.document_id.includes(stripped)) ||
        (a.phone ?? '').includes(search)
      )
    })
    .sort((a, b) => {
      if (!sortCol) return 0
      const getVal = (x: AlunoComCreditos) =>
        sortCol === 'total' ? totalCreditos(x)
          : x.creditos ? (x.creditos[`aulas_cat_${sortCol}` as keyof typeof x.creditos] as number ?? 0) : 0
      const diff = getVal(a) - getVal(b)
      return sortDir === 'desc' ? -diff : diff
    })

  const totalCreditosGeral = alunos.reduce((sum, a) => sum + totalCreditos(a), 0)
  const media = alunos.length > 0 ? (totalCreditosGeral / alunos.length).toFixed(1) : '0'

  function openNovo() {
    setFormData({ name: '', document_id: '', phone: '', email: '' })
    setFormError('')
    setModalNovo(true)
  }

  function openEditar(a: AlunoComCreditos) {
    setFormData({ name: a.name, document_id: a.document_id, phone: a.phone ?? '', email: a.email ?? '' })
    setFormError('')
    setModalEditar(a)
  }

  function handleCriar(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    startTransition(async () => {
      const result = await criarAluno({ ...formData, autoescola_id })
      if (!result.success) { setFormError(result.error); return }
      setAlunos((prev) => [result.data, ...prev])
      setModalNovo(false)
    })
  }

  function handleEditar(e: React.FormEvent) {
    e.preventDefault()
    if (!modalEditar) return
    setFormError('')
    startTransition(async () => {
      const result = await editarAluno(modalEditar.id, {
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
      }, autoescola_id)
      if (!result.success) { setFormError(result.error); return }
      setAlunos((prev) => prev.map((a) =>
        a.id === modalEditar.id
          ? { ...a, name: formData.name, phone: formData.phone || null, email: formData.email || null }
          : a
      ))
      setModalEditar(null)
    })
  }

  function handleExcluir(id: string) {
    if (!confirm('Excluir este aluno e todos os seus créditos?')) return
    startTransition(async () => {
      const result = await excluirAluno(id, autoescola_id)
      if (result.success) setAlunos((prev) => prev.filter((a) => a.id !== id))
    })
  }

  function handleAjustar(alunoId: string, studentCreditId: string, cat: Cat, delta: 1 | -1) {
    startTransition(async () => {
      const result = await ajustarCredito(alunoId, cat, delta, autoescola_id)
      if (result.success) {
        setAlunos((prev) => prev.map((a) =>
          a.id === alunoId ? { ...a, creditos: result.data } : a
        ))
      }
    })
  }

  function handleExportCSV() {
    const header = 'Nome,CPF/CNH,Telefone,Email,Cat.A,Cat.B,Cat.C,Cat.D,Cat.E,Total,Cadastro'
    const rows = alunos.map((a) => {
      const c = a.creditos
      return [
        a.name,
        formatDoc(a.document_id),
        a.phone ?? '',
        a.email ?? '',
        c?.aulas_cat_a ?? 0,
        c?.aulas_cat_b ?? 0,
        c?.aulas_cat_c ?? 0,
        c?.aulas_cat_d ?? 0,
        c?.aulas_cat_e ?? 0,
        totalCreditos(a),
        new Date(a.created_at).toLocaleDateString('pt-BR'),
      ].join(',')
    })
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `alunos-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const inputCls = 'w-full px-3 py-2 rounded-xl bg-[--p-bg-input] border border-[--p-border] text-sm text-[--p-text-1] placeholder:text-[--p-text-3] focus:outline-none focus:ring-2 focus:ring-[#0ea5e9]/30'

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <GraduationCap className="w-5 h-5 text-[#0ea5e9]" />
        <div>
          <h1 className="text-xl font-bold text-[--p-text-1]">Gestão de Alunos</h1>
          <p className="text-sm text-[--p-text-3]">Cadastro e controle de créditos</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Alunos', value: alunos.length, color: 'text-[#0ea5e9]', bg: 'bg-[#0ea5e9]/10' },
          { label: 'Total Créditos', value: totalCreditosGeral, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Média por Aluno', value: media, color: 'text-purple-400', bg: 'bg-purple-500/10' },
        ].map((s) => (
          <div key={s.label} className={`rounded-2xl p-4 ${s.bg} border border-[--p-border]`}>
            <p className="text-xs text-[--p-text-3] mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[--p-text-3]" />
          <input
            type="text"
            placeholder="Buscar por nome ou CPF…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${inputCls} pl-9`}
          />
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-[--p-text-2] border border-[--p-border] rounded-xl hover:bg-[--p-hover] transition-colors"
        >
          <Download className="w-4 h-4" />
          Exportar
        </button>
        <button
          onClick={openNovo}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#0ea5e9] text-white text-sm font-semibold rounded-xl hover:bg-[#0284c7] transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Novo Aluno
        </button>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-[--p-bg-card] rounded-2xl border border-[--p-border]">
          <GraduationCap className="w-10 h-10 text-[--p-text-3] mx-auto mb-3" />
          <p className="text-[--p-text-2] font-medium">Nenhum aluno encontrado</p>
        </div>
      ) : (
        <div className="bg-[--p-bg-card] rounded-2xl border border-[--p-border] overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead className="sticky top-0 z-10 bg-[--p-bg-card]">
              <tr className="border-b border-[--p-border]">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-[--p-text-3] uppercase">Nome</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-[--p-text-3] uppercase">CPF/CNH</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-[--p-text-3] uppercase">Telefone</th>
                {CATS.map((c) => {
                  const active = sortCol === c
                  return (
                    <th key={c} className="text-center px-2 py-3.5">
                      <button
                        onClick={() => handleSort(c)}
                        className={`flex items-center gap-1 mx-auto text-xs font-semibold uppercase transition-colors ${active ? 'text-[#0ea5e9]' : 'text-[--p-text-3] hover:text-[--p-text-2]'}`}
                      >
                        Cat. {c.toUpperCase()}
                        {active ? (sortDir === 'desc' ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}
                      </button>
                    </th>
                  )
                })}
                <th className="text-center px-3 py-3.5">
                  <button
                    onClick={() => handleSort('total')}
                    className={`flex items-center gap-1 mx-auto text-xs font-semibold uppercase transition-colors ${sortCol === 'total' ? 'text-[#0ea5e9]' : 'text-[--p-text-3] hover:text-[--p-text-2]'}`}
                  >
                    Total
                    {sortCol === 'total' ? (sortDir === 'desc' ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}
                  </button>
                </th>
                <th className="px-4 py-3.5 w-20" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[--p-border]">
              {filtered.map((a) => (
                <motion.tr
                  key={a.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-[--p-hover] transition-colors"
                >
                  <td className="px-5 py-3.5">
                    <div>
                      <p className="font-semibold text-[--p-text-1] truncate max-w-[180px]">{a.name}</p>
                      <p className="text-xs text-[--p-text-3]">{new Date(a.created_at).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 font-mono text-xs text-[--p-text-2]">{formatDoc(a.document_id)}</td>
                  <td className="px-4 py-3.5 text-[--p-text-2]">{a.phone ?? '—'}</td>
                  {CATS.map((c) => {
                    const val = a.creditos ? (a.creditos[`aulas_cat_${c}` as keyof typeof a.creditos] as number ?? 0) : 0
                    return (
                      <td key={c} className="px-2 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => a.creditos && handleAjustar(a.id, a.creditos.id, c, -1)}
                            disabled={isPending || !a.creditos || val === 0}
                            className="w-5 h-5 flex items-center justify-center rounded text-red-400 hover:bg-red-500/10 disabled:opacity-30 transition-colors"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className={`w-6 text-center font-semibold text-sm ${val > 0 ? 'text-[--p-text-1]' : 'text-[--p-text-3]'}`}>
                            {val}
                          </span>
                          <button
                            onClick={() => a.creditos && handleAjustar(a.id, a.creditos.id, c, 1)}
                            disabled={isPending || !a.creditos}
                            className="w-5 h-5 flex items-center justify-center rounded text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-30 transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    )
                  })}
                  <td className="px-3 py-3.5 text-center">
                    <span className="font-bold text-[#0ea5e9]">{totalCreditos(a)}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => openEditar(a)}
                        className="p-1.5 rounded-lg text-[--p-text-3] hover:text-[#0ea5e9] hover:bg-[#0ea5e9]/10 transition-colors"
                        title="Editar"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleExcluir(a.id)}
                        disabled={isPending}
                        className="p-1.5 rounded-lg text-[--p-text-3] hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-30"
                        title="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Novo / Editar */}
      <AnimatePresence>
        {(modalNovo || modalEditar) && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40"
              onClick={() => { setModalNovo(false); setModalEditar(null) }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
            >
              <form
                onSubmit={modalEditar ? handleEditar : handleCriar}
                className="bg-[--p-bg-card] rounded-2xl border border-[--p-border] p-6 w-full max-w-md shadow-2xl space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-[--p-text-1]">
                    {modalEditar ? 'Editar Aluno' : 'Novo Aluno'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => { setModalNovo(false); setModalEditar(null) }}
                    className="p-1.5 rounded-lg text-[--p-text-3] hover:text-[--p-text-1] hover:bg-[--p-hover]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-[--p-text-2] mb-1">Nome completo *</label>
                    <input required value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} className={inputCls} placeholder="Nome do aluno" />
                  </div>
                  {!modalEditar && (
                    <div>
                      <label className="block text-xs font-medium text-[--p-text-2] mb-1">CPF/CNH *</label>
                      <input required value={formData.document_id} onChange={(e) => setFormData((p) => ({ ...p, document_id: e.target.value }))} className={inputCls} placeholder="Somente números" />
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-[--p-text-2] mb-1">Telefone</label>
                    <input value={formData.phone} onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))} className={inputCls} placeholder="(38) 99999-0000" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[--p-text-2] mb-1">E-mail</label>
                    <input type="email" value={formData.email} onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))} className={inputCls} placeholder="email@exemplo.com" />
                  </div>
                </div>

                {formError && <p className="text-sm text-red-400">{formError}</p>}

                <div className="flex gap-2 justify-end pt-2">
                  <button type="button" onClick={() => { setModalNovo(false); setModalEditar(null) }} className="px-4 py-2 text-sm text-[--p-text-2] hover:text-[--p-text-1]">
                    Cancelar
                  </button>
                  <button type="submit" disabled={isPending} className="px-4 py-2 bg-[#0ea5e9] text-white text-sm font-semibold rounded-xl hover:bg-[#0284c7] disabled:opacity-50">
                    {isPending ? 'Salvando…' : (modalEditar ? 'Salvar' : 'Criar')}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
