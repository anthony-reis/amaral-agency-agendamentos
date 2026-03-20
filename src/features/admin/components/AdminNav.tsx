'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Car, Users, LogOut } from 'lucide-react'
import { logoutAdmin } from '../actions/authAdmin'
import { ThemeToggle } from '@/components/ThemeToggle'

const navItems = [
  { href: '/admin/clientes', label: 'Clientes', icon: Users },
]

export function AdminNav() {
  const pathname = usePathname()

  return (
    <aside className="w-60 min-h-screen bg-white dark:bg-[#1e293b] border-r border-slate-200 dark:border-white/5 flex flex-col">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-slate-100 dark:border-white/5 flex items-center gap-2">
        <Link href="/admin/clientes" className="flex items-center gap-2.5 flex-1">
          <div className="w-8 h-8 rounded-lg bg-brand-teal flex items-center justify-center shrink-0">
            <Car className="w-4 h-4 text-white" strokeWidth={2} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-white leading-none">
              Amaral<span className="text-brand-teal">Pro</span>
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Painel Admin</p>
          </div>
        </Link>
        <ThemeToggle />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-brand-teal/10 text-brand-teal'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-slate-100 dark:border-white/5">
        <form action={logoutAdmin}>
          <button
            type="submit"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-500/5 hover:text-red-600 dark:hover:text-red-400 transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Sair
          </button>
        </form>
      </div>
    </aside>
  )
}
