'use client'

import { useState, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Gauge, X, User, Calendar, Clock, AlertCircle } from 'lucide-react'
import { iniciarAula } from '../actions/minhasAulas'
import type { AulaInstrutor } from '../actions/minhasAulas'

interface Props {
  open: boolean
  aula: AulaInstrutor
  instructorName: string
  onSuccess: (id: string, km_inicial: number) => void
  onCancel: () => void
}

export function IniciarAulaModal({ open, aula, instructorName, onSuccess, onCancel }: Props) {
  const [km, setKm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleClose() {
    if (isPending) return
    setKm('')
    setError(null)
    onCancel()
  }

  function handleConfirmar() {
    const kmNum = parseInt(km, 10)
    if (!km || isNaN(kmNum) || kmNum < 0) {
      setError('Informe um KM válido.')
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await iniciarAula(aula.id, kmNum, instructorName, aula.autoescola_id)
      if (result.success) {
        setKm('')
        onSuccess(aula.id, kmNum)
      } else {
        setError(result.error ?? 'Erro ao iniciar aula.')
      }
    })
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-40"
            onClick={handleClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
          >
            <div className="bg-[--p-bg-card] rounded-2xl border border-[--p-border] w-full max-w-sm shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[--p-border]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <Gauge className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[--p-text-1] text-base">Iniciar Aula</h3>
                    <p className="text-xs text-[--p-text-3]">Registre o KM atual do veículo</p>
                  </div>
                </div>
                {!isPending && (
                  <button onClick={handleClose} className="text-[--p-text-3] hover:text-[--p-text-1] transition-colors p-1">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="px-5 py-4 space-y-5">
                {/* Dados da aula */}
                <div className="bg-[--p-bg-base] rounded-xl border border-[--p-border] p-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[--p-text-1]">
                    <User className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    <span className="uppercase truncate">{aula.student_name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-[--p-text-3]">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {aula.date.split('-').reverse().join('/')}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      {aula.time_slot}
                    </span>
                  </div>
                </div>

                {/* Campo KM */}
                <div>
                  <label className="block text-sm font-semibold text-[--p-text-1] mb-2">
                    Odômetro atual (KM)
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="Ex: 45230"
                    value={km}
                    onChange={(e) => { setKm(e.target.value); setError(null) }}
                    disabled={isPending}
                    autoFocus
                    className="w-full px-4 py-4 text-2xl font-bold text-center rounded-xl bg-[--p-bg-input] border border-[--p-border] text-[--p-text-1] focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 disabled:opacity-50 transition"
                  />
                  <p className="text-xs text-[--p-text-3] mt-1.5 text-center">
                    Digite a quilometragem do painel do veículo
                  </p>
                </div>

                {error && (
                  <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <p className="text-xs text-red-300">{error}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={handleClose}
                    disabled={isPending}
                    className="flex-1 py-2.5 text-sm font-semibold rounded-xl border border-[--p-border] text-[--p-text-2] hover:bg-[--p-hover] disabled:opacity-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmar}
                    disabled={isPending || !km}
                    className="flex-1 py-2.5 text-sm font-bold rounded-xl bg-blue-500 text-white hover:bg-blue-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    {isPending ? (
                      <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    ) : (
                      <>
                        <Gauge className="w-4 h-4" />
                        Iniciar Aula
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
