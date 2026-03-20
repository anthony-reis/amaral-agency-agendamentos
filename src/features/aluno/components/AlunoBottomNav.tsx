'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, BookOpen } from 'lucide-react'
import { ThemeToggle } from '@/components/ThemeToggle'

interface Props {
  escola: string
  isIdentified: boolean
}

export function AlunoBottomNav({ escola, isIdentified }: Props) {
  const pathname = usePathname()
  const isMinhasAulas = pathname.includes('/minhas-aulas')

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[--p-bg-card] border-t border-[--p-border] flex items-stretch">
      <Link
        href={`/${escola}/aluno`}
        className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 text-xs font-medium transition-colors ${
          !isMinhasAulas ? 'text-[--p-accent]' : 'text-[--p-text-3] hover:text-[--p-text-2]'
        }`}
      >
        <CalendarDays className="w-5 h-5" />
        Agendar
      </Link>

      {isIdentified && (
        <Link
          href={`/${escola}/aluno/minhas-aulas`}
          className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 text-xs font-medium transition-colors ${
            isMinhasAulas ? 'text-[--p-accent]' : 'text-[--p-text-3] hover:text-[--p-text-2]'
          }`}
        >
          <BookOpen className="w-5 h-5" />
          Minhas Aulas
        </Link>
      )}

      <div className="flex items-center justify-center px-3">
        <ThemeToggle />
      </div>
    </nav>
  )
}
