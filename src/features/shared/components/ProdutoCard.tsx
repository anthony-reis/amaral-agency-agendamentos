'use client'

import { Car, Bike, Wrench, Sparkles, ImageOff } from 'lucide-react'
import { formatarPrecoCentavos, type ProdutoTipo, type CategoriaCredito } from '@/lib/loja-types'

export interface ProdutoCardData {
  nome: string
  descricao: string | null
  tipo: ProdutoTipo
  automatico: boolean
  preco_centavos: number
  qtd_cat_a: number
  qtd_cat_b: number
  qtd_cat_c: number
  qtd_cat_d: number
  qtd_cat_e: number
  imagem_desktop_url?: string | null
  imagem_mobile_url?: string | null
}

interface Props {
  produto: ProdutoCardData
  /**
   * Painel: força qual imagem exibir (preview mobile/desktop explícito).
   * Loja real do aluno: omitido — usa <picture> para trocar por CSS conforme a viewport de quem visita.
   */
  forceDevice?: 'mobile' | 'desktop'
  categoriaLabel?: (cat: CategoriaCredito) => string
  footer?: React.ReactNode
  className?: string
}

const CATEGORIA_LABEL_PADRAO: Record<CategoriaCredito, string> = {
  a: 'Moto',
  b: 'Carro',
  c: 'Cat. C',
  d: 'Cat. D',
  e: 'Cat. E',
}

function creditosResumo(p: ProdutoCardData, label: (cat: CategoriaCredito) => string): string[] {
  const partes: string[] = []
  const mapa: [CategoriaCredito, number][] = [
    ['a', p.qtd_cat_a], ['b', p.qtd_cat_b], ['c', p.qtd_cat_c], ['d', p.qtd_cat_d], ['e', p.qtd_cat_e],
  ]
  for (const [cat, qtd] of mapa) {
    if (qtd > 0) partes.push(`${qtd} aula${qtd > 1 ? 's' : ''} de ${label(cat)}`)
  }
  return partes
}

function ImagemPlaceholder() {
  return (
    <div className="w-full aspect-video rounded-xl mb-3 bg-[--p-hover] border border-[--p-border] flex items-center justify-center">
      <ImageOff className="w-6 h-6 text-[--p-text-3]" strokeWidth={1.5} />
    </div>
  )
}

function ProdutoImagem({ produto, forceDevice }: { produto: ProdutoCardData; forceDevice?: 'mobile' | 'desktop' }) {
  const desktop = produto.imagem_desktop_url || null
  const mobile = produto.imagem_mobile_url || null
  if (!desktop && !mobile) return <ImagemPlaceholder />

  // Preview do painel: mostra exatamente a imagem escolhida (com fallback pra outra, se só uma foi anexada).
  if (forceDevice) {
    const src = forceDevice === 'desktop' ? (desktop ?? mobile) : (mobile ?? desktop)
    if (!src) return <ImagemPlaceholder />
    return (
      <img
        src={src}
        alt={produto.nome}
        className="w-full aspect-video object-cover rounded-xl mb-3"
      />
    )
  }

  // Loja real: <picture> troca a imagem pela viewport de quem está vendo.
  const mobileSrc = mobile ?? desktop!
  const desktopSrc = desktop ?? mobile!
  return (
    <picture>
      {desktop && <source media="(min-width: 768px)" srcSet={desktopSrc} />}
      <img
        src={mobileSrc}
        alt={produto.nome}
        className="w-full aspect-video object-cover rounded-xl mb-3"
      />
    </picture>
  )
}

export function ProdutoCard({ produto: p, forceDevice, categoriaLabel, footer, className }: Props) {
  const label = categoriaLabel ?? ((cat: CategoriaCredito) => CATEGORIA_LABEL_PADRAO[cat])
  const creditos = creditosResumo(p, label)

  return (
    <div className={`bg-[--p-bg-card] border border-[--p-border] rounded-2xl p-5 ${className ?? ''}`}>
      <ProdutoImagem produto={p} forceDevice={forceDevice} />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {p.qtd_cat_a > 0 && <Bike className="w-4 h-4 text-emerald-500 shrink-0" />}
            {p.qtd_cat_b > 0 && <Car className="w-4 h-4 text-blue-500 shrink-0" />}
            {p.tipo === 'servico' && <Wrench className="w-4 h-4 text-amber-500 shrink-0" />}
            <h3 className="font-semibold text-[--p-text-1]">{p.nome || 'Nome do plano'}</h3>
            {p.automatico && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-sky-500/10 text-sky-500 border border-sky-500/20">
                <Sparkles className="w-2.5 h-2.5" /> Automático
              </span>
            )}
          </div>
          {creditos.length > 0 && (
            <p className="text-xs text-[--p-text-2] mb-1">{creditos.join(' + ')}</p>
          )}
          {p.descricao && (
            <p className="text-xs text-[--p-text-3] line-clamp-2">{p.descricao}</p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="text-lg font-bold text-[--p-text-1]">
            {formatarPrecoCentavos(p.preco_centavos)}
          </p>
          <p className="text-[10px] text-[--p-text-3]">Pix, boleto ou até 12x</p>
        </div>
      </div>

      {footer}
    </div>
  )
}
