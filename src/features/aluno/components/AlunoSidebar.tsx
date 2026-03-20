'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { CalendarDays, BookOpen, LogOut, Car, Menu, X, ChevronRight } from 'lucide-react'
import { ThemeToggle } from '@/components/ThemeToggle'

interface Props {
  escola: string
  autoescolaNome: string
  autoescolaLogoUrl: string | null
  studentName: string
  isIdentified: boolean
  onLogout: () => Promise<void>
}

function SchoolBrand({ logoUrl, nome }: { logoUrl: string | null; nome: string }) {
  return (
    <div className="flex items-center gap-2.5">
      {logoUrl ? (
        <img src={logoUrl} alt={nome} className="h-7 w-7 object-contain rounded shrink-0" />
      ) : (
        <div className="w-7 h-7 rounded-lg bg-[--p-accent]/20 flex items-center justify-center shrink-0">
          <Car className="w-3.5 h-3.5 text-[--p-accent]" />
        </div>
      )}
      <span className="text-sm font-semibold text-[--p-text-1] truncate">{nome}</span>
    </div>
  )
}

export function AlunoSidebar({
  escola,
  autoescolaNome,
  autoescolaLogoUrl,
  studentName,
  isIdentified,
  onLogout,
}: Props) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const agendarLink = `/${escola}/aluno/agendar`
  const aulasLink = `/${escola}/aluno/minhas-aulas`

  // ─── Not identified: minimal sticky header only ───────────────────────────
  if (!isIdentified) {
    return (
      <header className="w-full flex items-center justify-between px-4 py-3 bg-[--p-bg-card] border-b border-[--p-border] sticky top-0 z-30">
        <SchoolBrand logoUrl={autoescolaLogoUrl} nome={autoescolaNome} />
        <ThemeToggle />
      </header>
    )
  }

  // ─── Identified: full sidebar ─────────────────────────────────────────────
  const NavContent = () => (
    <>
      {/* Brand + ThemeToggle */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-[--p-border]">
        {autoescolaLogoUrl ? (
          <img src={autoescolaLogoUrl} alt={autoescolaNome} className="h-8 w-8 object-contain rounded-lg shrink-0" />
        ) : (
          <div className="w-8 h-8 rounded-lg bg-[--p-accent]/20 flex items-center justify-center shrink-0">
            <Car className="w-4 h-4 text-[--p-accent]" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-[--p-text-1] truncate leading-tight">{autoescolaNome}</p>
          <p className="text-[10px] text-[--p-text-3] uppercase tracking-wider">Área do Aluno</p>
        </div>
        <ThemeToggle />
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        <Link
          href={agendarLink}
          onClick={() => setMobileOpen(false)}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            pathname === agendarLink || pathname.startsWith(agendarLink + '/')
              ? 'bg-[--p-accent]/10 text-[--p-accent]'
              : 'text-[--p-text-3] hover:text-[--p-text-1] hover:bg-[--p-hover]'
          }`}
        >
          <CalendarDays className="w-4 h-4 shrink-0" />
          Agendar Aula
          {(pathname === agendarLink || pathname.startsWith(agendarLink + '/')) && (
            <ChevronRight className="w-3 h-3 ml-auto opacity-60" />
          )}
        </Link>
        <Link
          href={aulasLink}
          onClick={() => setMobileOpen(false)}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            pathname === aulasLink
              ? 'bg-[--p-accent]/10 text-[--p-accent]'
              : 'text-[--p-text-3] hover:text-[--p-text-1] hover:bg-[--p-hover]'
          }`}
        >
          <BookOpen className="w-4 h-4 shrink-0" />
          Minhas Aulas
          {pathname === aulasLink && <ChevronRight className="w-3 h-3 ml-auto opacity-60" />}
        </Link>
      </nav>

      {/* User + Logout */}
      <div className="px-3 py-4 border-t border-[--p-border]">
        <div className="flex items-center gap-2.5 px-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-[--p-accent]/20 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-[--p-accent]">
              {studentName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-[--p-text-1] truncate capitalize">
              {studentName.split(' ').slice(0, 2).join(' ')}
            </p>
            <p className="text-xs text-[--p-text-3]">Aluno</p>
          </div>
        </div>
        <form action={onLogout}>
          <button
            type="submit"
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-[--p-text-3] hover:text-red-400 hover:bg-red-500/5 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </form>
      </div>
    </>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0 bg-[--p-bg-card] border-r border-[--p-border] h-screen sticky top-0">
        <NavContent />
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden w-full flex items-center justify-between px-4 py-3 bg-[--p-bg-card] border-b border-[--p-border] sticky top-0 z-30">
        <SchoolBrand logoUrl={autoescolaLogoUrl} nome={autoescolaNome} />
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg text-[--p-text-3] hover:text-[--p-text-1] hover:bg-[--p-hover]"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black/60 z-40"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.22 }}
              className="lg:hidden fixed left-0 top-0 bottom-0 w-64 bg-[--p-bg-card] z-50 flex flex-col"
            >
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-[--p-text-3] hover:text-[--p-text-1]"
              >
                <X className="w-4 h-4" />
              </button>
              <NavContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
