'use client'

import { motion } from 'framer-motion'
import { Trash2 } from 'lucide-react'
import type { AlunoComCreditos } from '../../types'
import { formatDoc } from './utils'

interface Props {
  aluno: AlunoComCreditos
  aulasCount: number
  isPending: boolean
  onCancelar: () => void
  onConfirmar: () => void
}

export function ExcluirAlunoModal({ aluno, aulasCount, isPending, onCancelar, onConfirmar }: Props) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 z-[60]"
        onClick={onCancelar}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 flex items-center justify-center z-[70] p-4 pointer-events-none"
      >
        <div className="bg-[--p-bg-card] rounded-2xl border border-[--p-border] p-6 w-full max-w-sm shadow-2xl pointer-events-auto">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
              <Trash2 className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h3 className="font-bold text-[--p-text-1] text-base">Excluir aluno</h3>
              <p className="text-xs text-[--p-text-3] mt-0.5">Esta ação não pode ser desfeita.</p>
            </div>
          </div>

          <div className="bg-[--p-bg-base] rounded-xl border border-[--p-border] p-3 mb-4">
            <p className="font-semibold text-[--p-text-1] text-sm uppercase">{aluno.name}</p>
            <p className="text-xs text-[--p-text-3] mt-0.5">CPF/CNH: {formatDoc(aluno.document_id)}</p>
          </div>

          {aulasCount > 0 && (
            <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2.5 mb-4">
              <span className="text-amber-400 text-base shrink-0">⚠</span>
              <p className="text-xs text-amber-300">
                Este aluno possui{' '}
                <span className="font-bold">{aulasCount} {aulasCount === 1 ? 'aula agendada' : 'aulas agendadas'}</span>{' '}
                que também {aulasCount === 1 ? 'será excluída' : 'serão excluídas'}, liberando os horários.
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={onCancelar}
              disabled={isPending}
              className="flex-1 py-2.5 text-sm font-semibold rounded-xl border border-[--p-border] text-[--p-text-2] hover:bg-[--p-hover] disabled:opacity-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirmar}
              disabled={isPending}
              className="flex-1 py-2.5 text-sm font-bold rounded-xl bg-red-500 hover:bg-red-400 text-white disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {isPending ? <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> : 'Excluir'}
            </button>
          </div>
        </div>
      </motion.div>
    </>
  )
}
