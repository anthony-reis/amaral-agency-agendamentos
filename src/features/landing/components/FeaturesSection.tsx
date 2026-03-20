'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import {
  Calendar,
  LayoutDashboard,
  UserCheck,
  User,
  FileDigit,
  MessageSquare,
  RefreshCw,
  GraduationCap,
} from 'lucide-react'
import { features } from '../data/features'

const iconMap: Record<string, React.ElementType> = {
  Calendar,
  LayoutDashboard,
  UserCheck,
  User,
  FileDigit,
  MessageSquare,
  RefreshCw,
  GraduationCap,
}

export function FeaturesSection() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section id="recursos" className="py-24 bg-slate-50">
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
            Plataforma completa
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            Recursos completos
          </h2>
          <p className="mt-4 text-slate-500 text-lg max-w-xl mx-auto">
            Tudo que sua autoescola precisa em um só lugar
          </p>
        </motion.div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((feature, i) => {
            const Icon = iconMap[feature.icon] ?? Calendar
            return (
              <FeatureCard key={feature.title} feature={feature} Icon={Icon} index={i} isInView={isInView} />
            )
          })}
        </div>
      </div>
    </section>
  )
}

function FeatureCard({
  feature,
  Icon,
  index,
  isInView,
}: {
  feature: (typeof features)[0]
  Icon: React.ElementType
  index: number
  isInView: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{
        type: 'spring',
        stiffness: 160,
        damping: 26,
        delay: 0.1 + index * 0.06,
      }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-slate-100 hover:shadow-md hover:ring-brand-teal/20 transition-shadow group cursor-default"
    >
      <div className="w-10 h-10 rounded-xl bg-brand-teal/10 flex items-center justify-center mb-4 group-hover:bg-brand-teal/15 transition-colors">
        <Icon className="w-5 h-5 text-brand-teal" strokeWidth={1.75} />
      </div>
      <h3 className="text-sm font-semibold text-slate-800 mb-1.5 leading-snug">{feature.title}</h3>
      <p className="text-xs text-slate-500 leading-relaxed">{feature.description}</p>
    </motion.div>
  )
}
