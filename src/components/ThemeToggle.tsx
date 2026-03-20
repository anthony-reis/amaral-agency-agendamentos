'use client'

import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'
import { useEffect, useState } from 'react'

interface Props {
  className?: string
}

export function ThemeToggle({ className = '' }: Props) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  if (!mounted) {
    return <div className={`w-8 h-8 ${className}`} />
  }

  const isDark = theme === 'dark'

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      title={isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
      className={`p-2 rounded-lg transition-colors ${
        isDark
          ? 'text-slate-400 hover:text-yellow-300 hover:bg-white/5'
          : 'text-slate-500 hover:text-amber-500 hover:bg-slate-100'
      } ${className}`}
    >
      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  )
}
