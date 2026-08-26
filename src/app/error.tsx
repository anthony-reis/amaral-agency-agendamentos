'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Home, MessageCircle, RefreshCcw, ServerCrash } from 'lucide-react'
import { WHATSAPP_URL } from '@/features/landing/constants'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <section className="relative min-h-screen bg-white overflow-hidden flex items-center">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-bl from-slate-50 via-teal-50/30 to-transparent" />
        <div className="absolute top-20 right-10 w-96 h-96 bg-brand-teal/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-brand-teal/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-teal/10 ring-1 ring-brand-teal/20 mb-8">
          <ServerCrash className="w-8 h-8 text-brand-teal" />
        </div>

        <p className="text-sm font-semibold text-brand-teal tracking-wider uppercase mb-3">
          Erro 500
        </p>

        <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 leading-tight tracking-tight mb-4">
          Algo deu errado
        </h1>

        <p className="text-lg text-slate-500 leading-relaxed max-w-md mx-auto mb-10">
          Ocorreu um erro inesperado ao processar sua solicitação. Nossa equipe já foi notificada — tente novamente em instantes.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-brand-teal text-white font-semibold rounded-xl shadow-md hover:bg-brand-teal-dark transition-colors w-full sm:w-auto"
          >
            <RefreshCcw className="w-4 h-4" />
            Tentar novamente
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white text-slate-700 font-semibold rounded-xl border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all w-full sm:w-auto"
          >
            <Home className="w-4 h-4 text-brand-teal" />
            Voltar para o início
          </Link>
        </div>

        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 mt-6 text-sm text-slate-400 hover:text-brand-teal transition-colors"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          Se o problema persistir, fale com o suporte
        </a>
      </div>
    </section>
  )
}
