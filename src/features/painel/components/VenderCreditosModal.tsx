'use client'

import { useState, useTransition } from 'react'
import { motion } from 'framer-motion'
import { X, Wallet, AlertCircle, Loader2 } from 'lucide-react'
import { venderCreditosAluno, type QuantidadesPorCategoria } from '../actions/alunos'
import type { AlunoComCreditos } from '../types'

interface Props {
  autoescola_id: string
  aluno: AlunoComCreditos
  quantidades: QuantidadesPorCategoria
  onClose: () => void
  onSuccess: (aluno: AlunoComCreditos) => void
}

const PAYMENT_METHODS = [
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'pix', label: 'Pix' },
  { value: 'cartao', label: 'Cartão' },
  { value: 'outro', label: 'Outro' },
]

function precoParaCentavos(preco: string): number {
  const normalizado = preco.replace(/\./g, '').replace(',', '.')
  return Math.round(parseFloat(normalizado || '0') * 100)
}

export function VenderCreditosModal({ autoescola_id, aluno, quantidades, onClose, onSuccess }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [preco, setPreco] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('dinheiro')

  const resumo = (Object.entries(quantidades) as [string, number][])
    .filter(([, qtd]) => qtd > 0)
    .map(([cat, qtd]) => `${qtd} Cat. ${cat.toUpperCase()}`)

  function handleConfirmar() {
    const valorCentavos = precoParaCentavos(preco)
    if (valorCentavos <= 0) { setError('Informe o valor da venda.'); return }
    setError('')
    startTransition(async () => {
      const result = await venderCreditosAluno(aluno.id, autoescola_id, quantidades, valorCentavos, paymentMethod)
      if (!result.success) { setError(result.error); return }
      onSuccess(result.data)
    })
  }

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-40" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-[--p-bg-card] rounded-2xl border border-[--p-border] p-6 w-full max-w-sm shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-[--p-text-1] flex items-center gap-2">
              <Wallet className="w-4 h-4 text-[--p-accent]" /> Registrar venda
            </h3>
            <button onClick={onClose} className="text-[--p-text-3] hover:text-[--p-text-1]">
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-sm text-[--p-text-2] mb-1">{aluno.name}</p>
          <p className="text-xs text-[--p-text-3] mb-4">
            Adicionando {resumo.join(' + ')} — isso é uma venda e precisa de um valor registrado.
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-[--p-text-2] mb-1.5">Valor da venda (R$)</label>
              <input
                value={preco}
                onChange={(e) => setPreco(e.target.value)}
                placeholder="150,00"
                inputMode="decimal"
                autoFocus
                className="w-full px-3 py-2.5 text-sm rounded-xl bg-[--p-bg-input] border border-[--p-border] text-[--p-text-1] focus:outline-none focus:ring-1 focus:ring-[--p-accent]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[--p-text-2] mb-1.5">Forma de pagamento</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-xl bg-[--p-bg-input] border border-[--p-border] text-[--p-text-1] focus:outline-none focus:ring-1 focus:ring-[--p-accent]"
              >
                {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-500 flex items-start gap-2 mt-3">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
            </p>
          )}

          <div className="flex gap-2 justify-end pt-4">
            <button onClick={onClose} disabled={isPending} className="px-4 py-2 text-sm text-[--p-text-3] hover:text-[--p-text-1] disabled:opacity-50">
              Cancelar
            </button>
            <button
              onClick={handleConfirmar}
              disabled={isPending}
              className="px-4 py-2 bg-[--p-accent] text-white text-sm font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Salvar alterações
            </button>
          </div>
        </div>
      </motion.div>
    </>
  )
}
