'use client'

import { useState, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Plus, Trash2, Pencil, Key, X, Check, AlertCircle } from 'lucide-react'
import {
  criarInstrutor, excluirInstrutor, atualizarInstrutor, alterarSenhaInstrutor,
} from '../actions/instrutores'
import type { Instrutor } from '../types'

const CATEGORIAS = ['CARRO', 'MOTO', 'AMBOS']

interface Props {
  instrutores: Instrutor[]
  autoescola_id: string
}

export function InstrutoesTable({ instrutores: initial, autoescola_id }: Props) {
  const [instrutores, setInstrutores] = useState<Instrutor[]>(initial)
  const [filter, setFilter] = useState<'TODOS' | string>('TODOS')
  const [isPending, startTransition] = useTransition()
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [passwordId, setPasswordId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [newForm, setNewForm] = useState({ name: '', category: 'CARRO' })
  const [editForm, setEditForm] = useState({ name: '', category: '' })
  const [novaSenha, setNovaSenha] = useState('')

  const filtered = filter === 'TODOS'
    ? instrutores
    : instrutores.filter((i) => i.category === filter)

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    startTransition(async () => {
      const result = await criarInstrutor({ ...newForm, autoescola_id })
      if (!result.success) { setError(result.error); return }
      setInstrutores((prev) => [...prev, result.data])
      setShowCreate(false)
      setNewForm({ name: '', category: 'CARRO' })
    })
  }

  function startEdit(instrutor: Instrutor) {
    setEditingId(instrutor.id)
    setEditForm({ name: instrutor.name, category: instrutor.category })
  }

  function handleEdit(id: string) {
    startTransition(async () => {
      const result = await atualizarInstrutor(id, editForm, autoescola_id)
      if (!result.success) return
      setInstrutores((prev) => prev.map((i) => i.id === id ? result.data : i))
      setEditingId(null)
    })
  }

  function handleDelete(id: string) {
    if (!confirm('Excluir este instrutor? Esta ação não pode ser desfeita.')) return
    startTransition(async () => {
      const result = await excluirInstrutor(id, autoescola_id)
      if (result.success) setInstrutores((prev) => prev.filter((i) => i.id !== id))
    })
  }

  function handlePassword(id: string) {
    setError('')
    startTransition(async () => {
      const result = await alterarSenhaInstrutor(id, novaSenha, autoescola_id)
      if (!result.success) { setError(result.error); return }
      setPasswordId(null)
      setNovaSenha('')
    })
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-5 h-5 text-[#0ea5e9]" />
          <div>
            <h1 className="text-xl font-bold text-[--p-text-1]">Instrutores</h1>
            <p className="text-sm text-[--p-text-3]">{instrutores.length} cadastrado{instrutores.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#0ea5e9] text-white text-sm font-semibold rounded-xl hover:bg-[#0284c7] transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Novo Instrutor
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {['TODOS', ...CATEGORIAS].map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === cat
                ? 'bg-[#0ea5e9] text-[--p-text-1]'
                : 'bg-[--p-hover] text-[--p-text-3] hover:text-white hover:bg-[--p-hover]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Create form */}
      <AnimatePresence>
        {showCreate && (
          <motion.form
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            onSubmit={handleCreate}
            className="flex gap-3 items-end p-4 bg-[--p-bg-card] border border-[--p-border] rounded-2xl"
          >
            <div className="flex-1">
              <label className="block text-xs text-[--p-text-3] mb-1">Nome</label>
              <input
                required
                value={newForm.name}
                onChange={(e) => setNewForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Nome do instrutor"
                className="w-full px-3 py-2.5 rounded-xl bg-[--p-bg-input] border border-[--p-border] text-sm text-[--p-text-1] placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-[#0ea5e9]/40"
              />
            </div>
            <div>
              <label className="block text-xs text-[--p-text-3] mb-1">Categoria</label>
              <select
                value={newForm.category}
                onChange={(e) => setNewForm((p) => ({ ...p, category: e.target.value }))}
                className="px-3 py-2.5 rounded-xl bg-[--p-bg-input] border border-[--p-border] text-sm text-[--p-text-1] focus:outline-none focus:ring-1 focus:ring-[#0ea5e9]/40"
              >
                {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2.5 bg-[#0ea5e9] text-white text-sm font-semibold rounded-xl hover:bg-[#0284c7] disabled:opacity-50"
            >
              Criar
            </button>
            <button type="button" onClick={() => setShowCreate(false)} className="p-2.5 text-[--p-text-3] hover:text-[--p-text-1]">
              <X className="w-4 h-4" />
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-[--p-text-3] text-sm">
          Nenhum instrutor encontrado.
        </div>
      ) : (
        <div className="bg-[--p-bg-card] rounded-2xl border border-[--p-border] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-[--p-bg-card]">
              <tr className="border-b border-[--p-border]">
                <th className="text-left text-xs font-semibold text-[--p-text-3] uppercase px-6 py-3.5">Instrutor</th>
                <th className="text-left text-xs font-semibold text-[--p-text-3] uppercase px-4 py-3.5">Categoria</th>
                <th className="px-4 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[--p-border]">
              {filtered.map((instrutor) => (
                <tr key={instrutor.id} className="hover:bg-[--p-hover] transition-colors">
                  <td className="px-6 py-3.5">
                    {editingId === instrutor.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          value={editForm.name}
                          onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                          className="px-2 py-1 rounded-lg bg-[--p-bg-input] border border-[--p-border] text-sm text-[--p-text-1] w-40 focus:outline-none"
                        />
                        <button onClick={() => handleEdit(instrutor.id)} className="text-emerald-400 hover:text-emerald-300">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={() => setEditingId(null)} className="text-[--p-text-3] hover:text-slate-300">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#0ea5e9]/10 flex items-center justify-center">
                          <span className="text-xs font-bold text-[#0ea5e9]">{instrutor.name.charAt(0)}</span>
                        </div>
                        <span className="font-medium text-[--p-text-1]">{instrutor.name}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    {editingId === instrutor.id ? (
                      <select
                        value={editForm.category}
                        onChange={(e) => setEditForm((p) => ({ ...p, category: e.target.value }))}
                        className="px-2 py-1 rounded-lg bg-[--p-bg-input] border border-[--p-border] text-sm text-[--p-text-1] focus:outline-none"
                      >
                        {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
                      </select>
                    ) : (
                      <span className={`px-2.5 py-0.5 text-xs font-bold rounded-md ${
                        instrutor.category === 'CARRO'
                          ? 'bg-blue-500/20 text-blue-300'
                          : instrutor.category === 'MOTO'
                          ? 'bg-purple-500/20 text-purple-300'
                          : 'bg-slate-500/20 text-slate-300'
                      }`}>
                        {instrutor.category}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => { setPasswordId(instrutor.id); setNovaSenha(''); setError('') }}
                        title="Alterar senha"
                        className="p-1.5 rounded-lg text-[--p-text-3] hover:text-yellow-400 hover:bg-yellow-400/5 transition-colors"
                      >
                        <Key className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => startEdit(instrutor)}
                        title="Editar"
                        className="p-1.5 rounded-lg text-[--p-text-3] hover:text-[#0ea5e9] hover:bg-[#0ea5e9]/5 transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(instrutor.id)}
                        title="Excluir"
                        className="p-1.5 rounded-lg text-[--p-text-3] hover:text-red-400 hover:bg-red-400/5 transition-colors"
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
      )}

      {/* Password modal */}
      <AnimatePresence>
        {passwordId && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40"
              onClick={() => setPasswordId(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
            >
              <div className="bg-[--p-bg-card] rounded-2xl border border-[--p-border] p-6 w-full max-w-sm shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold text-white flex items-center gap-2">
                    <Key className="w-4 h-4 text-yellow-400" />
                    Alterar Senha
                  </h3>
                  <button onClick={() => setPasswordId(null)} className="text-[--p-text-3] hover:text-[--p-text-1]">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-sm text-[--p-text-3] mb-4">
                  Instrutor:{' '}
                  <span className="text-white font-medium">
                    {instrutores.find((i) => i.id === passwordId)?.name}
                  </span>
                </p>
                <input
                  type="text"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  placeholder="Nova senha"
                  autoFocus
                  className="w-full px-3 py-2.5 rounded-xl bg-[--p-bg-input] border border-[--p-border] text-sm text-[--p-text-1] placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-yellow-400/40 mb-3"
                />
                {error && (
                  <div className="flex items-center gap-2 text-sm text-red-400 mb-3">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setPasswordId(null)}
                    className="px-4 py-2 text-sm text-[--p-text-3] hover:text-[--p-text-1]"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => handlePassword(passwordId)}
                    disabled={isPending || !novaSenha.trim()}
                    className="px-4 py-2 bg-yellow-500 text-slate-900 text-sm font-semibold rounded-xl hover:bg-yellow-400 disabled:opacity-50"
                  >
                    Salvar
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
