import type { AlunoComCreditos } from '../../types'

export const CATS = ['a', 'b', 'c', 'd', 'e'] as const
export type Cat = typeof CATS[number]

export function creditoDaCat(a: AlunoComCreditos, c: Cat): number {
  return a.creditos?.[`aulas_cat_${c}`] ?? 0
}

export function totalCreditos(a: AlunoComCreditos): number {
  return CATS.reduce((sum, c) => sum + creditoDaCat(a, c), 0)
}

export function formatDoc(doc: string) {
  if (doc.length === 11) return doc.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  return doc
}

export function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return '?'
  if (partes.length === 1) return partes[0][0].toUpperCase()
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
}

export function linkWhatsapp(phone: string) {
  return `https://wa.me/55${phone.replace(/\D/g, '')}`
}

export const inputCls =
  'w-full px-3 py-2 rounded-xl bg-[--p-bg-input] border border-[--p-border] text-sm text-[--p-text-1] placeholder:text-[--p-text-3] focus:outline-none focus:ring-2 focus:ring-[#0ea5e9]/30'
