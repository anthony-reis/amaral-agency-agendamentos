'use client'

import { useState, useTransition } from 'react'
import { motion } from 'framer-motion'
import { Banknote, CreditCard, IdCard, Landmark, Mail, Phone, ShoppingBag, User, UserPlus, X, Zap } from 'lucide-react'
import { CAMBIOS } from '@/lib/cambio'
import { formatarPrecoCentavos, type Produto } from '@/lib/loja-types'
import { criarAluno } from '../../actions/alunos'
import type { AlunoComCreditos } from '../../types'

const PAGAMENTOS = [
  { value: 'dinheiro', label: 'Dinheiro', Icon: Banknote },
  { value: 'pix', label: 'Pix', Icon: Zap },
  { value: 'cartao', label: 'Cartão', Icon: CreditCard },
  { value: 'outro', label: 'Outro', Icon: Landmark },
]

type VendaTipo = 'nenhuma' | 'plano' | 'avulsa'

interface Props {
  autoescola_id: string
  produtos: Produto[]
  cambioAtivo: boolean
  onClose: () => void
  onCriado: (aluno: AlunoComCreditos) => void
}

const campoCls =
  'w-full pl-9 pr-3 py-2.5 rounded-xl bg-[--p-bg-input] border border-[--p-border] text-sm text-[--p-text-1] placeholder:text-[--p-text-3] focus:outline-none focus:border-[#0ea5e9] focus:ring-2 focus:ring-[#0ea5e9]/20 transition'

function Campo({ rotulo, Icon, children }: { rotulo: string; Icon: typeof User; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-[--p-text-2] mb-1.5">{rotulo}</span>
      <span className="relative block">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[--p-text-3] pointer-events-none" />
        {children}
      </span>
    </label>
  )
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h4 className="text-[11px] font-bold uppercase tracking-wider text-[--p-text-3]">{titulo}</h4>
      {children}
    </section>
  )
}

export function NovoAlunoModal({ autoescola_id, produtos, cambioAtivo, onClose, onCriado }: Props) {
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState({ name: '', document_id: '', phone: '', email: '', cambio: '' })
  const [erro, setErro] = useState('')
  const [vendaTipo, setVendaTipo] = useState<VendaTipo>('nenhuma')
  const [vendaProdutoId, setVendaProdutoId] = useState('')
  const [vendaQuantidade, setVendaQuantidade] = useState('1')
  const [vendaPagamento, setVendaPagamento] = useState('dinheiro')

  const planos = produtos.filter((p) => p.tipo === 'pacote' && p.ativo)
  const avulsas = produtos.filter((p) => p.tipo === 'avulsa' && p.ativo)
  const tiposVenda: { id: VendaTipo; label: string }[] = [
    { id: 'nenhuma', label: 'Sem venda' },
    ...(planos.length > 0 ? [{ id: 'plano' as const, label: 'Plano' }] : []),
    ...(avulsas.length > 0 ? [{ id: 'avulsa' as const, label: 'Aulas avulsas' }] : []),
  ]
  const opcoes = vendaTipo === 'plano' ? planos : vendaTipo === 'avulsa' ? avulsas : []
  const produto = opcoes.find((p) => p.id === vendaProdutoId)
  const quantidade = vendaTipo === 'avulsa' ? Math.max(1, Number(vendaQuantidade) || 1) : 1

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }))

  function handleCriar(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    const venda = vendaTipo !== 'nenhuma' && vendaProdutoId
      ? { produto_id: vendaProdutoId, quantidade, payment_method: vendaPagamento }
      : undefined
    startTransition(async () => {
      const result = await criarAluno({ ...form, autoescola_id }, venda)
      if (!result.success) { setErro(result.error); return }
      onCriado(result.data)
    })
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-40"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.98 }}
        className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none"
      >
        <form
          onSubmit={handleCriar}
          className="bg-[--p-bg-card] rounded-2xl border border-[--p-border] w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl pointer-events-auto overflow-hidden"
        >
          <header className="flex items-center gap-3 px-6 py-4 border-b border-[--p-border]">
            <div className="w-10 h-10 rounded-xl bg-[#0ea5e9]/15 text-[#0ea5e9] flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-[--p-text-1] leading-tight">Novo aluno</h3>
              <p className="text-xs text-[--p-text-3]">Preencha os dados para cadastrar</p>
            </div>
            <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-[--p-text-3] hover:text-[--p-text-1] hover:bg-[--p-hover]" aria-label="Fechar">
              <X className="w-5 h-5" />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            <Secao titulo="Dados do aluno">
              <Campo rotulo="Nome completo *" Icon={User}>
                <input required autoFocus value={form.name} onChange={set('name')} className={campoCls} placeholder="Nome do aluno" />
              </Campo>
              <Campo rotulo="CPF/CNH *" Icon={IdCard}>
                <input required value={form.document_id} onChange={set('document_id')} className={campoCls} placeholder="Somente números" inputMode="numeric" />
              </Campo>
            </Secao>

            <Secao titulo="Contato">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Campo rotulo="Telefone / WhatsApp" Icon={Phone}>
                  <input value={form.phone} onChange={set('phone')} className={campoCls} placeholder="(38) 99999-0000" inputMode="tel" />
                </Campo>
                <Campo rotulo="E-mail" Icon={Mail}>
                  <input type="email" value={form.email} onChange={set('email')} className={campoCls} placeholder="email@exemplo.com" />
                </Campo>
              </div>
            </Secao>

            {cambioAtivo && (
              <Secao titulo="Aulas de carro">
                <label className="block">
                  <span className="block text-xs font-medium text-[--p-text-2] mb-1.5">Câmbio</span>
                  <select value={form.cambio} onChange={set('cambio')} className={`${campoCls} !pl-3`}>
                    <option value="">Sem restrição (vê todos os instrutores)</option>
                    {CAMBIOS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </label>
              </Secao>
            )}

            {tiposVenda.length > 1 && (
              <Secao titulo="Venda inicial (opcional)">
                <div className="flex p-1 rounded-xl bg-[--p-bg-input] border border-[--p-border]">
                  {tiposVenda.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => { setVendaTipo(t.id); setVendaProdutoId('') }}
                      className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                        vendaTipo === t.id ? 'bg-[--p-bg-card] text-[--p-text-1] shadow-sm' : 'text-[--p-text-3] hover:text-[--p-text-2]'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {vendaTipo !== 'nenhuma' && (
                  <div className="space-y-3">
                    <div className="grid gap-2">
                      {opcoes.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setVendaProdutoId(p.id)}
                          className={`flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border text-left transition-colors ${
                            vendaProdutoId === p.id
                              ? 'border-[#0ea5e9] bg-[#0ea5e9]/10'
                              : 'border-[--p-border] hover:bg-[--p-hover]'
                          }`}
                        >
                          <span className="flex items-center gap-2 min-w-0">
                            <ShoppingBag className="w-4 h-4 text-[--p-text-3] shrink-0" />
                            <span className="text-sm text-[--p-text-1] truncate">{p.nome}</span>
                          </span>
                          <span className="text-sm font-semibold text-[--p-text-1] shrink-0">{formatarPrecoCentavos(p.preco_centavos)}</span>
                        </button>
                      ))}
                    </div>

                    {vendaTipo === 'avulsa' && (
                      <label className="flex items-center justify-between gap-3">
                        <span className="text-xs font-medium text-[--p-text-2]">Quantidade de aulas</span>
                        <input
                          type="number" min={1} value={vendaQuantidade}
                          onChange={(e) => setVendaQuantidade(e.target.value)}
                          className="w-24 px-3 py-2 rounded-xl bg-[--p-bg-input] border border-[--p-border] text-sm text-[--p-text-1] text-center focus:outline-none focus:border-[#0ea5e9]"
                        />
                      </label>
                    )}

                    <div>
                      <span className="block text-xs font-medium text-[--p-text-2] mb-1.5">Forma de pagamento</span>
                      <div className="grid grid-cols-4 gap-2">
                        {PAGAMENTOS.map(({ value, label, Icon }) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setVendaPagamento(value)}
                            className={`flex flex-col items-center gap-1 py-2 rounded-xl border text-xs font-medium transition-colors ${
                              vendaPagamento === value
                                ? 'border-[#0ea5e9] bg-[#0ea5e9]/10 text-[#0ea5e9]'
                                : 'border-[--p-border] text-[--p-text-2] hover:bg-[--p-hover]'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </Secao>
            )}
          </div>

          <footer className="px-6 py-4 border-t border-[--p-border] bg-[--p-bg-card] space-y-2">
            {erro && <p className="text-sm text-red-400">{erro}</p>}
            <div className="flex items-center gap-3">
              {produto && (
                <p className="text-xs text-[--p-text-3] mr-auto">
                  Total da venda{' '}
                  <span className="text-sm font-bold text-[--p-text-1]">{formatarPrecoCentavos(produto.preco_centavos * quantidade)}</span>
                </p>
              )}
              <div className="flex gap-2 ml-auto">
                <button type="button" onClick={onClose} className="px-4 py-2.5 text-sm text-[--p-text-2] hover:text-[--p-text-1]">Cancelar</button>
                <button
                  type="submit"
                  disabled={isPending || (vendaTipo !== 'nenhuma' && !vendaProdutoId)}
                  className="px-5 py-2.5 bg-[#0ea5e9] text-white text-sm font-semibold rounded-xl hover:bg-[#0284c7] disabled:opacity-50 transition-colors shadow-sm"
                >
                  {isPending ? 'Criando…' : 'Criar aluno'}
                </button>
              </div>
            </div>
          </footer>
        </form>
      </motion.div>
    </>
  )
}
