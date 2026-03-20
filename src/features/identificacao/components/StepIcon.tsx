'use client'

import { motion } from 'framer-motion'
import { CreditCard } from 'lucide-react'

export function StepIcon() {
  return (
    <motion.div
      className="flex items-center justify-center w-16 h-16 rounded-full bg-brand-teal/20 ring-1 ring-brand-teal/30 mb-6"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.15 }}
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.3 }}
      >
        <CreditCard className="w-7 h-7 text-brand-teal" strokeWidth={1.5} />
      </motion.div>
    </motion.div>
  )
}
