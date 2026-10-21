'use client'

import { useId, useState } from 'react'
import { motion } from 'framer-motion'
import type { PontoSerie } from '../actions/financeiro'

interface Props {
  serie: PontoSerie[]
  granularidade: 'dia' | 'mes'
}

const W = 800
const H = 260
const PAD = { top: 14, right: 14, bottom: 30, left: 58 }

const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

function fmtBRL(centavos: number): string {
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtEixo(centavos: number): string {
  const v = centavos / 100
  if (v >= 1000) return `${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`
  return v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
}

function rotulo(chave: string, gran: 'dia' | 'mes'): string {
  if (gran === 'dia') return `${chave.slice(8, 10)}/${chave.slice(5, 7)}`
  return `${MESES_CURTOS[Number(chave.slice(5, 7)) - 1]}/${chave.slice(2, 4)}`
}

function rotuloLongo(chave: string, gran: 'dia' | 'mes'): string {
  if (gran === 'dia') return chave.split('-').reverse().join('/')
  return `${MESES_CURTOS[Number(chave.slice(5, 7)) - 1]} de ${chave.slice(0, 4)}`
}

/** Teto do eixo Y arredondado para um número "redondo" (1, 2, 2.5, 5 × 10ⁿ). */
function tetoRedondo(max: number): number {
  if (max <= 0) return 100
  const exp = Math.pow(10, Math.floor(Math.log10(max)))
  for (const m of [1, 2, 2.5, 5, 10]) if (m * exp >= max) return m * exp
  return 10 * exp
}

export function FinanceiroGrafico({ serie, granularidade }: Props) {
  const [hover, setHover] = useState<number | null>(null)
  const gradId = useId()

  const max = tetoRedondo(Math.max(...serie.map((p) => Math.max(p.receita_centavos, p.repasse_centavos)), 0))
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom
  const passo = innerW / Math.max(serie.length, 1)
  const larguraBarra = Math.max(Math.min(passo * 0.68, 38), 2)
  const x = (i: number) => PAD.left + passo * i + passo / 2
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH
  const base = PAD.top + innerH

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max)
  const cadaN = Math.ceil(serie.length / 10)
  const temRepasse = serie.some((p) => p.repasse_centavos > 0)
  const linha = serie.map((p, i) => `${x(i)},${y(p.repasse_centavos)}`).join(' ')
  const ativo = hover != null ? serie[hover] : null

  // Tooltip flutuante posicionado em % do viewBox
  const tipX = hover != null ? Math.min(Math.max((x(hover) / W) * 100, 14), 86) : 0

  return (
    <div className="relative">
      <div className="flex items-center gap-4 text-xs text-[--p-text-3] mb-2">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-emerald-500" /> Receita
        </span>
        {temRepasse && (
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 bg-violet-500 rounded" /> Repasse a instrutores
          </span>
        )}
      </div>

      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Receita e repasse no período">
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
          </defs>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--p-border)" strokeWidth={1} strokeDasharray={t === 0 ? undefined : '3 4'} />
              <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" fontSize={11} fill="var(--p-text-3)">
                {fmtEixo(t)}
              </text>
            </g>
          ))}
          {hover != null && (
            <rect x={PAD.left + passo * hover} y={PAD.top} width={passo} height={innerH} fill="var(--p-hover)" opacity={0.7} />
          )}
          {serie.map((p, i) => {
            const altura = Math.max(base - y(p.receita_centavos), 0)
            return (
              <g key={p.chave}>
                <motion.rect
                  x={x(i) - larguraBarra / 2}
                  width={larguraBarra}
                  rx={3}
                  fill={`url(#${gradId})`}
                  initial={{ y: base, height: 0 }}
                  animate={{ y: base - altura, height: altura }}
                  transition={{ duration: 0.7, delay: Math.min(i * 0.015, 0.5), ease: [0.22, 1, 0.36, 1] }}
                  opacity={hover == null || hover === i ? 1 : 0.5}
                />
                {i % cadaN === 0 && (
                  <text x={x(i)} y={H - 9} textAnchor="middle" fontSize={11} fill="var(--p-text-3)">
                    {rotulo(p.chave, granularidade)}
                  </text>
                )}
              </g>
            )
          })}
          {temRepasse && (
            <motion.polyline
              points={linha}
              fill="none"
              stroke="#8b5cf6"
              strokeWidth={2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          )}
          {serie.map((p, i) => (
            <rect
              key={`h-${p.chave}`}
              x={PAD.left + passo * i}
              y={PAD.top}
              width={passo}
              height={innerH}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onClick={() => setHover(i)}
            />
          ))}
        </svg>

        {ativo && (
          <motion.div
            key={ativo.chave}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.12 }}
            className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-xl border border-[--p-border] bg-[--p-bg-card] shadow-xl px-3 py-2 text-xs whitespace-nowrap z-10"
            style={{ left: `${tipX}%` }}
          >
            <p className="font-semibold text-[--p-text-1] mb-1">{rotuloLongo(ativo.chave, granularidade)}</p>
            <p className="text-emerald-500">Receita {fmtBRL(ativo.receita_centavos)}</p>
            <p className="text-[--p-text-3]">{ativo.vendas} venda{ativo.vendas === 1 ? '' : 's'}</p>
            {temRepasse && <p className="text-violet-400">Repasse {fmtBRL(ativo.repasse_centavos)}</p>}
          </motion.div>
        )}
      </div>
    </div>
  )
}
