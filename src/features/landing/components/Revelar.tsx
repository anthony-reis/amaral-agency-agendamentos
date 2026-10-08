'use client'

import { motion, useReducedMotion } from 'framer-motion'

/** Entrada suave quando o bloco chega na tela (uma vez só). */
export function Revelar({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  const reduzir = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={reduzir ? false : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}
