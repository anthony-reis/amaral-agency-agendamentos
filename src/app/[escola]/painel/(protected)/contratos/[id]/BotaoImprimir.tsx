'use client'

import { Printer } from 'lucide-react'

export function BotaoImprimir() {
  return (
    <button
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[--p-accent] text-white text-sm font-semibold hover:opacity-90 print:hidden"
    >
      <Printer className="w-4 h-4" /> Imprimir / salvar PDF
    </button>
  )
}
