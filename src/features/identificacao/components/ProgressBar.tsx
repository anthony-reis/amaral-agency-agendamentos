'use client'

import { motion } from 'framer-motion'

interface ProgressBarProps {
  currentStep: number
  totalSteps: number
}

export function ProgressBar({ currentStep, totalSteps }: ProgressBarProps) {
  const percentage = Math.round((currentStep / totalSteps) * 100)

  return (
    <div className="w-full px-0">
      <div className="flex items-center justify-between mb-1.5 px-4">
        <span className="text-xs text-slate-400 font-medium tracking-wide">
          Etapa {currentStep} de {totalSteps}
        </span>
        <span className="text-xs text-slate-400 font-medium">{percentage}%</span>
      </div>
      <div className="h-[3px] w-full bg-white/10">
        <motion.div
          className="h-full bg-brand-teal rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
        />
      </div>
    </div>
  )
}
