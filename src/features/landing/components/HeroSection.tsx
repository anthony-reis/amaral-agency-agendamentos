'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  CalendarCheck, QrCode, Gauge, Award, Layers, UserX, CheckCircle2, MessageCircle, ChevronRight,
} from 'lucide-react'
import { WHATSAPP_URL } from '../constants'
import { EVENTOS, type TipoEvento } from '../data/landing'

const ICONE: Record<TipoEvento, typeof CalendarCheck> = {
  agenda: CalendarCheck, pix: QrCode, km: Gauge, exame: Award, credito: Layers, falta: UserX,
}
const COR: Record<TipoEvento, string> = {
  agenda: 'bg-brand-teal/15 text-brand-teal-dark',
  pix: 'bg-emerald-500/15 text-emerald-600',
  km: 'bg-sky-500/15 text-sky-600',
  exame: 'bg-amber-400/20 text-amber-600',
  credito: 'bg-violet-500/15 text-violet-600',
  falta: 'bg-rose-500/15 text-rose-600',
}

const AGENDA = [
  { hora: '08:00', aluno: 'Ana Paula', instrutor: 'Marcos', cat: 'B', status: 'Concluída' },
  { hora: '09:00', aluno: 'Rafael Lima', instrutor: 'Júlia', cat: 'A', status: 'Em aula' },
  { hora: '10:30', aluno: 'Bianca Rocha', instrutor: 'Marcos', cat: 'B', status: 'Agendada' },
  { hora: '14:00', aluno: 'Lucas Prado', instrutor: 'Carla', cat: 'B', status: 'Agendada' },
]

const STATUS_COR: Record<string, string> = {
  'Concluída': 'bg-white/10 text-white/60',
  'Em aula': 'bg-brand-teal/20 text-brand-teal-light',
  'Agendada': 'bg-faixa/15 text-faixa',
}

const CORES_MOTO = ['#F43F5E', '#14B8A6', '#FACC15', '#3B82F6', '#F97316', '#A855F7']

/**
 * Moto vista de cima andando pela pista reta do hero, com farol aceso.
 * Anda por requestAnimationFrame (como os veículos das estradas), troca de
 * cor a cada passagem e pausa quando a pista sai da tela.
 */
function MotoNaPista() {
  const reduzir = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const [volta, setVolta] = useState(0)
  const cor = CORES_MOTO[volta % CORES_MOTO.length]

  useEffect(() => {
    const el = ref.current
    const pista = el?.parentElement
    if (!el || !pista) return
    const LARGURA_MOTO = 84
    const VELOCIDADE = 220 // px por segundo

    if (reduzir) {
      el.style.transform = `translateX(${pista.clientWidth * 0.4}px)`
      return
    }

    let x = -LARGURA_MOTO
    let anterior = 0
    let raf = 0
    let visivel = false

    const quadro = (agora: number) => {
      if (anterior) x += ((agora - anterior) / 1000) * VELOCIDADE
      anterior = agora
      if (x > pista.clientWidth) {
        x = -LARGURA_MOTO
        setVolta((v) => v + 1)
      }
      el.style.transform = `translateX(${x}px)`
      if (visivel) raf = requestAnimationFrame(quadro)
    }

    const io = new IntersectionObserver(([e]) => {
      visivel = e.isIntersecting
      cancelAnimationFrame(raf)
      anterior = 0
      if (visivel) raf = requestAnimationFrame(quadro)
    })
    el.style.transform = `translateX(${x}px)`
    io.observe(pista)
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [reduzir])

  return (
    <div ref={ref} className="absolute left-0 top-[68%] will-change-transform">
      <svg width="84" height="26" viewBox="0 0 84 26" className="-translate-y-1/2">
        <defs>
          <linearGradient id="farol-moto" x1="0" x2="1">
            <stop offset="0" stopColor="#FEF9C3" stopOpacity=".85" />
            <stop offset="1" stopColor="#FEF9C3" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points="40,11 84,5 84,21 40,15" fill="url(#farol-moto)" />
        <rect x="2" y="10" width="10" height="6" rx="3" fill="#0B1220" />
        <rect x="28" y="10" width="10" height="6" rx="3" fill="#0B1220" />
        <rect x="8" y="9" width="24" height="8" rx="4" fill={cor} style={{ transition: 'fill .4s' }} />
        <rect x="29" y="5" width="2.5" height="16" rx="1.2" fill="#CBD5E1" />
        <circle cx="19" cy="13" r="5.5" fill="#0D1628" />
        <circle cx="20" cy="13" r="3" fill={cor} opacity=".85" />
        <circle cx="38.5" cy="13" r="2" fill="#FFFBEB" />
        <rect x="1" y="11.5" width="2" height="3" rx="1" fill="#EF4444" />
      </svg>
    </div>
  )
}

/** Painel com um "dia da autoescola" acontecendo: eventos entram e os números sobem. */
function DiaAoVivo() {
  const reduzir = useReducedMotion()
  const [passo, setPasso] = useState(0)

  useEffect(() => {
    if (reduzir) return
    const id = setInterval(() => setPasso((p) => p + 1), 2600)
    return () => clearInterval(id)
  }, [reduzir])

  // Últimos 2 eventos, o mais novo em cima.
  const visiveis = [0, 1]
    .map((k) => passo - k)
    .filter((i) => i >= 0)
    .map((i) => ({ chave: i, ...EVENTOS[i % EVENTOS.length] }))

  const contar = (tipo: TipoEvento) =>
    Array.from({ length: passo + 1 }, (_, i) => EVENTOS[i % EVENTOS.length]).filter((e) => e.tipo === tipo).length

  const numeros = [
    { rotulo: 'Aulas hoje', valor: 13 + contar('agenda') },
    { rotulo: 'Vendas no Pix', valor: 3 + contar('pix') },
    { rotulo: 'Km rodados', valor: 212 + contar('km') * 18 },
  ]

  return (
    <div className="relative">
      <div className="relative rounded-[22px] bg-asfalto-2 ring-1 ring-white/10 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.6)] overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/5">
          <div>
            <p className="text-[13px] font-semibold text-white">Hoje na autoescola</p>
            <p className="text-[11px] text-white/40">Painel da equipe</p>
          </div>
          <span className="flex items-center gap-1.5 text-[11px] font-medium text-brand-teal-light">
            <span className="relative flex w-2 h-2">
              <span className="absolute inline-flex w-full h-full rounded-full bg-brand-teal opacity-60 motion-safe:animate-ping" />
              <span className="relative inline-flex w-2 h-2 rounded-full bg-brand-teal" />
            </span>
            ao vivo
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 p-4">
          {numeros.map((n) => (
            <div key={n.rotulo} className="rounded-xl bg-white/[0.04] ring-1 ring-white/5 px-3 py-2.5">
              <motion.p
                key={n.valor}
                initial={reduzir ? false : { y: 6, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="font-display text-xl font-bold text-white tabular-nums"
              >
                {n.valor}
              </motion.p>
              <p className="text-[10px] text-white/45 mt-0.5">{n.rotulo}</p>
            </div>
          ))}
        </div>

        <div className="px-4 pb-4 space-y-1.5">
          {AGENDA.map((a) => (
            <div key={a.hora} className="flex items-center gap-3 rounded-xl bg-white/[0.03] px-3 py-2">
              <span className="text-[11px] font-semibold text-white/50 tabular-nums w-9">{a.hora}</span>
              <span className="flex-1 min-w-0">
                <span className="block text-[12px] font-medium text-white truncate">{a.aluno}</span>
                <span className="block text-[10px] text-white/40 truncate">Cat. {a.cat} com {a.instrutor}</span>
              </span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COR[a.status]}`}>{a.status}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Notificações chegando */}
      <div className="absolute left-3 sm:-left-10 -bottom-12 w-[min(320px,calc(100%-24px))] space-y-2" aria-live="polite">
        <AnimatePresence initial={false}>
          {visiveis.map((e, i) => {
            const Icone = ICONE[e.tipo]
            return (
              <motion.div
                key={e.chave}
                layout
                initial={{ opacity: 0, y: 24, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 - i * 0.04 }}
                exit={{ opacity: 0, scale: 0.94 }}
                transition={{ type: 'spring', stiffness: 260, damping: 26 }}
                className="flex items-start gap-3 rounded-2xl bg-white px-3.5 py-3 shadow-[0_18px_40px_-12px_rgba(13,22,40,0.45)] ring-1 ring-slate-900/5"
              >
                <span className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${COR[e.tipo]}`}>
                  <Icone className="w-4 h-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold text-slate-900 leading-snug">{e.titulo}</span>
                  <span className="block text-[11px] text-slate-500 leading-snug mt-0.5">{e.detalhe}</span>
                </span>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}

export function HeroSection() {
  return (
    <section className="relative bg-asfalto overflow-hidden">
      {/* Textura de asfalto: pontos bem sutis */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }}
      />
      <div aria-hidden className="absolute -top-40 right-[-10%] w-[640px] h-[640px] rounded-full bg-brand-teal/15 blur-[120px]" />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 sm:pt-32 pb-28 lg:pb-32">
        <div className="grid lg:grid-cols-[1.05fr_1fr] gap-14 lg:gap-12 items-center">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="font-display text-[2.5rem] leading-[1.04] sm:text-6xl lg:text-[3.9rem] font-extrabold text-white tracking-[-0.035em] [text-wrap:balance]"
            >
              A autoescola inteira num lugar só.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="mt-6 text-lg text-white/70 leading-relaxed max-w-[34rem]"
            >
              Agenda online, app do aluno e do instrutor, créditos, vendas com Pix, exames e financeiro no mesmo
              sistema. Você para de correr atrás de planilha e de mensagem no WhatsApp e acompanha tudo pelo painel.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="mt-9 flex flex-col sm:flex-row gap-3"
            >
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl bg-brand-teal text-asfalto font-bold text-base hover:bg-brand-teal-light transition-colors shadow-[0_12px_32px_-8px_rgba(20,184,166,0.6)]"
              >
                <MessageCircle className="w-5 h-5" />
                Quero ver funcionando
              </a>
              <a
                href="#planos"
                className="inline-flex items-center justify-center gap-1.5 px-6 py-4 rounded-2xl text-white font-semibold ring-1 ring-white/20 hover:bg-white/5 transition-colors"
              >
                Ver planos e preços
                <ChevronRight className="w-4 h-4" />
              </a>
            </motion.div>

            <motion.ul
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.45 }}
              className="mt-8 flex flex-wrap gap-x-6 gap-y-2.5 text-sm text-white/75"
            >
              {['Implantação em até 48h', 'Suporte pelo WhatsApp', 'Sem fidelidade'].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-brand-teal" />
                  {t}
                </li>
              ))}
            </motion.ul>

            <p className="mt-10 text-sm text-white/45">
              Já usa o AmaralPro? Entre como{' '}
              <Link href="/entrar?perfil=aluno" className="text-white/80 underline underline-offset-4 hover:text-white">aluno</Link>{' '}
              ou como{' '}
              <Link href="/entrar?perfil=escola" className="text-white/80 underline underline-offset-4 hover:text-white">autoescola</Link>.
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="relative lg:pl-6 pb-10"
          >
            <DiaAoVivo />
          </motion.div>
        </div>
      </div>

      {/* Faixa de pista */}
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-14 bg-asfalto-3/80 border-t border-white/5 flex items-center overflow-hidden">
        <MotoNaPista />
        <div
          className="w-full h-[5px] motion-safe:animate-faixa"
          style={{
            backgroundImage: 'linear-gradient(90deg, #FACC15 0 36px, transparent 36px 64px)',
            backgroundSize: '64px 5px',
          }}
        />
      </div>
    </section>
  )
}
