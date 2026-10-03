'use client'

import { useEffect, useRef, useState } from 'react'
import { FileCheck } from 'lucide-react'
import { formatarExameBanca, type ExameBancaAgendado } from '@/lib/exameBancaTypes'

interface Props {
  exame: ExameBancaAgendado
}

const LARGURA = 220
const MARGEM = 8

/**
 * Ícone "aluno com exame de banca agendado". O balão abre no hover (mouse)
 * e no toque/clique (celular e desktop); toque fora ou rolagem fecha.
 * Usa position: fixed para não ser cortado por tabelas/cards com overflow.
 */
export function ExameBancaBadge({ exame }: Props) {
  // No celular um toque também dispara mouseenter — por isso hover (só mouse)
  // e fixo (clique/toque) são estados separados.
  const [hover, setHover] = useState(false)
  const [fixo, setFixo] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const aberto = hover || fixo
  const ref = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!aberto || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    setPos({
      top: r.bottom + 6,
      left: Math.max(MARGEM, Math.min(r.left, window.innerWidth - LARGURA - MARGEM)),
    })

    function fechar() { setFixo(false); setHover(false) }
    function fecharFora(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) fechar()
    }
    document.addEventListener('pointerdown', fecharFora)
    window.addEventListener('scroll', fechar, true)
    window.addEventListener('resize', fechar)
    return () => {
      document.removeEventListener('pointerdown', fecharFora)
      window.removeEventListener('scroll', fechar, true)
      window.removeEventListener('resize', fechar)
    }
  }, [aberto])

  const texto = `Exame de banca em ${formatarExameBanca(exame)}${exame.instructor_name ? ` com ${exame.instructor_name}` : ''}`

  return (
    <>
      <button
        ref={ref}
        type="button"
        aria-label={texto}
        aria-expanded={aberto}
        onClick={(e) => { e.stopPropagation(); setFixo((v) => !v) }}
        onPointerEnter={(e) => { if (e.pointerType === 'mouse') setHover(true) }}
        onPointerLeave={(e) => { if (e.pointerType === 'mouse') setHover(false) }}
        className="inline-flex shrink-0 items-center justify-center w-5 h-5 rounded-md bg-amber-500/15 text-amber-500 hover:bg-amber-500/25 transition-colors"
      >
        <FileCheck className="w-3 h-3" />
      </button>
      {aberto && pos && (
        <span
          role="tooltip"
          style={{ top: pos.top, left: pos.left, maxWidth: LARGURA }}
          className="fixed z-[80] w-max px-2.5 py-1.5 rounded-lg bg-[--p-bg-card] border border-amber-500/40 shadow-lg text-[11px] leading-snug font-medium text-[--p-text-1] normal-case text-left whitespace-normal"
        >
          {texto}
          <span className="block text-[10px] text-[--p-text-3] font-normal">Evite desmarcar as aulas até o exame.</span>
        </span>
      )}
    </>
  )
}
