'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { CheckCircle2, Clock, XCircle, Loader2, ShoppingBag, CalendarDays } from 'lucide-react'
import { reconciliarPedido } from '../actions/loja'
import type { PedidoLojaStatus } from '@/lib/loja-types'

interface Props {
  escola: string
  pedidoId: string
}

const POLL_MS = 2500
const MAX_POLLS = 30 // ~75s — cada tick já reconcilia direto com a API do MP,
// não depende só do webhook chegar a tempo

export function RetornoCompra({ escola, pedidoId }: Props) {
  const [status, setStatus] = useState<PedidoLojaStatus | 'carregando'>('carregando')
  const [creditosLiberados, setCreditosLiberados] = useState(false)
  const [timeoutPolling, setTimeoutPolling] = useState(false)
  const pollsRef = useRef(0)

  useEffect(() => {
    let ativo = true
    let timer: ReturnType<typeof setTimeout> | null = null

    async function checar() {
      const pedido = await reconciliarPedido(pedidoId)
      if (!ativo) return
      if (pedido) {
        setStatus(pedido.status)
        setCreditosLiberados(pedido.creditos_liberados)
        // Para de fazer polling em estados finais
        if (pedido.status !== 'pendente') return
      }
      pollsRef.current += 1
      if (pollsRef.current >= MAX_POLLS) {
        setTimeoutPolling(true)
        return
      }
      timer = setTimeout(checar, POLL_MS)
    }

    checar()
    return () => {
      ativo = false
      if (timer) clearTimeout(timer)
    }
  }, [pedidoId])

  const aprovado = status === 'aprovado'
  const falhou = status === 'rejeitado' || status === 'cancelado'
  const aguardando = status === 'carregando' || (status === 'pendente' && !timeoutPolling)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[--p-bg-card] border border-[--p-border] rounded-2xl p-8 text-center"
    >
      {aprovado ? (
        <>
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          </div>
          <h1 className="text-xl font-bold text-[--p-text-1] mb-2">Pagamento aprovado!</h1>
          <p className="text-sm text-[--p-text-2] mb-6">
            {creditosLiberados
              ? 'Suas aulas já foram creditadas e você já pode agendar.'
              : 'Seu pagamento foi confirmado. Os créditos serão liberados em instantes.'}
          </p>
          <Link
            href={`/${escola}/aluno/agendar`}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[--p-accent] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <CalendarDays className="w-4 h-4" />
            Agendar minha aula
          </Link>
        </>
      ) : falhou ? (
        <>
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-[--p-text-1] mb-2">Pagamento não aprovado</h1>
          <p className="text-sm text-[--p-text-2] mb-6">
            O pagamento foi recusado ou cancelado. Nenhum valor foi cobrado — você pode tentar novamente.
          </p>
          <Link
            href={`/${escola}/aluno/loja`}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[--p-accent] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <ShoppingBag className="w-4 h-4" />
            Voltar para a loja
          </Link>
        </>
      ) : aguardando ? (
        <>
          <div className="w-16 h-16 rounded-2xl bg-[--p-accent]/10 flex items-center justify-center mx-auto mb-4">
            <Loader2 className="w-8 h-8 text-[--p-accent] animate-spin" />
          </div>
          <h1 className="text-xl font-bold text-[--p-text-1] mb-2">Confirmando pagamento...</h1>
          <p className="text-sm text-[--p-text-2]">
            Aguardando a confirmação do Mercado Pago. Pagamentos por Pix confirmam em instantes;
            boleto pode levar até 3 dias úteis.
          </p>
        </>
      ) : (
        <>
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-amber-500" />
          </div>
          <h1 className="text-xl font-bold text-[--p-text-1] mb-2">Pagamento em processamento</h1>
          <p className="text-sm text-[--p-text-2] mb-6">
            Ainda não recebemos a confirmação. Se você pagou por boleto, a compensação pode levar
            até 3 dias úteis — as aulas serão creditadas automaticamente assim que confirmar.
          </p>
          <Link
            href={`/${escola}/aluno/loja/compras`}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[--p-accent] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <ShoppingBag className="w-4 h-4" />
            Ver minhas compras
          </Link>
        </>
      )}
    </motion.div>
  )
}
