'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check } from 'lucide-react'
import { ANTES_DEPOIS } from '../data/landing'
import { Revelar } from './Revelar'

export function AntesDepoisSection() {
  const [depois, setDepois] = useState(false)

  return (
    <section className="bg-white py-24 sm:py-28">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Revelar className="text-center">
          <h2 className="font-display text-4xl sm:text-5xl font-extrabold tracking-[-0.025em] text-slate-900 leading-[1.05]">
            Quanto da sua semana vai em marcar aula?
          </h2>
          <p className="mt-5 text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Compare a rotina de muita autoescola hoje com a mesma rotina dentro do AmaralPro.
          </p>
        </Revelar>

        <div className="mt-10 flex justify-center">
          <div role="tablist" aria-label="Comparar rotina" className="relative inline-flex rounded-2xl bg-papel p-1.5 ring-1 ring-slate-200">
            {[
              { valor: false, rotulo: 'Hoje' },
              { valor: true, rotulo: 'Com o AmaralPro' },
            ].map((op) => (
              <button
                key={op.rotulo}
                role="tab"
                aria-selected={depois === op.valor}
                onClick={() => setDepois(op.valor)}
                className={`relative z-10 px-5 sm:px-7 py-2.5 text-sm font-bold rounded-xl transition-colors ${
                  depois === op.valor ? (op.valor ? 'text-asfalto' : 'text-white') : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {depois === op.valor && (
                  <motion.span
                    layoutId="pilula-antes-depois"
                    className={`absolute inset-0 -z-10 rounded-xl ${op.valor ? 'bg-brand-teal' : 'bg-slate-800'}`}
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  />
                )}
                {op.rotulo}
              </button>
            ))}
          </div>
        </div>

        <ul className="mt-10 space-y-3">
          {ANTES_DEPOIS.map((item, i) => (
            <li
              key={i}
              className={`relative overflow-hidden rounded-2xl ring-1 transition-colors duration-300 ${
                depois ? 'bg-brand-teal/[0.06] ring-brand-teal/25' : 'bg-papel ring-slate-200'
              }`}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={depois ? 'depois' : 'antes'}
                  initial={{ opacity: 0, x: depois ? 24 : -24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: depois ? -24 : 24 }}
                  transition={{ duration: 0.25, delay: i * 0.04 }}
                  className="flex items-start gap-4 px-5 py-4"
                >
                  <span
                    className={`mt-0.5 w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                      depois ? 'bg-brand-teal text-asfalto' : 'bg-slate-300/60 text-slate-600'
                    }`}
                  >
                    {depois ? <Check className="w-4 h-4" strokeWidth={3} /> : <X className="w-4 h-4" strokeWidth={3} />}
                  </span>
                  <p className={`text-[15px] sm:text-base leading-relaxed ${depois ? 'text-slate-900' : 'text-slate-600'}`}>
                    {depois ? item.depois : item.antes}
                  </p>
                </motion.div>
              </AnimatePresence>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
