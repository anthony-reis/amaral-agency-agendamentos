'use client'

import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'

// Traçados da estrada (viewBox 1440 x 240). Cada divisória usa um diferente.
const TRACADOS = [
  'M -60 196 C 220 196, 320 64, 580 72 S 920 204, 1140 170 S 1380 56, 1500 64',
  'M -60 64 C 260 40, 400 204, 720 184 S 1120 40, 1500 156',
]

const COR_ASFALTO = '#13203A'
// A cada volta o veículo troca de cor.
const CORES = ['#14B8A6', '#F43F5E', '#FACC15', '#3B82F6', '#F97316', '#A855F7', '#F8FAFC']
// Velocidade em unidades do desenho por segundo (o desenho tem 1440 de largura).
const VELOCIDADE = { carro: 190, onibus: 135 }

type Placa = { tipo: 'curva'; x: number; y: number } | { tipo: 'indicacao'; x: number; y: number; linhas: string[] }

interface Props {
  /** Cor da seção de cima e da de baixo: a estrada atravessa a divisa. */
  de: string
  para: string
  tracado?: 0 | 1
  veiculo?: 'carro' | 'onibus'
  /** "volta" anda da direita para a esquerda, na outra mão. */
  sentido?: 'ida' | 'volta'
  /** Placa desenhada nas coordenadas do SVG (acompanha a estrada em qualquer tela). */
  placa?: Placa
}

function Farois({ id, frente, largura }: { id: string; frente: number; largura: number }) {
  const m = largura / 2
  return (
    <>
      {/* fachos estreitos, quase paralelos, para não sair da pista */}
      <polygon points={`${frente},${-m + 3} ${frente + 64},${-m} ${frente + 64},${-m + 12} ${frente},${-m + 6}`} fill={`url(#${id})`} />
      <polygon points={`${frente},${m - 3} ${frente + 64},${m} ${frente + 64},${m - 12} ${frente},${m - 6}`} fill={`url(#${id})`} />
    </>
  )
}

/** Carro visto de cima, apontando para a direita. */
function Carro({ cor, luz }: { cor: string; luz: string }) {
  return (
    <g transform="scale(1.35)">
      <Farois id={luz} frente={19} largura={20} />
      <rect x="-19" y="-10" width="38" height="20" rx="6" fill={cor} style={{ transition: 'fill .4s' }} />
      <rect x="2" y="-7.5" width="9" height="15" rx="2.5" fill="#0D1628" opacity=".75" />
      <rect x="-13" y="-7" width="7" height="14" rx="2" fill="#0D1628" opacity=".55" />
      <rect x="16" y="-8" width="3.5" height="4" rx="1" fill="#FFFBEB" />
      <rect x="16" y="4" width="3.5" height="4" rx="1" fill="#FFFBEB" />
      <rect x="-19.5" y="-8" width="2.5" height="3.5" rx="1" fill="#EF4444" />
      <rect x="-19.5" y="4.5" width="2.5" height="3.5" rx="1" fill="#EF4444" />
    </g>
  )
}

/** Ônibus visto de cima, apontando para a direita. */
function Onibus({ cor, luz }: { cor: string; luz: string }) {
  return (
    <g>
      <Farois id={luz} frente={38} largura={24} />
      <rect x="-38" y="-12" width="76" height="24" rx="4" fill={cor} style={{ transition: 'fill .4s' }} />
      {/* teto: faixa de janelas e ar-condicionado */}
      <rect x="-33" y="-8.5" width="62" height="17" rx="2.5" fill="#0D1628" opacity=".18" />
      <rect x="-14" y="-5" width="18" height="10" rx="2" fill="#F8FAFC" opacity=".55" />
      <rect x="30" y="-10" width="5" height="20" rx="1.5" fill="#0D1628" opacity=".7" />
      <rect x="36" y="-10" width="2.5" height="4" rx="1" fill="#FFFBEB" />
      <rect x="36" y="6" width="2.5" height="4" rx="1" fill="#FFFBEB" />
      <rect x="-38.5" y="-10" width="2.5" height="4" rx="1" fill="#EF4444" />
      <rect x="-38.5" y="6" width="2.5" height="4" rx="1" fill="#EF4444" />
    </g>
  )
}

function PlacaSvg({ placa }: { placa: Placa }) {
  if (placa.tipo === 'curva') {
    // A-4b pista sinuosa: losango amarelo de borda preta, no poste.
    return (
      <g transform={`translate(${placa.x} ${placa.y})`}>
        <rect x="-3" y="58" width="6" height="74" rx="1.5" fill="#94A3B8" />
        <g transform="translate(0 32) rotate(45)">
          <rect x="-26" y="-26" width="52" height="52" rx="5" fill="#111" />
          <rect x="-23" y="-23" width="46" height="46" rx="3.5" fill="#FFC20E" />
        </g>
        <path d="M-6 50 C -6 42, 6 40, 6 32 C 6 25, -6 24, -6 17" fill="none" stroke="#111" strokeWidth="4" strokeLinecap="round" />
        <path d="M-11 20 L-6 12 L-1 20" fill="none" stroke="#111" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    )
  }
  // Placa de indicação verde, em dois postes.
  const largura = 150
  return (
    <g transform={`translate(${placa.x} ${placa.y})`} fontFamily="Arial, Helvetica, sans-serif" fontWeight="700">
      <rect x="18" y="50" width="6" height="70" rx="1.5" fill="#94A3B8" />
      <rect x={largura - 24} y="50" width="6" height="70" rx="1.5" fill="#94A3B8" />
      <rect x="0" y="0" width={largura} height="56" rx="6" fill="#fff" />
      <rect x="3" y="3" width={largura - 6} height="50" rx="4" fill="#00704A" />
      {placa.linhas.map((l, i) => (
        <text key={l} x="14" y={24 + i * 18} fontSize="15" fill="#fff">{l}</text>
      ))}
      <path d={`M${largura - 28} 16 v22 M${largura - 36} 30 l8 9 l8 -9`} fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  )
}

/** Divisória em forma de estrada com curvas e um veículo que roda em loop. */
export function Estrada({ de, para, tracado = 0, veiculo = 'carro', sentido = 'ida', placa }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const caminho = useRef<SVGPathElement>(null)
  const grupo = useRef<SVGGElement>(null)
  const reduzir = useReducedMotion()
  const [cor, setCor] = useState(() => CORES[(tracado * 3) % CORES.length])

  useEffect(() => {
    const p = caminho.current
    const g = grupo.current
    const caixa = ref.current
    if (!p || !g || !caixa) return
    const total = p.getTotalLength()
    const volta = sentido === 'volta'
    // Distância da faixa central até o meio da mão em que o veículo anda.
    const mao = veiculo === 'onibus' ? 15 : 14

    function posicionar(l: number) {
      l = Math.min(total - 3, Math.max(3, l))
      // Direção de movimento: na volta, o caminho é percorrido ao contrário.
      const a = p!.getPointAtLength(volta ? l + 3 : l - 3)
      const b = p!.getPointAtLength(volta ? l - 3 : l + 3)
      const ang = Math.atan2(b.y - a.y, b.x - a.x)
      const pt = p!.getPointAtLength(l)
      // Mão direita em relação ao sentido do veículo.
      const x = pt.x - Math.sin(ang) * mao
      const y = pt.y + Math.cos(ang) * mao
      g!.setAttribute('transform', `translate(${x} ${y}) rotate(${(ang * 180) / Math.PI})`)
    }

    /** Comprimento do caminho em que ele passa pela coordenada x (traçados crescem em x). */
    function comprimentoNoX(x: number) {
      let lo = 0
      let hi = total
      for (let k = 0; k < 24; k++) {
        const mid = (lo + hi) / 2
        if (p!.getPointAtLength(mid).x < x) lo = mid
        else hi = mid
      }
      return (lo + hi) / 2
    }

    // Trecho do caminho que aparece na tela. No celular o desenho é recortado
    // nas laterais: o loop percorre só a parte visível, mais uma folga para o
    // veículo entrar e sair por inteiro.
    let inicio = 0
    let fim = total
    function medirTrechoVisivel() {
      const { width, height } = caixa!.getBoundingClientRect()
      if (!width || !height) return
      const escala = Math.max(width / 1440, height / 240)
      const larguraVisivel = width / escala
      const folga = 110
      inicio = comprimentoNoX(720 - larguraVisivel / 2 - folga)
      fim = comprimentoNoX(720 + larguraVisivel / 2 + folga)
    }
    medirTrechoVisivel()

    if (reduzir) {
      posicionar(inicio + (fim - inicio) * 0.45)
      return
    }

    let raf = 0
    let visivel = false
    let anterior = 0
    let andado = (fim - inicio) * 0.15 // distância já percorrida no trecho
    let voltas = 0
    const velocidade = VELOCIDADE[veiculo]

    const quadro = (agora: number) => {
      if (anterior) andado += ((agora - anterior) / 1000) * velocidade
      anterior = agora
      if (andado > fim - inicio) {
        andado = 0
        voltas += 1
        setCor(CORES[(tracado * 3 + voltas) % CORES.length])
      }
      posicionar(volta ? fim - andado : inicio + andado)
      if (visivel) raf = requestAnimationFrame(quadro)
    }

    // Só anima enquanto a estrada aparece na tela.
    const io = new IntersectionObserver(([e]) => {
      visivel = e.isIntersecting
      cancelAnimationFrame(raf)
      anterior = 0
      if (visivel) raf = requestAnimationFrame(quadro)
    })
    // Tela mudou de tamanho (girou o celular, redimensionou): refaz o trecho.
    const ro = new ResizeObserver(() => {
      medirTrechoVisivel()
      andado = Math.min(andado, fim - inicio)
    })
    posicionar(volta ? fim - andado : inicio + andado)
    io.observe(caixa)
    ro.observe(caixa)
    return () => {
      io.disconnect()
      ro.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [reduzir, tracado, veiculo, sentido])

  const d = TRACADOS[tracado]
  const idLuz = `farol-${tracado}`

  return (
    <div
      ref={ref}
      aria-hidden
      // Altura acompanha a largura na proporção do desenho (1440 x 240): no
      // desktop nada é cortado. No celular vale a altura mínima e o desenho
      // é recortado só nas laterais.
      className="relative w-full min-h-[170px] sm:min-h-[200px] overflow-hidden"
      style={{ aspectRatio: '1440 / 240', background: `linear-gradient(to bottom, ${de} 50%, ${para} 50%)` }}
    >
      <svg viewBox="0 0 1440 240" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 w-full h-full">
        <defs>
          <linearGradient id={idLuz} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#FEF9C3" stopOpacity=".85" />
            <stop offset="1" stopColor="#FEF9C3" stopOpacity="0" />
          </linearGradient>
        </defs>
        {placa && <PlacaSvg placa={placa} />}
        {/* sombra, asfalto, linhas de bordo brancas e asfalto por dentro */}
        <path d={d} fill="none" stroke="rgba(13,22,40,.18)" strokeWidth="70" strokeLinecap="round" transform="translate(0 6)" />
        <path d={d} fill="none" stroke={COR_ASFALTO} strokeWidth="62" strokeLinecap="round" />
        <path d={d} fill="none" stroke="#F8FAFC" strokeWidth="54" strokeLinecap="round" />
        <path ref={caminho} d={d} fill="none" stroke={COR_ASFALTO} strokeWidth="50" strokeLinecap="round" />
        {/* faixa central amarela tracejada */}
        <path d={d} fill="none" stroke="#FACC15" strokeWidth="3.5" strokeDasharray="22 16" className={sentido === 'volta' ? 'estrada-faixa-volta' : 'estrada-faixa'} />

        <g ref={grupo}>
          {veiculo === 'onibus' ? <Onibus cor={cor} luz={idLuz} /> : <Carro cor={cor} luz={idLuz} />}
        </g>
      </svg>
    </div>
  )
}
