'use client'

import { useState, useTransition, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Megaphone, Plus, Trash2, X, Users, Pencil } from 'lucide-react'
import { criarComunicado, editarComunicado, excluirComunicado } from '../actions/comunicados'
import { canEditPainel, type ComunicadoComLidos } from '../types'

interface Props {
  comunicados: ComunicadoComLidos[]
  autoescola_id: string
  escola: string
  userRole: string
}

type ModalMode = 'create' | 'edit'

interface FormModal {
  mode: ModalMode
  id?: string
  titulo?: string
  descricao?: string
}

export function ComunicadosList({ comunicados: initial, autoescola_id, escola, userRole }: Props) {
  const canEdit = canEditPainel(userRole)
  const [comunicados, setComunicados] = useState<ComunicadoComLidos[]>(initial)
  const [modal, setModal] = useState<FormModal | null>(null)
  const [formError, setFormError] = useState('')
  const [isPending, startTransition] = useTransition()
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  function openCreate() {
    setFormError('')
    setModal({ mode: 'create' })
  }

  function openEdit(c: ComunicadoComLidos) {
    setFormError('')
    setModal({ mode: 'edit', id: c.id, titulo: c.titulo, descricao: c.descricao })
  }

  function closeModal() {
    setModal(null)
    setFormError('')
  }

  function handleSubmit(formData: FormData) {
    setFormError('')
    startTransition(async () => {
      try {
        if (modal?.mode === 'create') {
          const novo = await criarComunicado(formData, escola)
          setComunicados((prev) => [novo, ...prev])
        } else if (modal?.mode === 'edit' && modal.id) {
          const atualizado = await editarComunicado(modal.id, formData, escola)
          setComunicados((prev) =>
            prev.map((c) =>
              c.id === modal.id
                ? { ...atualizado, total_lidos: c.total_lidos }
                : c
            )
          )
        }
        closeModal()
      } catch (e) {
        setFormError(e instanceof Error ? e.message : 'Erro ao salvar comunicado.')
      }
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await excluirComunicado(id, autoescola_id, escola)
        setComunicados((prev) => prev.filter((c) => c.id !== id))
        setConfirmDelete(null)
      } catch {
        // estado será corrigido no próximo revalidatePath
      }
    })
  }

  const isEdit = modal?.mode === 'edit'

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[--p-text-1]">Comunicados</h1>
          <p className="text-sm text-[--p-text-3] mt-0.5">Avisos enviados para todos os alunos</p>
        </div>
        {canEdit && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0ea5e9] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            Novo Comunicado
          </button>
        )}
      </div>

      {/* Create / Edit modal */}
      <AnimatePresence>
        {modal && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40"
              onClick={closeModal}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 flex items-center justify-center z-50 px-4"
            >
              <div className="bg-[--p-bg-card] border border-[--p-border] rounded-2xl w-full max-w-lg shadow-2xl">
                <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[--p-border]">
                  <h2 className="text-base font-bold text-[--p-text-1]">
                    {isEdit ? 'Editar Comunicado' : 'Novo Comunicado'}
                  </h2>
                  <button
                    onClick={closeModal}
                    className="p-1.5 rounded-lg text-[--p-text-3] hover:text-[--p-text-1] hover:bg-[--p-hover]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <form ref={formRef} action={handleSubmit} className="px-5 py-4 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[--p-text-3] uppercase tracking-wider mb-1.5">
                      Título
                    </label>
                    <input
                      name="titulo"
                      required
                      maxLength={120}
                      defaultValue={modal.titulo ?? ''}
                      placeholder="Ex: Atualização de horários"
                      className="w-full px-3 py-2.5 bg-[--p-bg-input] border border-[--p-border] rounded-xl text-sm text-[--p-text-1] placeholder:text-[--p-text-3] focus:outline-none focus:border-[#0ea5e9]/60"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[--p-text-3] uppercase tracking-wider mb-1.5">
                      Descrição
                    </label>
                    <textarea
                      name="descricao"
                      required
                      rows={5}
                      defaultValue={modal.descricao ?? ''}
                      placeholder="Escreva o conteúdo do comunicado..."
                      className="w-full px-3 py-2.5 bg-[--p-bg-input] border border-[--p-border] rounded-xl text-sm text-[--p-text-1] placeholder:text-[--p-text-3] focus:outline-none focus:border-[#0ea5e9]/60 resize-none"
                    />
                  </div>
                  {formError && (
                    <p className="text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">{formError}</p>
                  )}
                  <div className="flex gap-3 pt-1">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="flex-1 py-2.5 rounded-xl border border-[--p-border] text-sm text-[--p-text-3] hover:text-[--p-text-1] hover:bg-[--p-hover] transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isPending}
                      className="flex-1 py-2.5 rounded-xl bg-[#0ea5e9] text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
                    >
                      {isPending
                        ? isEdit ? 'Salvando...' : 'Publicando...'
                        : isEdit ? 'Salvar' : 'Publicar'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* List */}
      {comunicados.length === 0 ? (
        <div className="bg-[--p-bg-card] border border-[--p-border] rounded-2xl p-12 text-center">
          <Megaphone className="w-10 h-10 text-[--p-text-3] mx-auto mb-3 opacity-30" />
          <p className="text-sm text-[--p-text-3]">Nenhum comunicado publicado ainda.</p>
          <p className="text-xs text-[--p-text-3] mt-1 opacity-70">
            Clique em &ldquo;Novo Comunicado&rdquo; para criar o primeiro.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {comunicados.map((c) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
                className="bg-[--p-bg-card] border border-[--p-border] rounded-2xl p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-[--p-text-1] mb-1">{c.titulo}</h3>
                    <p className="text-sm text-[--p-text-2] whitespace-pre-wrap leading-relaxed mb-3">
                      {c.descricao}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-[--p-text-3] flex-wrap">
                      <span>
                        {new Date(c.created_at).toLocaleDateString('pt-BR', {
                          day: '2-digit', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                      {c.created_by && <span>por {c.created_by}</span>}
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {c.total_lidos} {c.total_lidos === 1 ? 'leitura' : 'leituras'}
                      </span>
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => openEdit(c)}
                        className="p-2 rounded-lg text-[--p-text-3] hover:text-[#0ea5e9] hover:bg-[#0ea5e9]/10 transition-colors"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(c.id)}
                        className="p-2 rounded-lg text-[--p-text-3] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Delete confirmation */}
      <AnimatePresence>
        {confirmDelete && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40"
              onClick={() => setConfirmDelete(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 flex items-center justify-center z-50 px-4"
            >
              <div className="bg-[--p-bg-card] border border-[--p-border] rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                <h2 className="text-base font-bold text-[--p-text-1] mb-2">Excluir comunicado?</h2>
                <p className="text-sm text-[--p-text-3] mb-5">
                  Esta ação é irreversível. Os registros de leitura dos alunos também serão removidos.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setConfirmDelete(null)}
                    className="flex-1 py-2.5 rounded-xl border border-[--p-border] text-sm text-[--p-text-3] hover:text-[--p-text-1] hover:bg-[--p-hover] transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => handleDelete(confirmDelete)}
                    disabled={isPending}
                    className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
                  >
                    {isPending ? 'Excluindo...' : 'Excluir'}
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
