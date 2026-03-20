'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, X } from 'lucide-react'

interface Props {
  open: boolean
  titulo: string
  descricao: string
  nomeAluno: string
  data: string
  horario: string
  confirmLabel: string
  confirmClass: string
  isPending: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmarAcaoModal({
  open,
  titulo,
  descricao,
  nomeAluno,
  data,
  horario,
  confirmLabel,
  confirmClass,
  isPending,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-40"
            onClick={onCancel}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
          >
            <div className="bg-[--p-bg-card] rounded-2xl border border-[--p-border] p-6 w-full max-w-sm shadow-2xl">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[--p-text-1] text-base">{titulo}</h3>
                    <p className="text-xs text-[--p-text-3] mt-0.5">{descricao}</p>
                  </div>
                </div>
                <button
                  onClick={onCancel}
                  className="text-[--p-text-3] hover:text-[--p-text-1] transition-colors p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Dados da aula */}
              <div className="bg-[--p-bg-base] rounded-xl border border-[--p-border] p-3 mb-5 space-y-1">
                <p className="text-xs text-[--p-text-3]">Aluno</p>
                <p className="font-semibold text-[--p-text-1] text-sm uppercase">{nomeAluno}</p>
                <div className="flex gap-4 mt-1">
                  <div>
                    <p className="text-xs text-[--p-text-3]">Data</p>
                    <p className="text-sm text-[--p-text-2]">{data.split('-').reverse().join('/')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[--p-text-3]">Horário</p>
                    <p className="text-sm text-[--p-text-2]">{horario}</p>
                  </div>
                </div>
              </div>

              {/* Botões */}
              <div className="flex gap-2">
                <button
                  onClick={onCancel}
                  disabled={isPending}
                  className="flex-1 py-2.5 text-sm font-semibold rounded-xl border border-[--p-border] text-[--p-text-2] hover:bg-[--p-hover] disabled:opacity-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={onConfirm}
                  disabled={isPending}
                  className={`flex-1 py-2.5 text-sm font-bold rounded-xl text-white disabled:opacity-50 transition-colors flex items-center justify-center gap-2 ${confirmClass}`}
                >
                  {isPending ? (
                    <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  ) : (
                    confirmLabel
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
