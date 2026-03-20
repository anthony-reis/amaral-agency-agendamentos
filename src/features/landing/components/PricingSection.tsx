'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Check, Zap } from 'lucide-react'
import { pricingPlans } from '../data/pricing'

export function PricingSection() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section id="planos" className="py-24 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          ref={ref}
          className="text-center mb-14"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          <span className="text-sm font-semibold text-brand-teal uppercase tracking-widest">
            Investimento
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            Planos e Investimento
          </h2>
          <p className="mt-4 text-slate-500 text-lg max-w-xl mx-auto">
            Transforme sua autoescola com tecnologia de ponta por um preço acessível.
          </p>
        </motion.div>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {pricingPlans.map((plan, i) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 28 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ type: 'spring', stiffness: 150, damping: 24, delay: 0.15 + i * 0.12 }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className={`relative rounded-2xl p-7 ${
                plan.highlighted
                  ? 'bg-brand-navy ring-2 ring-brand-teal shadow-card-lg'
                  : 'bg-white ring-1 ring-slate-200 shadow-card'
              }`}
            >
              {/* Badge */}
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-brand-teal text-white text-xs font-bold rounded-full shadow-sm">
                    <Zap className="w-3 h-3" />
                    {plan.badge}
                  </span>
                </div>
              )}

              {/* Plan name */}
              <p
                className={`text-sm font-semibold uppercase tracking-widest mb-1 ${
                  plan.highlighted ? 'text-brand-teal' : 'text-slate-500'
                }`}
              >
                {plan.name}
              </p>

              {/* Price */}
              <div className="flex items-end gap-1 mb-2">
                <span
                  className={`text-4xl font-bold tracking-tight ${
                    plan.highlighted ? 'text-white' : 'text-slate-900'
                  }`}
                >
                  {plan.price}
                </span>
                <span
                  className={`text-sm mb-1.5 ${plan.highlighted ? 'text-slate-400' : 'text-slate-400'}`}
                >
                  {plan.period}
                </span>
              </div>

              {/* Description */}
              <p
                className={`text-sm leading-relaxed mb-6 ${
                  plan.highlighted ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                {plan.description}
              </p>

              {/* Features */}
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2.5">
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                        plan.highlighted ? 'bg-brand-teal/20' : 'bg-brand-teal/10'
                      }`}
                    >
                      <Check className="w-3 h-3 text-brand-teal" strokeWidth={2.5} />
                    </div>
                    <span
                      className={`text-sm ${plan.highlighted ? 'text-slate-300' : 'text-slate-600'}`}
                    >
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`w-full py-3 px-4 rounded-xl text-sm font-semibold transition-colors ${
                  plan.highlighted
                    ? 'bg-brand-teal text-white hover:bg-brand-teal-dark'
                    : 'bg-slate-900 text-white hover:bg-slate-800'
                }`}
              >
                {plan.cta}
              </motion.button>
            </motion.div>
          ))}
        </div>

        {/* Guarantee note */}
        <motion.p
          className="text-center text-sm text-slate-400 mt-8"
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: 0.5 }}
        >
          Implantação em até 48h • Suporte incluído • Sem contrato de fidelidade
        </motion.p>
      </div>
    </section>
  )
}
