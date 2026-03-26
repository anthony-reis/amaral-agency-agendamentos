'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Check, Zap, MessageSquare } from 'lucide-react'
import { pricingPlans } from '../data/pricing'
import { WHATSAPP_URL } from '../constants'

export function PricingSection() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section id="planos" className="py-24 bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Info Side */}
          <div className="lg:col-span-7">
            <motion.div
              ref={ref}
              initial={{ opacity: 0, x: -20 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.5 }}
            >
              <span className="text-xs font-bold text-brand-teal uppercase tracking-[0.2em]">
                O Próximo Passo
              </span>
              <h2 className="mt-4 text-4xl font-black text-slate-900 leading-[1.1] tracking-tight">
                Transforme sua <span className="text-brand-teal">Autoescola</span> com um investimento que se paga.
              </h2>
              <p className="mt-6 text-slate-600 text-lg leading-relaxed max-w-xl">
                Diga adeus à desorganização. Nosso plano único foi desenhado para cobrir todas as necessidades da sua operação, da implantação ao suporte diário.
              </p>

              <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-6">
                {[
                  { title: 'Implantação em 48h', desc: 'Sua escola rodando em tempo recorde.' },
                  { title: 'Suporte VIP', desc: 'Atendimento direto via WhatsApp.' },
                  { title: 'Treinamento Grátis', desc: 'Sua equipe dominando o sistema.' },
                  { title: 'Sem Fidelidade', desc: 'Transparência total no contrato.' },
                ].map((item) => (
                  <div key={item.title} className="flex gap-4">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-teal mt-2 shrink-0" />
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{item.title}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Card Side */}
          <div className="lg:col-span-5 relative">
            {/* Background decoration */}
            <div className="absolute -inset-4 bg-brand-teal/10 rounded-[2.5rem] blur-2xl pointer-events-none" />
            
            {pricingPlans.map((plan, i) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={isInView ? { opacity: 1, scale: 1 } : {}}
                transition={{ type: 'spring', stiffness: 100, damping: 20, delay: 0.2 }}
                className="relative bg-brand-navy rounded-[2rem] p-10 shadow-2xl ring-1 ring-white/10"
              >
                {/* Badge */}
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-2 px-5 py-2 bg-brand-teal text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg">
                    <Zap className="w-3 h-3" />
                    Plano Evolution
                  </span>
                </div>

                <div className="text-center mb-10">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-5xl font-black text-white tracking-tighter">R$ 997</span>
                    <span className="text-slate-400 text-sm font-semibold">/setup</span>
                  </div>
                  <div className="mt-2 text-brand-teal-light font-bold text-lg">
                    + R$ 497 <span className="text-xs opacity-70 underline decoration-2">por mês</span>
                  </div>
                  <p className="mt-6 text-slate-400 text-sm leading-relaxed">
                    Acesso completo, suporte ilimitado e todas as atualizações futuras.
                  </p>
                </div>

                <ul className="space-y-4 mb-10 border-t border-white/5 pt-10">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-brand-teal/20 flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 text-brand-teal" strokeWidth={3} />
                      </div>
                      <span className="text-sm text-slate-300 font-medium">{feature}</span>
                    </li>
                  ))}
                </ul>

                <motion.a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center justify-center gap-3 w-full py-5 px-6 bg-brand-teal text-white text-base font-black rounded-2xl hover:bg-brand-teal-dark transition-all shadow-xl shadow-brand-teal/30"
                >
                  <MessageSquare className="w-5 h-5" />
                  Garantir Minha Vaga
                </motion.a>

                <p className="mt-6 text-center text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                  Implantação em até 48 horas
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
