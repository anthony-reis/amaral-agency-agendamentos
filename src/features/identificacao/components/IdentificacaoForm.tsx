'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { CreditCard, Info, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react'
import { verificarCreditos } from '../actions/verificarCreditos'
import type { StudentCredits } from '../types'

interface Props {
  redirectTo?: string
}

export function IdentificacaoForm({ redirectTo = '/aluno/creditos' }: Props) {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [credits, setCredits] = useState<StudentCredits | null>(null)
  const router = useRouter()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 18)
    setValue(raw)
    if (error) setError(null)
    if (credits) setCredits(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!value || isPending) return

    if (credits) {
      // If we already verified and have credits, clicking continuará will redirect
      router.push(redirectTo)
      return
    }

    startTransition(async () => {
      const result = await verificarCreditos(value)
      if (result.success) {
        setCredits(result.credits)
      } else {
        setError(result.error)
      }
    })
  }

  const isValid = value.length === 11 || value.length === 18
  const isDisabled = !isValid || isPending

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {/* Card principal */}
      <motion.div
        className="bg-white rounded-2xl shadow-card-lg overflow-hidden"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 24, delay: 0.2 }}
      >
        <div className="p-5 space-y-4">
          {/* Label */}
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-slate-500 shrink-0" strokeWidth={1.5} />
            <label
              htmlFor="document_id"
              className="text-sm font-semibold text-slate-700 tracking-wide"
            >
              CPF ou CNH
            </label>
          </div>

          {/* Input */}
          <input
            id="document_id"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="Digite seu CPF ou CNH completa"
            value={value}
            onChange={handleChange}
            disabled={isPending}
            className="
              w-full px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400
              border border-slate-200 rounded-xl bg-white
              outline-none transition-all duration-200
              focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20
              disabled:opacity-60 disabled:cursor-not-allowed
            "
          />

          {/* Helper */}
          <div className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" strokeWidth={2} />
            <span className="text-xs text-slate-400">
              Apenas números, sem pontos ou traços
            </span>
          </div>

          {/* Credits Summary */}
          <AnimatePresence>
            {credits && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="p-4 bg-brand-teal/5 rounded-xl border border-brand-teal/10 space-y-3 mt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-4 h-4 text-brand-teal" />
                    <span className="text-sm font-semibold text-slate-800">
                      Créditos Disponíveis:
                    </span>
                  </div>
                  
                  {credits.aulas_cat_b > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Carro</span>
                      <span className="font-semibold text-brand-teal bg-brand-teal/10 px-2 py-0.5 rounded-md">
                        {credits.aulas_cat_b} créditos
                      </span>
                    </div>
                  )}
                  {credits.aulas_cat_a > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Moto</span>
                      <span className="font-semibold text-brand-teal bg-brand-teal/10 px-2 py-0.5 rounded-md">
                        {credits.aulas_cat_a} créditos
                      </span>
                    </div>
                  )}
                  {credits.aulas_cat_b === 0 && credits.aulas_cat_a === 0 && (
                    <div className="text-sm text-slate-500 italic">
                      Nenhum crédito disponível.
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Botão */}
          <motion.button
            type="submit"
            disabled={isDisabled || (credits ? (credits.aulas_cat_a === 0 && credits.aulas_cat_b === 0) : false)}
            whileHover={!isDisabled ? { scale: 1.015 } : {}}
            whileTap={!isDisabled ? { scale: 0.985 } : {}}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className={`
              w-full py-2.5 px-4 rounded-xl text-sm font-semibold
              transition-all duration-200
              flex items-center justify-center gap-2 mt-4
              disabled:cursor-not-allowed
              ${credits ? 'bg-brand-teal text-white hover:bg-brand-teal-dark' : 'bg-brand-teal text-white hover:enabled:bg-brand-teal-dark'}
              disabled:bg-slate-200 disabled:text-slate-400
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2
            `}
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Verificando...
              </>
            ) : credits ? (
              'Continuar'
            ) : (
              'Verificar Créditos'
            )}
          </motion.button>
        </div>
      </motion.div>

      {/* Erro inline */}
      <AnimatePresence mode="wait">
        {error && (
          <motion.div
            key={error}
            className="flex items-start gap-2.5 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" strokeWidth={2} />
            <p className="text-sm text-red-300">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info box */}
      <motion.div
        className="flex items-start gap-3 px-4 py-3.5 bg-brand-navy-card border border-brand-navy-border rounded-xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.4 }}
      >
        <Info className="w-4 h-4 text-brand-teal mt-0.5 shrink-0" strokeWidth={2} />
        <p className="text-xs text-slate-400 leading-relaxed">
          <span className="text-brand-teal font-semibold">Importante: </span>
          Você só poderá agendar aulas nas categorias onde possui créditos disponíveis.
        </p>
      </motion.div>
    </form>
  )
}
