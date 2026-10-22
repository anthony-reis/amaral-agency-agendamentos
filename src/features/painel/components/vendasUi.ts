import type { PedidoLojaStatus } from '@/lib/loja-types'

export const STATUS_LABEL: Record<PedidoLojaStatus, string> = {
  pendente: 'Pendente',
  aprovado: 'Aprovado',
  rejeitado: 'Rejeitado',
  cancelado: 'Cancelado',
  expirado: 'Expirado',
  reembolsado: 'Reembolsado',
}

export const STATUS_BADGE: Record<PedidoLojaStatus, string> = {
  pendente: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  aprovado: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  rejeitado: 'bg-red-500/10 text-red-500 border-red-500/20',
  cancelado: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  expirado: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  reembolsado: 'bg-violet-500/10 text-violet-500 border-violet-500/20',
}

export const METODO_LABEL: Record<string, string> = {
  credit_card: 'Cartão de crédito',
  debit_card: 'Cartão de débito',
  bank_transfer: 'Pix',
  ticket: 'Boleto',
  account_money: 'Saldo MP',
}

export function formatarData(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

export function formatarDataHoraCompleta(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}
