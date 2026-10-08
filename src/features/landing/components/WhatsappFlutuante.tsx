'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle } from 'lucide-react'
import { WHATSAPP_URL } from '../constants'

/**
 * Atalho para o WhatsApp que aparece depois do hero: botão redondo no
 * desktop, barra fixa no rodapé do celular.
 */
export function WhatsappFlutuante() {
  const [visivel, setVisivel] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisivel(window.scrollY > window.innerHeight * 0.8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <AnimatePresence>
      {visivel && (
        <>
          <motion.a
            key="desktop"
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Falar com a gente no WhatsApp"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="hidden md:flex fixed bottom-6 right-6 z-40 items-center gap-2 rounded-full bg-[#25D366] pl-4 pr-5 py-3.5 text-white font-bold shadow-[0_14px_34px_-8px_rgba(37,211,102,0.65)] hover:brightness-105"
          >
            <MessageCircle className="w-5 h-5" />
            WhatsApp
          </motion.a>
          <motion.div
            key="mobile"
            initial={{ y: 80 }}
            animate={{ y: 0 }}
            exit={{ y: 80 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="md:hidden fixed inset-x-0 bottom-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
          >
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-2xl bg-[#25D366] py-3.5 text-white font-bold"
            >
              <MessageCircle className="w-5 h-5" />
              Falar com a gente no WhatsApp
            </a>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
