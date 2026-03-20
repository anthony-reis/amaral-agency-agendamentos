'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Car, AlertCircle, LogIn } from 'lucide-react'
import { loginInstrutor } from '../actions/authInstrutor'
import { ThemeToggle } from '@/components/ThemeToggle'

interface Props {
  instructors: { id: string; name: string }[]
  escola: string
  escolaNome: string
}

export function InstructorLoginForm({ instructors, escola, escolaNome }: Props) {
  const [instructorId, setInstructorId] = useState(instructors[0]?.id ?? '')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    startTransition(async () => {
      const result = await loginInstrutor(instructorId, password, escola)
      if (!result.success) {
        setError(result.error)
        return
      }
      router.push(`/${escola}/instrutor`)
      router.refresh()
    })
  }

  return (
    <div className="min-h-screen bg-[--p-bg-base] flex flex-col">
      <header className="flex items-center justify-between px-4 py-3">
        <a
          href={`/${escola}/acesso`}
          className="text-sm text-[--p-text-3] hover:text-[--p-text-1] transition-colors"
        >
          ← Voltar
        </a>
        <ThemeToggle />
      </header>
      <div className="flex-1 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm"
      >

        {/* Card */}
        <div className="bg-[--p-bg-card] rounded-2xl border border-[--p-border] p-8 shadow-card-lg">
          {/* Header */}
          <div className="flex flex-col items-center mb-7 text-center">
            <div className="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-4">
              <Car className="w-7 h-7 text-purple-400" />
            </div>
            <h1 className="text-lg font-bold text-[--p-text-1]">Painel do Instrutor</h1>
            <p className="text-sm text-[--p-text-3] mt-1">{escolaNome}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-[--p-text-3] mb-1.5">Instrutor</label>
              <select
                value={instructorId}
                onChange={(e) => setInstructorId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[--p-bg-input] border border-[--p-border] text-sm text-[--p-text-1] focus:outline-none focus:ring-1 focus:ring-purple-500/40"
              >
                {instructors.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-[--p-text-3] mb-1.5">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite sua senha"
                required
                className="w-full px-3 py-2.5 rounded-xl bg-[--p-bg-input] border border-[--p-border] text-sm text-[--p-text-1] placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-500/40"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isPending || !password.trim()}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-500 disabled:opacity-50 transition-colors"
            >
              {isPending ? (
                <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Entrar
                </>
              )}
            </button>
          </form>
        </div>
      </motion.div>
      </div>
    </div>
  )
}
