'use client'

import { motion } from 'framer-motion'
import { ShoppingBag, Loader2, CreditCard } from 'lucide-react'
import type { Produto } from '@/lib/loja-types'
import { ProdutoCard } from '@/features/shared/components/ProdutoCard'
import { useComprarProduto } from '../hooks/useComprarProduto'

interface Props {
  escola: string
  produtos: Produto[]
}

export function LojaProdutos({ escola, produtos }: Props) {
  const { comprar, comprandoId, isPending, error } = useComprarProduto(escola)

  if (produtos.length === 0) {
    return (
      <div className="bg-[--p-bg-card] border border-[--p-border] rounded-2xl py-14 text-center">
        <ShoppingBag className="w-8 h-8 text-[--p-text-3] mx-auto mb-3" />
        <p className="text-sm text-[--p-text-3]">Nenhum produto disponível no momento.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-sm text-red-500 bg-red-500/5 border border-red-500/20 rounded-xl px-4 py-3">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {produtos.map((p, i) => {
          const comprando = comprandoId === p.id && isPending
          return (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <ProdutoCard
                produto={p}
                footer={
                  <button
                    onClick={() => comprar(p)}
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
                }
              />
            </motion.div>
          )
        })}
      </div>

      <p className="text-[11px] text-[--p-text-3] text-center pt-2">
        Pagamento processado pelo Mercado Pago. As aulas são creditadas automaticamente após a confirmação.
      </p>
    </div>
  )
}
