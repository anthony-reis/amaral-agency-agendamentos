'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, GraduationCap, Building2, ChevronDown, MessageCircle } from 'lucide-react'
import { WHATSAPP_URL } from '../constants'

const navLinks = [
  { label: 'O sistema', href: '#sistema' },
  { label: 'Apps', href: '#apps' },
  { label: 'Para quem', href: '#para-quem' },
  { label: 'Planos', href: '#planos' },
  { label: 'Dúvidas', href: '#duvidas' },
]

function MenuEntrar({ escuro }: { escuro: boolean }) {
  const [aberto, setAberto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!aberto) return
    const fechar = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false)
    }
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setAberto(false)
    document.addEventListener('mousedown', fechar)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', fechar)
      document.removeEventListener('keydown', esc)
    }
  }, [aberto])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-xl transition-colors ${
          escuro ? 'text-white/85 hover:text-white hover:bg-white/10' : 'text-slate-700 hover:bg-slate-100'
        }`}
      >
        Entrar
        <ChevronDown className={`w-4 h-4 transition-transform ${aberto ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {aberto && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-60 rounded-2xl bg-white shadow-xl ring-1 ring-slate-200 p-1.5"
          >
            <Link href="/entrar?perfil=aluno" className="flex items-start gap-3 rounded-xl px-3 py-2.5 hover:bg-slate-50">
              <GraduationCap className="w-4 h-4 mt-0.5 text-brand-teal-dark" />
              <span>
                <span className="block text-sm font-semibold text-slate-900">Sou aluno</span>
                <span className="block text-xs text-slate-500">Agendar aulas e ver créditos</span>
              </span>
            </Link>
            <Link href="/entrar?perfil=escola" className="flex items-start gap-3 rounded-xl px-3 py-2.5 hover:bg-slate-50">
              <Building2 className="w-4 h-4 mt-0.5 text-brand-teal-dark" />
              <span>
                <span className="block text-sm font-semibold text-slate-900">Sou autoescola</span>
                <span className="block text-xs text-slate-500">Painel da equipe e app do instrutor</span>
              </span>
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function Header() {
  const [rolou, setRolou] = useState(false)
  const [menuAberto, setMenuAberto] = useState(false)

  useEffect(() => {
    const onScroll = () => setRolou(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // No topo o header fica sobre o hero escuro; depois de rolar, vira claro.
  const escuro = !rolou && !menuAberto

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        escuro ? 'bg-transparent' : 'bg-white/90 backdrop-blur-md shadow-[0_1px_0_rgba(15,23,42,0.08)]'
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="" className="w-8 h-8 object-cover rounded-xl" />
            <span className={`font-display font-bold text-lg tracking-tight ${escuro ? 'text-white' : 'text-slate-900'}`}>
              AmaralPro
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-7" aria-label="Seções">
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className={`text-sm font-medium transition-colors ${
                  escuro ? 'text-white/70 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-2">
            <MenuEntrar escuro={escuro} />
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand-teal text-asfalto text-sm font-bold rounded-xl hover:bg-brand-teal-light transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              Falar com a gente
            </a>
          </div>

          <button
            className={`md:hidden p-2 rounded-lg ${escuro ? 'text-white hover:bg-white/10' : 'text-slate-700 hover:bg-slate-100'}`}
            onClick={() => setMenuAberto((v) => !v)}
            aria-label={menuAberto ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={menuAberto}
          >
            {menuAberto ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {menuAberto && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden bg-white border-t border-slate-100 shadow-lg overflow-hidden"
          >
            <div className="px-4 py-4 space-y-1">
              {navLinks.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setMenuAberto(false)}
                  className="block px-3 py-2.5 text-sm font-medium text-slate-700 rounded-lg hover:bg-slate-50"
                >
                  {l.label}
                </a>
              ))}
              <div className="pt-3 mt-2 border-t border-slate-100 grid grid-cols-2 gap-2">
                <Link href="/entrar?perfil=aluno" className="flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-semibold text-slate-700 rounded-xl border border-slate-200">
                  <GraduationCap className="w-4 h-4 text-brand-teal-dark" /> Sou aluno
                </Link>
                <Link href="/entrar?perfil=escola" className="flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-semibold text-slate-700 rounded-xl border border-slate-200">
                  <Building2 className="w-4 h-4 text-brand-teal-dark" /> Sou autoescola
                </Link>
              </div>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 flex items-center justify-center gap-2 px-4 py-3 bg-brand-teal text-asfalto text-sm font-bold rounded-xl"
              >
                <MessageCircle className="w-4 h-4" /> Falar com a gente no WhatsApp
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
