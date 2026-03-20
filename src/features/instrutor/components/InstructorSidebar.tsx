'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { LayoutDashboard, LogOut, GraduationCap, Menu, X, ChevronRight, Car, Bike } from 'lucide-react'
import { ThemeToggle } from '@/components/ThemeToggle'

interface Props {
  escola: string
  name: string
  category: string
  onLogout: () => Promise<void>
}

export function InstructorSidebar({ escola, name, category, onLogout }: Props) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const painelLink = `/${escola}/instrutor`

  const CategoryIcon = category === 'MOTO' ? Bike : Car

  const NavContent = () => (
    <>
      {/* Brand + ThemeToggle */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-[--p-border]">
        <div className="w-8 h-8 rounded-lg bg-[--p-accent]/10 flex items-center justify-center shrink-0">
          <GraduationCap className="w-4 h-4 text-[--p-accent]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-[--p-text-1] truncate leading-tight">
            {name.split(' ')[0]}
          </p>
          <p className="text-[10px] text-[--p-text-3] uppercase tracking-wider">Instrutor</p>
        </div>
        <ThemeToggle />
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        <Link
          href={painelLink}
          onClick={() => setMobileOpen(false)}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            pathname === painelLink || pathname.startsWith(painelLink + '/')
              ? 'bg-[--p-accent]/10 text-[--p-accent]'
              : 'text-[--p-text-3] hover:text-[--p-text-1] hover:bg-[--p-hover]'
          }`}
        >
          <LayoutDashboard className="w-4 h-4 shrink-0" />
          Painel
          {(pathname === painelLink || pathname.startsWith(painelLink + '/')) && (
            <ChevronRight className="w-3 h-3 ml-auto opacity-60" />
          )}
        </Link>
      </nav>

      {/* User + Logout */}
      <div className="px-3 py-4 border-t border-[--p-border]">
        <div className="flex items-center gap-2.5 px-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-[--p-accent]/20 flex items-center justify-center shrink-0">
            <CategoryIcon className="w-4 h-4 text-[--p-accent]" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-[--p-text-1] truncate uppercase">{name}</p>
            <p className="text-xs text-[--p-text-3] capitalize">
              {category === 'CARRO' ? 'Carro' : category === 'MOTO' ? 'Moto' : 'Carro & Moto'}
            </p>
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
        <div className="flex items-center gap-2.5">
          <GraduationCap className="w-5 h-5 text-[--p-accent]" />
          <div>
            <p className="text-sm font-semibold text-[--p-text-1] uppercase leading-tight">{name}</p>
            <p className="text-[10px] text-[--p-text-3]">Instrutor</p>
          </div>
        </div>
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
