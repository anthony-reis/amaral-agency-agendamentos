'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { ArrowRight, Sparkles } from 'lucide-react'

export function FinalCtaSection() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section className="py-24 bg-gradient-navy relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-80 h-80 bg-brand-teal/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-brand-teal/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ type: 'spring', stiffness: 150, damping: 26 }}
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-brand-teal/15 border border-brand-teal/25 rounded-full mb-8">
            <Sparkles className="w-3.5 h-3.5 text-brand-teal" />
            <span className="text-xs font-semibold text-brand-teal tracking-wide">
              Pronto para começar?
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight tracking-tight mb-6">
            Sua autoescola no{' '}
            <span className="text-brand-teal">futuro</span>, agora.
          </h2>

          <p className="text-slate-400 text-lg leading-relaxed max-w-2xl mx-auto mb-10">
            Gestão inteligente, agendamentos automáticos e controle total em um só sistema. Implantação em até 48h.
          </p>

          <motion.a
            href="#planos"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className="inline-flex items-center gap-2 px-8 py-4 bg-brand-teal text-white font-semibold rounded-2xl shadow-lg hover:bg-brand-teal-dark transition-colors text-base"
          >
            Quero transformar minha autoescola
            <ArrowRight className="w-5 h-5" />
          </motion.a>

          {/* Trust signals */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-teal" />
              Sem taxa de adesão
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-teal" />
              Suporte na implantação
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-teal" />
              Cancele quando quiser
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
