'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, ArrowRight, School } from 'lucide-react'

interface Escola {
  id: string
  nome: string
  slug: string
  logo_url: string | null
  status: string
}

interface Props {
  escolas: Escola[]
  tipo: 'aluno' | 'escola'
}

export function EscolaSelector({ escolas, tipo }: Props) {
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState<string | null>(null)
  const router = useRouter()

  const filtered = escolas.filter((e) =>
    e.nome.toLowerCase().includes(search.toLowerCase())
  )

  function handleSelect(escola: Escola) {
    setLoading(escola.id)
    const dest = tipo === 'aluno' ? `/${escola.slug}/aluno` : `/${escola.slug}/acesso`
    router.push(dest)
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar autoescola..."
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal/30 focus:border-brand-teal transition-all shadow-sm"
        />
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-sm">
          <School className="w-10 h-10 mx-auto mb-3 opacity-30" />
          Nenhuma autoescola encontrada.
        </div>
      ) : (
        <div className="grid gap-3">
          <AnimatePresence>
            {filtered.map((escola, i) => (
              <motion.button
                key={escola.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => handleSelect(escola)}
                disabled={loading !== null}
                className="w-full flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-200 hover:border-brand-teal hover:shadow-md transition-all text-left group disabled:opacity-60"
              >
                {/* Logo / iniciais */}
                {escola.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={escola.logo_url}
                    alt={escola.nome}
                    className="w-12 h-12 rounded-xl object-cover shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-brand-teal/10 flex items-center justify-center shrink-0">
                    <span className="text-lg font-bold text-brand-teal">
                      {escola.nome.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 truncate group-hover:text-brand-teal transition-colors">
                    {escola.nome}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {tipo === 'aluno' ? 'Acessar meus créditos' : 'Acessar painel'}
                  </p>
                </div>

                {loading === escola.id ? (
                  <div className="w-5 h-5 rounded-full border-2 border-brand-teal border-t-transparent animate-spin shrink-0" />
                ) : (
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-brand-teal transition-colors shrink-0" />
                )}
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
