'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { CreditCard, Info, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react'
import { verificarCreditos } from '../actions/verificarCreditos'
import type { StudentCredits } from '../types'

interface Props {
  redirectTo?: string
  autoescolaId: string
}

export function IdentificacaoForm({ redirectTo = '/aluno/creditos', autoescolaId }: Props) {
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
      router.push(redirectTo)
      return
    }

    startTransition(async () => {
      const result = await verificarCreditos(value, autoescolaId)
      if (result.success) {
        setCredits(result.credits)
      } else {
        setError(result.error)
      }
    })
  }

  const isValid = value.length === 11 || value.length === 18
  const isDisabled = !isValid || isPending
  const hasNoCredits = credits && credits.aulas_cat_a === 0 && credits.aulas_cat_b === 0

  return (
    <form onSubmit={handleSubmit} className="space-y-3" noValidate>
      {/* Card */}
      <div className="bg-[--p-bg-card] rounded-2xl border border-[--p-border] overflow-hidden">
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-[--p-text-3] shrink-0" strokeWidth={1.5} />
            <label htmlFor="document_id" className="text-sm font-semibold text-[--p-text-2] tracking-wide">
              CPF ou CNH
            </label>
          </div>

          <input
            id="document_id"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="Digite seu CPF ou CNH"
            value={value}
            onChange={handleChange}
            disabled={isPending}
            className="w-full px-3.5 py-2.5 text-sm text-[--p-text-1] placeholder-[--p-text-3] border border-[--p-border] rounded-xl bg-[--p-bg-input] outline-none transition-all focus:border-[--p-accent] focus:ring-2 focus:ring-[--p-accent]/20 disabled:opacity-60"
          />

          <div className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-[--p-text-3] shrink-0" strokeWidth={2} />
            <span className="text-xs text-[--p-text-3]">Apenas números, sem pontos ou traços</span>
          </div>

          <AnimatePresence>
            {credits && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="p-4 bg-[--p-accent]/5 rounded-xl border border-[--p-accent]/20 space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[--p-accent]" />
                    <span className="text-sm font-semibold text-[--p-text-1]">Créditos Disponíveis</span>
                  </div>
                  {credits.aulas_cat_b > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[--p-text-2]">Carro</span>
                      <span className="font-semibold text-[--p-accent] bg-[--p-accent]/10 px-2 py-0.5 rounded-md">
                        {credits.aulas_cat_b} créditos
                      </span>
                    </div>
                  )}
                  {credits.aulas_cat_a > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[--p-text-2]">Moto</span>
                      <span className="font-semibold text-[--p-accent] bg-[--p-accent]/10 px-2 py-0.5 rounded-md">
                        {credits.aulas_cat_a} créditos
                      </span>
                    </div>
                  )}
                  {hasNoCredits && (
                    <p className="text-sm text-[--p-text-3] italic">Nenhum crédito disponível.</p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            type="submit"
            disabled={isDisabled || !!hasNoCredits}
            whileHover={!isDisabled ? { scale: 1.015 } : {}}
            whileTap={!isDisabled ? { scale: 0.985 } : {}}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 mt-2 bg-[--p-accent] text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--p-accent]"
          >
            {isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Verificando...</>
            ) : credits ? (
              'Continuar →'
            ) : (
              'Verificar Créditos'
            )}
          </motion.button>
        </div>
      </div>

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
            <p className="text-sm text-red-400">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-start gap-3 px-4 py-3.5 bg-[--p-bg-card] border border-[--p-border] rounded-xl">
        <Info className="w-4 h-4 text-[--p-accent] mt-0.5 shrink-0" strokeWidth={2} />
        <p className="text-xs text-[--p-text-3] leading-relaxed">
          <span className="text-[--p-accent] font-semibold">Importante: </span>
          Você só pode agendar nas categorias onde possui créditos disponíveis.
        </p>
      </div>
    </form>
  )
}
