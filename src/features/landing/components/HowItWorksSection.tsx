'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { UserPlus, CheckCircle, ClipboardCheck, BarChart3 } from 'lucide-react'
import { steps } from '../data/steps'

const iconMap: Record<string, React.ElementType> = {
  UserPlus,
  CheckCircle,
  ClipboardCheck,
  BarChart3,
}

export function HowItWorksSection() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          ref={ref}
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          <span className="text-sm font-semibold text-brand-teal uppercase tracking-widest">
            Simples e direto
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            Como funciona
          </h2>
          <p className="mt-4 text-slate-500 text-lg max-w-xl mx-auto">
            Simplicidade em cada etapa do processo
          </p>
        </motion.div>

        {/* Steps */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6 relative">
          {/* Connector line (desktop) */}
          <div className="hidden lg:block absolute top-10 left-[calc(12.5%+1.25rem)] right-[calc(12.5%+1.25rem)] h-px bg-slate-100 z-0" />

          {steps.map((step, i) => {
            const Icon = iconMap[step.icon] ?? CheckCircle
            return (
              <motion.div
                key={step.number}
                className="relative z-10 flex flex-col items-center text-center"
                initial={{ opacity: 0, y: 24 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{
                  type: 'spring',
                  stiffness: 160,
                  damping: 26,
                  delay: 0.1 + i * 0.12,
                }}
              >
                {/* Number + Icon */}
                <div className="relative mb-5">
                  <div className="w-20 h-20 rounded-full bg-white ring-2 ring-slate-100 shadow-sm flex items-center justify-center">
                    <div className="w-14 h-14 rounded-full bg-brand-teal/10 flex items-center justify-center">
                      <Icon className="w-6 h-6 text-brand-teal" strokeWidth={1.75} />
                    </div>
                  </div>
                  <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-brand-teal text-white text-xs font-bold flex items-center justify-center shadow-sm">
                    {step.number}
                  </div>
                </div>

                <h3 className="text-base font-semibold text-slate-800 mb-2 leading-snug px-2">
                  {step.title}
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed">{step.description}</p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
