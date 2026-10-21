'use client'

import { useEffect, useRef, useState } from 'react'
import { animate, motion, useMotionValue, useReducedMotion } from 'framer-motion'
import {
  ArrowDownRight, ArrowUpRight, AlertTriangle, Sparkles, TrendingDown, TrendingUp, Undo2, Clock, Trophy, Users, CreditCard,
} from 'lucide-react'
import type { FinanceiroData, LinhaAgrupada } from '../actions/financeiro'

export function fmtBRL(centavos: number): string {
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function fmtReais(reais: number): string {
  return reais.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function fmtData(iso: string): string {
  return iso.split('-').reverse().join('/')
}

export function fmtPct(v: number, casas = 1): string {
  return `${v.toLocaleString('pt-BR', { maximumFractionDigits: casas })}%`
}

// ─── Animações ────────────────────────────────────────────────────────────────

/** Número que "rola" até o valor novo (respeita prefers-reduced-motion). */
export function CountUp({ value, format }: { value: number; format: (n: number) => string }) {
  const reduzir = useReducedMotion()
  const mv = useMotionValue(value)
  const formatRef = useRef(format)
  formatRef.current = format
  const [texto, setTexto] = useState(() => format(value))

  useEffect(() => {
    if (reduzir) {
      mv.set(value)
      setTexto(formatRef.current(value))
      return
    }
    const controle = animate(mv, value, {
      duration: 0.9,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setTexto(formatRef.current(v)),
    })
    return () => controle.stop()
  }, [value, reduzir, mv])

  return <span className="tabular-nums">{texto}</span>
}

export const entrada = {
  hidden: { opacity: 0, y: 14 },
  visivel: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, delay: Math.min(i, 8) * 0.05, ease: [0.22, 1, 0.36, 1] as const },
  }),
}

// ─── Blocos ───────────────────────────────────────────────────────────────────

export function Delta({
  atual, anterior, inverso = false, curto = false,
}: { atual: number; anterior: number; inverso?: boolean; curto?: boolean }) {
  if (anterior === 0) {
    return <span className="text-[11px] text-[--p-text-3]">{curto ? 'sem base' : 'sem período anterior p/ comparar'}</span>
  }
  const v = ((atual - anterior) / Math.abs(anterior)) * 100
  const subiu = v > 0.05
  const caiu = v < -0.05
  const bom = inverso ? caiu : subiu
  const ruim = inverso ? subiu : caiu
  const cor = bom ? 'text-emerald-500 bg-emerald-500/10' : ruim ? 'text-red-400 bg-red-500/10' : 'text-[--p-text-3] bg-[--p-bg-base]'
  const Icone = subiu ? ArrowUpRight : caiu ? ArrowDownRight : null
  return (
    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[11px] font-semibold ${cor}`}>
      {Icone && <Icone className="w-3 h-3" />}
      {fmtPct(Math.abs(v))}
      {!curto && <span className="font-normal opacity-70 ml-1">vs anterior</span>}
    </span>
  )
}

export function Kpi({
  titulo, valor, icone: Icone, cor, rodape, indice = 0,
}: {
  titulo: string
  valor: React.ReactNode
  icone: React.ComponentType<{ className?: string }>
  cor: string
  rodape?: React.ReactNode
  indice?: number
}) {
  return (
    <motion.div
      variants={entrada}
      initial="hidden"
      animate="visivel"
      custom={indice}
      whileHover={{ y: -2 }}
      className="group rounded-2xl border border-[--p-border] bg-[--p-bg-card] p-4 transition-shadow hover:shadow-lg hover:shadow-black/5"
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-[--p-text-3]">{titulo}</p>
        <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${cor}`}>
          <Icone className="w-3.5 h-3.5" />
        </span>
      </div>
      <p className="text-xl font-bold text-[--p-text-1] leading-tight">{valor}</p>
      {rodape && <div className="mt-2 text-[11px] text-[--p-text-3] space-y-1">{rodape}</div>}
    </motion.div>
  )
}

export function Painel({
  titulo, icone: Icone, nota, acao, children, indice = 0,
}: {
  titulo: string
  icone: React.ComponentType<{ className?: string }>
  nota?: string
  acao?: React.ReactNode
  children: React.ReactNode
  indice?: number
}) {
  return (
    <motion.section
      variants={entrada}
      initial="hidden"
      animate="visivel"
      custom={indice}
      className="bg-[--p-bg-card] rounded-2xl border border-[--p-border] overflow-hidden"
    >
      <div className="flex items-center gap-2 px-5 py-4 border-b border-[--p-border]">
        <Icone className="w-4 h-4 text-[--p-text-3]" />
        <h2 className="text-sm font-semibold text-[--p-text-1]">{titulo}</h2>
        {nota && <span className="text-xs text-[--p-text-3] hidden sm:inline">{nota}</span>}
        {acao && <div className="ml-auto">{acao}</div>}
      </div>
      {children}
    </motion.section>
  )
}

export function Vazio({ texto }: { texto: string }) {
  return <div className="px-5 py-10 text-center text-sm text-[--p-text-3]">{texto}</div>
}

const CORES_BARRA = ['#10b981', '#0ea5e9', '#8b5cf6', '#f59e0b', '#ec4899', '#14b8a6']

/** Barras horizontais com crescimento animado e participação no total. */
export function BarrasPercentuais({ linhas, total }: { linhas: LinhaAgrupada[]; total: number }) {
  if (linhas.length === 0) return <Vazio texto="Sem vendas aprovadas no período." />
  return (
    <ul className="px-5 py-4 space-y-3.5">
      {linhas.map((l, i) => {
        const pct = total > 0 ? (l.valor_centavos / total) * 100 : 0
        return (
          <li key={l.chave}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="flex items-center gap-2 text-[--p-text-1] truncate">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: CORES_BARRA[i % CORES_BARRA.length] }} />
                <span className="truncate">{l.chave}</span>
              </span>
              <span className="shrink-0 text-[--p-text-1] font-semibold tabular-nums">{fmtBRL(l.valor_centavos)}</span>
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <div className="flex-1 h-1.5 rounded-full bg-[--p-bg-base] overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: CORES_BARRA[i % CORES_BARRA.length] }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(pct, 1)}%` }}
                  transition={{ duration: 0.7, delay: 0.1 + i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
              <span className="text-[11px] text-[--p-text-3] w-28 text-right shrink-0 tabular-nums">
                {fmtPct(pct)} · {l.vendas} venda{l.vendas === 1 ? '' : 's'}
              </span>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

/** Anel de margem: quanto da receita sobra depois do repasse. */
export function AnelMargem({ pct }: { pct: number | null }) {
  const valor = pct == null ? 0 : Math.max(0, Math.min(100, pct))
  const r = 38
  const c = 2 * Math.PI * r
  const negativa = pct != null && pct < 0
  return (
    <div className="relative w-24 h-24 shrink-0">
      <svg viewBox="0 0 96 96" className="w-full h-full -rotate-90">
        <circle cx="48" cy="48" r={r} fill="none" stroke="var(--p-border)" strokeWidth="9" />
        <motion.circle
          cx="48" cy="48" r={r} fill="none" strokeWidth="9" strokeLinecap="round"
          stroke={negativa ? '#f87171' : '#10b981'}
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - valor / 100) }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-base font-bold text-[--p-text-1] tabular-nums">{pct == null ? '—' : fmtPct(pct, 0)}</span>
        <span className="text-[10px] text-[--p-text-3]">margem</span>
      </div>
    </div>
  )
}

// ─── Insights automáticos ─────────────────────────────────────────────────────

export interface Insight {
  tipo: 'ok' | 'alerta' | 'info'
  icone: React.ComponentType<{ className?: string }>
  titulo: string
  texto: string
}

export function gerarInsights(d: FinanceiroData): Insight[] {
  const lista: Insight[] = []
  const ant = d.anterior

  if (ant.receita_centavos > 0 && d.receita_liquida_centavos >= 0) {
    const v = ((d.receita_liquida_centavos - ant.receita_centavos) / ant.receita_centavos) * 100
    if (Math.abs(v) >= 1) {
      lista.push({
        tipo: v > 0 ? 'ok' : 'alerta',
        icone: v > 0 ? TrendingUp : TrendingDown,
        titulo: v > 0 ? 'Receita em alta' : 'Receita em queda',
        texto: `${fmtPct(Math.abs(v))} ${v > 0 ? 'acima' : 'abaixo'} do período anterior (${fmtBRL(ant.receita_centavos)}).`,
      })
    }
  }

  const melhor = [...d.serie].sort((a, b) => b.receita_centavos - a.receita_centavos)[0]
  if (melhor && melhor.receita_centavos > 0) {
    const rot = d.granularidade === 'dia' ? fmtData(melhor.chave) : `${melhor.chave.slice(5, 7)}/${melhor.chave.slice(0, 4)}`
    lista.push({
      tipo: 'info',
      icone: Trophy,
      titulo: d.granularidade === 'dia' ? 'Melhor dia' : 'Melhor mês',
      texto: `${rot} faturou ${fmtBRL(melhor.receita_centavos)} em ${melhor.vendas} venda${melhor.vendas === 1 ? '' : 's'}.`,
    })
  }

  const topCat = d.por_categoria[0]
  if (topCat && d.receita_liquida_centavos > 0) {
    const pct = (topCat.valor_centavos / d.receita_liquida_centavos) * 100
    if (pct >= 60 && d.por_categoria.length > 1) {
      lista.push({
        tipo: 'info',
        icone: Sparkles,
        titulo: 'Receita concentrada',
        texto: `“${topCat.chave}” responde por ${fmtPct(pct, 0)} da receita do período.`,
      })
    }
  }

  const topVend = d.por_vendedor.find((v) => !v.chave.startsWith('Loja online'))
  if (topVend && d.receita_liquida_centavos > 0 && d.por_vendedor.length > 1) {
    lista.push({
      tipo: 'info',
      icone: Users,
      titulo: 'Quem mais vendeu',
      texto: `${topVend.chave} lidera com ${fmtPct((topVend.valor_centavos / d.receita_liquida_centavos) * 100, 0)} da receita (${topVend.vendas} vendas).`,
    })
  }

  const topForma = d.por_forma[0]
  if (topForma && d.receita_liquida_centavos > 0 && d.por_forma.length > 1) {
    lista.push({
      tipo: 'info',
      icone: CreditCard,
      titulo: 'Forma de pagamento líder',
      texto: `${topForma.chave}: ${fmtPct((topForma.valor_centavos / d.receita_liquida_centavos) * 100, 0)} do valor recebido.`,
    })
  }

  if (d.pendente_qtd > 0) {
    lista.push({
      tipo: 'alerta',
      icone: Clock,
      titulo: 'Pedidos aguardando pagamento',
      texto: `${d.pendente_qtd} pedido${d.pendente_qtd === 1 ? '' : 's'} somando ${fmtBRL(d.pendente_centavos)} ainda não foram pagos.`,
    })
  }

  if (d.reembolsos_qtd > 0) {
    lista.push({
      tipo: 'alerta',
      icone: Undo2,
      titulo: 'Reembolsos no período',
      texto: `${d.reembolsos_qtd} venda${d.reembolsos_qtd === 1 ? '' : 's'} reembolsada${d.reembolsos_qtd === 1 ? '' : 's'} (${fmtBRL(d.reembolsos_centavos)}).`,
    })
  }

  if (d.repasse_incompleto) {
    lista.push({
      tipo: 'alerta',
      icone: AlertTriangle,
      titulo: 'Repasse incompleto',
      texto: 'Há instrutores sem valor de aula/banca cadastrado — o saldo está superestimado.',
    })
  } else if (d.margem_pct != null && d.margem_pct < 0) {
    lista.push({
      tipo: 'alerta',
      icone: TrendingDown,
      titulo: 'Saldo negativo',
      texto: `O repasse (${fmtBRL(d.repasse_centavos)}) superou a receita do período.`,
    })
  }

  return lista.slice(0, 6)
}

export const COR_INSIGHT: Record<Insight['tipo'], string> = {
  ok: 'border-emerald-500/30 bg-emerald-500/5 [&_svg]:text-emerald-500',
  alerta: 'border-amber-500/30 bg-amber-500/5 [&_svg]:text-amber-500',
  info: 'border-[--p-border] bg-[--p-bg-card] [&_svg]:text-sky-500',
}
