'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Users, Clock, Ban, History,
  AlertTriangle, LogOut, Car, Menu, X, ChevronRight,
  Calendar, GraduationCap, Activity,
} from 'lucide-react'
import { ThemeToggle } from '@/components/ThemeToggle'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
}

function buildNavItems(escola: string): NavItem[] {
  const base = `/${escola}/painel`
  return [
    { label: 'Dashboard', href: `${base}/dashboard`, icon: LayoutDashboard },
    { label: 'Calendário', href: `${base}/calendario`, icon: Calendar },
    { label: 'Instrutores', href: `${base}/instrutores`, icon: Users },
    { label: 'Alunos', href: `${base}/alunos`, icon: GraduationCap },
    { label: 'Horários', href: `${base}/horarios`, icon: Clock },
    { label: 'Bloqueios', href: `${base}/bloqueios`, icon: Ban },
    { label: 'Histórico', href: `${base}/historico`, icon: History },
    { label: 'Conflitos', href: `${base}/conflitos`, icon: AlertTriangle },
    { label: 'Auditoria', href: `${base}/auditoria`, icon: Activity },
  ]
}

interface Props {
  escola: string
  escolaNome: string
  logoUrl: string | null
  userName: string
  userRole: string
  onLogout: () => Promise<void>
}

export function PainelNav({ escola, escolaNome, logoUrl, userName, userRole, onLogout }: Props) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const navItems = buildNavItems(escola)

  const NavContent = () => (
    <>
      {/* Brand + ThemeToggle */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-[--p-border]">
        {logoUrl ? (
          <img src={logoUrl} alt={escolaNome} className="h-8 w-8 object-contain rounded-lg shrink-0" />
        ) : (
          <div className="w-8 h-8 rounded-lg bg-[#0ea5e9]/20 flex items-center justify-center shrink-0">
            <Car className="w-4 h-4 text-[#0ea5e9]" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-[--p-text-1] truncate leading-tight">{escolaNome}</p>
          <p className="text-[10px] text-[--p-text-3] uppercase tracking-wider">Painel Admin</p>
        </div>
        <ThemeToggle />
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                active
                  ? 'bg-[#0ea5e9]/10 text-[#0ea5e9]'
                  : 'text-[--p-text-3] hover:text-[--p-text-1] hover:bg-[--p-hover]'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {item.label}
              {active && <ChevronRight className="w-3 h-3 ml-auto opacity-60" />}
            </Link>
          )
        })}
      </nav>

      {/* User + Logout */}
      <div className="px-3 py-4 border-t border-[--p-border]">
        <div className="flex items-center gap-2.5 px-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-[#0ea5e9]/20 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-[#0ea5e9]">{userName.charAt(0).toUpperCase()}</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-[--p-text-1] truncate">{userName}</p>
            <p className="text-xs text-[--p-text-3] capitalize">{userRole.replace('_', ' ')}</p>
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
      <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-[--p-bg-card] border-b border-[--p-border] sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          {logoUrl ? (
            <img src={logoUrl} alt={escolaNome} className="h-6 w-6 object-contain rounded" />
          ) : (
            <Car className="w-5 h-5 text-[#0ea5e9]" />
          )}
          <span className="text-sm font-semibold text-[--p-text-1]">{escolaNome}</span>
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
