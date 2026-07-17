'use client'

import { useState, useTransition } from 'react'
import { motion } from 'framer-motion'
import { Car, Bike, Wrench, Sparkles, ShoppingBag, Loader2, CreditCard } from 'lucide-react'
import { criarCheckout } from '../actions/loja'
import { formatarPrecoCentavos, type Produto } from '@/lib/loja-types'

interface Props {
  escola: string
  produtos: Produto[]
}

function creditosResumo(p: Produto): string[] {
  const partes: string[] = []
  if (p.qtd_cat_a > 0) partes.push(`${p.qtd_cat_a} aula${p.qtd_cat_a > 1 ? 's' : ''} de Moto`)
  if (p.qtd_cat_b > 0) partes.push(`${p.qtd_cat_b} aula${p.qtd_cat_b > 1 ? 's' : ''} de Carro`)
  if (p.qtd_cat_c > 0) partes.push(`${p.qtd_cat_c} aula${p.qtd_cat_c > 1 ? 's' : ''} Cat. C`)
  if (p.qtd_cat_d > 0) partes.push(`${p.qtd_cat_d} aula${p.qtd_cat_d > 1 ? 's' : ''} Cat. D`)
  if (p.qtd_cat_e > 0) partes.push(`${p.qtd_cat_e} aula${p.qtd_cat_e > 1 ? 's' : ''} Cat. E`)
  return partes
}

export function LojaProdutos({ escola, produtos }: Props) {
  const [isPending, startTransition] = useTransition()
  const [comprandoId, setComprandoId] = useState<string | null>(null)
  const [error, setError] = useState('')

  function handleComprar(produto: Produto) {
    setError('')
    setComprandoId(produto.id)
    startTransition(async () => {
      const result = await criarCheckout(produto.id, escola)
      if (!result.success) {
        setError(result.error)
        setComprandoId(null)
        return
      }
      window.location.href = result.data.initPoint
    })
  }

  if (produtos.length === 0) {
    return (
      <div className="bg-[--p-bg-card] border border-[--p-border] rounded-2xl py-14 text-center">
        <ShoppingBag className="w-8 h-8 text-[--p-text-3] mx-auto mb-3" />
        <p className="text-sm text-[--p-text-3]">Nenhum produto disponível no momento.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="text-sm text-red-500 bg-red-500/5 border border-red-500/20 rounded-xl px-4 py-3">
          {error}
        </p>
      )}

      {produtos.map((p, i) => {
        const creditos = creditosResumo(p)
        const comprando = comprandoId === p.id && isPending
        return (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="bg-[--p-bg-card] border border-[--p-border] rounded-2xl p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  {p.qtd_cat_a > 0 && <Bike className="w-4 h-4 text-emerald-500 shrink-0" />}
                  {p.qtd_cat_b > 0 && <Car className="w-4 h-4 text-blue-500 shrink-0" />}
                  {p.tipo === 'servico' && <Wrench className="w-4 h-4 text-amber-500 shrink-0" />}
                  <h3 className="font-semibold text-[--p-text-1]">{p.nome}</h3>
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

            <button
              onClick={() => handleComprar(p)}
              disabled={isPending}
              className="mt-4 w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[--p-accent] text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {comprando ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Abrindo pagamento...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  Comprar
                </>
              )}
            </button>
          </motion.div>
        )
      })}

      <p className="text-[11px] text-[--p-text-3] text-center pt-2">
        Pagamento processado pelo Mercado Pago. As aulas são creditadas automaticamente após a confirmação.
      </p>
    </div>
  )
}
