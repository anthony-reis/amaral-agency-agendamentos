'use client'

import { ShoppingBag, CreditCard, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { ProdutoCard } from '@/features/shared/components/ProdutoCard'
import { useComprarProduto } from '@/features/aluno/hooks/useComprarProduto'
import type { Produto } from '@/lib/loja-types'

interface Props {
  produtos: Produto[]
  escola: string
  identificado: boolean
}

export function PlanosPreview({ produtos, escola, identificado }: Props) {
  const { comprar, comprandoId, isPending, error } = useComprarProduto(escola)

  if (produtos.length === 0) return null

  function irParaIdentificacao() {
    const input = document.getElementById('document_id') as HTMLInputElement | null
    input?.focus()
    input?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <div className="w-full max-w-3xl space-y-3">
      <div className="flex items-center gap-2 px-1">
        <ShoppingBag className="w-4 h-4 text-[--p-accent]" />
        <h3 className="text-sm font-bold text-[--p-text-1]">
          {identificado ? 'Seus planos, prontos pra comprar' : 'Conheça nossos planos'}
        </h3>
      </div>

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
                    type="button"
                    onClick={() => (identificado ? comprar(p) : irParaIdentificacao())}
                    disabled={identificado && isPending}
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
                        {identificado ? 'Comprar' : 'Identifique-se para comprar'}
                      </>
                    )}
                  </button>
                }
              />
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
