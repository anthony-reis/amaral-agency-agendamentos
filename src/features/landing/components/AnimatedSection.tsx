'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'

interface AnimatedSectionProps {
  children: React.ReactNode
  className?: string
  delay?: number
  direction?: 'up' | 'left' | 'right'
}

export function AnimatedSection({
  children,
  className,
  delay = 0,
  direction = 'up',
}: AnimatedSectionProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  const initial =
    direction === 'left'
      ? { opacity: 0, x: -24 }
      : direction === 'right'
        ? { opacity: 0, x: 24 }
        : { opacity: 0, y: 24 }

  const animate = isInView
    ? { opacity: 1, x: 0, y: 0 }
    : initial

  return (
    <motion.div
      ref={ref}
      initial={initial}
      animate={animate}
      transition={{
        type: 'spring',
        stiffness: 160,
        damping: 26,
        delay,
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
