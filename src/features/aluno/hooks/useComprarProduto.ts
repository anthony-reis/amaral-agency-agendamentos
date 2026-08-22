'use client'

import { useState, useTransition } from 'react'
import { criarCheckout } from '../actions/loja'
import type { Produto } from '@/lib/loja-types'

export function useComprarProduto(escola: string) {
  const [isPending, startTransition] = useTransition()
  const [comprandoId, setComprandoId] = useState<string | null>(null)
  const [error, setError] = useState('')

  function comprar(produto: Produto) {
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

  return { comprar, comprandoId, isPending, error }
}
