'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Car, ChevronDown, Lock, AlertCircle, ArrowRight, User } from 'lucide-react'
import { loginPainel } from '../actions/authPainel'
import type { PainelUser } from '../types'

interface Props {
  users: PainelUser[]
  escola: string
  escolaNome: string
}

export function PainelLoginForm({ users, escola, escolaNome }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [selectedUserId, setSelectedUserId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedUserId) { setError('Selecione um usuário.'); return }
    setError('')
    startTransition(async () => {
      const result = await loginPainel(selectedUserId, password, escola)
      if (!result.success) {
        setError(result.error)
        return
      }
      router.push(`/${escola}/painel/dashboard`)
      router.refresh()
    })
  }

  const selectedUser = users.find((u) => u.id === selectedUserId)

  return (
    <main className="min-h-screen bg-[--p-bg-input] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 150, damping: 26 }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-11 h-11 rounded-xl bg-[#0ea5e9] flex items-center justify-center shadow-lg">
            <Car className="w-5 h-5 text-[--p-text-1]" strokeWidth={2} />
          </div>
          <div>
            <p className="text-lg font-bold text-white leading-none">{escolaNome}</p>
            <p className="text-[11px] text-[--p-text-3] mt-0.5 tracking-wide uppercase">
              Painel Administrativo
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-[--p-bg-card] rounded-2xl shadow-2xl p-8 border border-[--p-border]">
          <h1 className="text-xl font-bold text-white mb-1">Acesso ao painel</h1>
          <p className="text-sm text-[--p-text-3] mb-6">
            Selecione seu perfil e informe a senha.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* User select */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Usuário
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[--p-text-3]" />
                <select
                  required
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-[--p-bg-input] border border-[--p-border] text-sm text-[--p-text-1] focus:outline-none focus:ring-2 focus:ring-[#0ea5e9]/40 focus:border-[#0ea5e9]/60 transition-colors appearance-none"
                >
                  <option value="">Selecionar usuário…</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[--p-text-3] pointer-events-none" />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[--p-text-3]" />
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[--p-bg-input] border border-[--p-border] text-sm text-[--p-text-1] placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#0ea5e9]/40 focus:border-[#0ea5e9]/60 transition-colors"
                />
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 px-3 py-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              type="submit"
              disabled={isPending || !selectedUserId}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center justify-center gap-2 py-3 bg-[#0ea5e9] text-white font-semibold rounded-xl hover:bg-[#0284c7] transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2 shadow-sm"
            >
              {isPending ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Entrar
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </motion.button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          Powered by AmaralPro
        </p>
      </motion.div>
    </main>
  )
}
