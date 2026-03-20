'use client'

import { useState, useTransition } from 'react'
import { Check, Trash2, Pencil, X, Plus, Tag } from 'lucide-react'
import {
  adicionarCategoria, removerCategoria, atualizarNomeCategoria,
  type Categoria, type CodigoCNH,
} from '../actions/categorias'
import { CODIGOS_VALIDOS, CATEGORIAS_DEFAULT } from '../categorias-config'

const CODIGOS: CodigoCNH[] = [...CODIGOS_VALIDOS]

interface Props {
  autoescola_id: string
  categorias: Categoria[]
}

export function CategoriasManager({ autoescola_id, categorias: initial }: Props) {
  const [categorias, setCategorias] = useState<Categoria[]>(initial)
  const [isPending, startTransition] = useTransition()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editNome, setEditNome] = useState('')
  const [error, setError] = useState('')

  const codigosAtivos = new Set(categorias.map((c) => c.codigo))
  const codigosDisponiveis = CODIGOS.filter((c) => !codigosAtivos.has(c))

  function handleAdd(codigo: CodigoCNH) {
    setError('')
    startTransition(async () => {
      const nome = CATEGORIAS_DEFAULT[codigo]
      const result = await adicionarCategoria(autoescola_id, codigo, nome)
      if (!result.success) { setError(result.error ?? ''); return }
      setCategorias((prev) => [
        ...prev,
        { id: crypto.randomUUID(), autoescola_id, codigo, nome, ordem: CODIGOS.indexOf(codigo) + 1 },
      ].sort((a, b) => a.ordem - b.ordem))
    })
  }

  function handleRemove(id: string) {
    if (!confirm('Remover esta categoria?')) return
    startTransition(async () => {
      const result = await removerCategoria(id, autoescola_id)
      if (result.success) setCategorias((prev) => prev.filter((c) => c.id !== id))
      else setError(result.error ?? '')
    })
  }

  function startEdit(cat: Categoria) {
    setEditingId(cat.id)
    setEditNome(cat.nome)
  }

  function handleEditSave(id: string) {
    startTransition(async () => {
      const result = await atualizarNomeCategoria(id, editNome, autoescola_id)
      if (!result.success) { setError(result.error ?? ''); return }
      setCategorias((prev) => prev.map((c) => c.id === id ? { ...c, nome: editNome } : c))
      setEditingId(null)
    })
  }

  return (
    <div className="space-y-6">
      {/* Categorias ativas */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <Tag className="w-4 h-4 text-brand-teal" />
          <h2 className="font-semibold text-slate-800 text-sm">Categorias habilitadas</h2>
          <span className="ml-auto text-xs text-slate-400">{categorias.length} ativa{categorias.length !== 1 ? 's' : ''}</span>
        </div>

        {categorias.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            Nenhuma categoria cadastrada. Adicione abaixo.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {categorias.map((cat) => (
              <li key={cat.id} className="flex items-center gap-3 px-5 py-3">
                <span className="w-8 h-8 rounded-lg bg-brand-teal/10 text-brand-teal font-bold text-sm flex items-center justify-center shrink-0">
                  {cat.codigo}
                </span>

                {editingId === cat.id ? (
                  <input
                    value={editNome}
                    onChange={(e) => setEditNome(e.target.value)}
                    autoFocus
                    className="flex-1 px-2 py-1 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-teal/40"
                  />
                ) : (
                  <span className="flex-1 text-sm font-medium text-slate-700">{cat.nome}</span>
                )}

                {editingId === cat.id ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEditSave(cat.id)}
                      disabled={isPending}
                      className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => startEdit(cat)}
                      className="p-1.5 text-slate-400 hover:text-brand-teal hover:bg-brand-teal/5 rounded-lg transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleRemove(cat.id)}
                      disabled={isPending}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Adicionar categorias disponíveis */}
      {codigosDisponiveis.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800 text-sm">Adicionar categoria</h2>
            <p className="text-xs text-slate-400 mt-0.5">Categorias CNH disponíveis para habilitar</p>
          </div>
          <div className="p-5 flex flex-wrap gap-3">
            {codigosDisponiveis.map((codigo) => (
              <button
                key={codigo}
                onClick={() => handleAdd(codigo)}
                disabled={isPending}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-slate-300 text-slate-600 hover:border-brand-teal hover:text-brand-teal hover:bg-brand-teal/5 transition-colors disabled:opacity-50 text-sm font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                {codigo} — {CATEGORIAS_DEFAULT[codigo]}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  )
}
