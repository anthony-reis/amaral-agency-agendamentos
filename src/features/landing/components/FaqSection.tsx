'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus } from 'lucide-react'
import { FAQ } from '../data/landing'
import { Revelar } from './Revelar'

export function FaqSection() {
  const [aberta, setAberta] = useState<number | null>(0)

  return (
    <section id="duvidas" className="bg-white py-24 sm:py-28 scroll-mt-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <Revelar>
          <h2 className="font-display text-4xl sm:text-5xl font-extrabold tracking-[-0.025em] text-slate-900 leading-[1.05]">
            Perguntas que todo dono de autoescola faz.
          </h2>
        </Revelar>

        <div className="mt-10 divide-y divide-slate-200 border-y border-slate-200">
          {FAQ.map((item, i) => {
            const aberto = aberta === i
            return (
              <div key={item.pergunta}>
                <h3>
                  <button
                    type="button"
                    onClick={() => setAberta(aberto ? null : i)}
                    aria-expanded={aberto}
                    aria-controls={`faq-${i}`}
                    className="w-full flex items-center justify-between gap-6 py-5 text-left text-base sm:text-lg font-semibold text-slate-900 hover:text-brand-teal-dark transition-colors"
                  >
                    {item.pergunta}
                    <motion.span
                      animate={{ rotate: aberto ? 45 : 0 }}
                      transition={{ duration: 0.2 }}
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${aberto ? 'bg-asfalto text-white' : 'bg-papel text-slate-600'}`}
                    >
                      <Plus className="w-4 h-4" />
                    </motion.span>
                  </button>
                </h3>
                <AnimatePresence initial={false}>
                  {aberto && (
                    <motion.div
                      id={`faq-${i}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <p className="pb-6 pr-12 text-slate-600 leading-relaxed">{item.resposta}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
