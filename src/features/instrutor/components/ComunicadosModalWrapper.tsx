'use client'

import { useState, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Megaphone } from 'lucide-react'
import { marcarComunicadoComoLidoInstrutor } from '@/features/instrutor/actions/comunicados'
import type { Comunicado } from '@/features/painel/types'

interface Props {
  comunicados: Comunicado[]
  instructorId: string
  autoescolaId: string
  escola: string
}

export function ComunicadosModalWrapper({ comunicados, instructorId, autoescolaId, escola }: Props) {
  const [queue, setQueue] = useState<Comunicado[]>(comunicados)
  const [isPending, startTransition] = useTransition()

  const current = queue[0] ?? null

  function handleEntendido() {
    if (!current) return
    const id = current.id
    startTransition(async () => {
      await marcarComunicadoComoLidoInstrutor(id, autoescolaId, instructorId, escola)
      setQueue((prev) => prev.slice(1))
    })
  }

  return (
    <AnimatePresence>
      {current && (
        <>
          {/* Backdrop sem onClick — leitura obrigatória */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40"
          />

          <motion.div
            key={current.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 flex items-center justify-center z-50 px-4"
          >
            <div className="bg-[--p-bg-card] border border-[--p-border] rounded-2xl w-full max-w-md shadow-2xl">
              {/* Header */}
              <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-[--p-border]">
                <div className="w-9 h-9 rounded-xl bg-[--p-accent]/15 flex items-center justify-center shrink-0">
                  <Megaphone className="w-4 h-4 text-[--p-accent]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold text-[--p-text-3] uppercase tracking-wider">Comunicado</p>
                  <h2 className="text-base font-bold text-[--p-text-1] truncate">{current.titulo}</h2>
                </div>
                {queue.length > 1 && (
                  <span className="shrink-0 text-xs font-semibold bg-[--p-accent]/10 text-[--p-accent] px-2 py-0.5 rounded-full">
                    {queue.length} restantes
                  </span>
                )}
              </div>

              {/* Body */}
              <div className="px-5 py-4">
                <p className="text-sm text-[--p-text-2] whitespace-pre-wrap leading-relaxed">
                  {current.descricao}
                </p>
              </div>

              {/* Footer */}
              <div className="px-5 pb-5">
                <button
                  onClick={handleEntendido}
                  disabled={isPending}
                  className="w-full py-3 rounded-xl bg-[--p-accent] text-white font-semibold text-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {isPending ? 'Aguarde...' : 'Entendido'}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
