'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, X, Trash2, ShieldAlert } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  onConfirm: (options: { blockSlot: boolean; reason?: string }) => void
  isPending: boolean
  aulaInfo: {
    studentName: string
    date: string
    timeSlot: string
  }
}

export function ModalCancelamentoAula({ open, onClose, onConfirm, isPending, aulaInfo }: Props) {
  const [step, setStep] = useState<1 | 2>(1)
  const [blockSlot, setBlockSlot] = useState(false)
  const [reason, setReason] = useState('')

  const handleNext = (block: boolean) => {
    if (block) {
      setBlockSlot(true)
      setStep(2)
    } else {
      onConfirm({ blockSlot: false })
    }
  }

  const handleFinalConfirm = () => {
    if (!reason.trim()) return
    onConfirm({ blockSlot: true, reason })
  }

  const reset = () => {
    setStep(1)
    setBlockSlot(false)
    setReason('')
  }

  return (
    <AnimatePresence onExitComplete={reset}>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-[60]"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 flex items-center justify-center z-[70] p-4 pointer-events-none"
          >
            <div className="bg-[--p-bg-card] rounded-2xl border border-[--p-border] p-6 w-full max-w-md shadow-2xl pointer-events-auto">
              {/* Header */}
              <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${step === 1 ? 'bg-amber-500/10' : 'bg-red-500/10'}`}>
                    {step === 1 ? (
                      <AlertTriangle className="w-5 h-5 text-amber-400" />
                    ) : (
                      <ShieldAlert className="w-5 h-5 text-red-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-[--p-text-1] text-base">
                      {step === 1 ? 'Desmarcar Aula' : 'Bloquear Horário'}
                    </h3>
                    <p className="text-xs text-[--p-text-3] mt-0.5">
                      {step === 1 
                        ? 'Escolha como deseja proceder com o cancelamento.' 
                        : 'Informe o motivo do bloqueio deste horário.'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="text-[--p-text-3] hover:text-[--p-text-1] transition-colors p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Aula Info Card */}
              <div className="bg-[--p-bg-base] rounded-xl border border-[--p-border] p-3 mb-6 space-y-1">
                <p className="text-[10px] font-bold text-[--p-text-3] uppercase tracking-wider">Aula Selecionada</p>
                <p className="font-semibold text-[--p-text-1] text-sm uppercase truncate">{aulaInfo.studentName}</p>
                <p className="text-xs text-[--p-text-2]">
                  {aulaInfo.date.split('-').reverse().join('/')} • {aulaInfo.timeSlot}
                </p>
              </div>

              {step === 1 ? (
                <div className="grid grid-cols-1 gap-3">
                  <button
                    onClick={() => handleNext(false)}
                    disabled={isPending}
                    className="group flex items-center gap-4 p-4 rounded-xl border border-[--p-border] hover:border-[#0ea5e9]/40 hover:bg-[#0ea5e9]/5 transition-all text-left"
                  >
                    <div className="w-10 h-10 rounded-lg bg-[--p-bg-input] group-hover:bg-[#0ea5e9]/10 flex items-center justify-center shrink-0 transition-colors">
                      <Trash2 className="w-5 h-5 text-[--p-text-3] group-hover:text-[#0ea5e9]" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[--p-text-1]">Apenas desmarcar</p>
                      <p className="text-xs text-[--p-text-3]">A aula será cancelada e o crédito devolvido.</p>
                    </div>
                  </button>

                  <button
                    onClick={() => handleNext(true)}
                    disabled={isPending}
                    className="group flex items-center gap-4 p-4 rounded-xl border border-[--p-border] hover:border-red-500/40 hover:bg-red-500/5 transition-all text-left"
                  >
                    <div className="w-10 h-10 rounded-lg bg-[--p-bg-input] group-hover:bg-red-500/10 flex items-center justify-center shrink-0 transition-colors">
                      <ShieldAlert className="w-5 h-5 text-[--p-text-3] group-hover:text-red-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[--p-text-1]">Desmarcar e bloquear horário</p>
                      <p className="text-xs text-[--p-text-3]">A aula será cancelada e ninguém poderá agendar neste slot.</p>
                    </div>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[--p-text-3] mb-2 ml-1 uppercase tracking-wider">Justificativa do bloqueio</label>
                    <textarea
                      autoFocus
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Ex: Instrutor em consulta médica, manutenção de veículo..."
                      className="w-full h-24 px-4 py-3 rounded-xl bg-[--p-bg-input] border border-[--p-border] text-sm text-[--p-text-1] placeholder:text-[--p-text-3] focus:outline-none focus:ring-2 focus:ring-red-500/30 resize-none"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setStep(1)}
                      disabled={isPending}
                      className="flex-1 py-3 text-sm font-semibold rounded-xl border border-[--p-border] text-[--p-text-2] hover:bg-[--p-hover] disabled:opacity-50 transition-colors"
                    >
                      Voltar
                    </button>
                    <button
                      onClick={handleFinalConfirm}
                      disabled={isPending || !reason.trim()}
                      className="flex-[2] py-3 text-sm font-bold rounded-xl bg-red-500 text-white hover:bg-red-400 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-red-500/20"
                    >
                      {isPending ? (
                        <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      ) : (
                        'Confirmar e Bloquear'
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
