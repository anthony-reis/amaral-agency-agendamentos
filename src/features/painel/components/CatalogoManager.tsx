'use client'

import { useState, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Package, Plus, Pencil, Trash2, X, Car, Bike, Sparkles, Wrench, Tag,
} from 'lucide-react'
import {
  criarProduto, editarProduto, alternarAtivoProduto, excluirProduto,
} from '../actions/catalogo'
import {
  formatarPrecoCentavos, somaCreditos,
  type Produto, type ProdutoTipo, type NovoProdutoInput, type CategoriaCredito,
} from '@/lib/loja-types'

interface CategoriaTenant {
  codigo: string // 'A'..'E'
  nome: string
}

interface Props {
  autoescola_id: string
  produtos: Produto[]
  categorias: CategoriaTenant[]
}

const TIPO_LABEL: Record<ProdutoTipo, string> = {
  pacote: 'Pacote',
  avulsa: 'Aula avulsa',
  servico: 'Serviço',
}

const TIPO_BADGE: Record<ProdutoTipo, string> = {
  pacote: 'bg-sky-500/10 text-sky-500 border-sky-500/20',
  avulsa: 'bg-violet-500/10 text-violet-500 border-violet-500/20',
  servico: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
}

const FORM_VAZIO = {
  nome: '',
  descricao: '',
  tipo: 'pacote' as ProdutoTipo,
  automatico: false,
  preco: '',
  qtds: { a: 0, b: 0, c: 0, d: 0, e: 0 } as Record<CategoriaCredito, number>,
  ativo: true,
}

function precoParaCentavos(preco: string): number {
  const normalizado = preco.replace(/\./g, '').replace(',', '.')
  return Math.round(parseFloat(normalizado || '0') * 100)
}

export function CatalogoManager({ autoescola_id, produtos: initial, categorias }: Props) {
  const [produtos, setProdutos] = useState<Produto[]>(initial)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(FORM_VAZIO)

  const cats: CategoriaCredito[] = categorias.length > 0
    ? categorias.map((c) => c.codigo.toLowerCase() as CategoriaCredito)
    : ['a', 'b']

  function catNome(cat: CategoriaCredito): string {
    return categorias.find((c) => c.codigo.toLowerCase() === cat)?.nome ?? `Cat. ${cat.toUpperCase()}`
  }

  function abrirNovo() {
    setForm(FORM_VAZIO)
    setEditingId(null)
    setFormOpen(true)
    setError('')
  }

  function abrirEdicao(p: Produto) {
    setForm({
      nome: p.nome,
      descricao: p.descricao ?? '',
      tipo: p.tipo,
      automatico: p.automatico,
      preco: (p.preco_centavos / 100).toFixed(2).replace('.', ','),
      qtds: { a: p.qtd_cat_a, b: p.qtd_cat_b, c: p.qtd_cat_c, d: p.qtd_cat_d, e: p.qtd_cat_e },
      ativo: p.ativo,
    })
    setEditingId(p.id)
    setFormOpen(true)
    setError('')
  }

  function montarInput(): NovoProdutoInput {
    const zeraCreditos = form.tipo === 'servico'
    return {
      nome: form.nome,
      descricao: form.descricao || undefined,
      tipo: form.tipo,
      automatico: form.automatico,
      preco_centavos: precoParaCentavos(form.preco),
      qtd_cat_a: zeraCreditos ? 0 : form.qtds.a,
      qtd_cat_b: zeraCreditos ? 0 : form.qtds.b,
      qtd_cat_c: zeraCreditos ? 0 : form.qtds.c,
      qtd_cat_d: zeraCreditos ? 0 : form.qtds.d,
      qtd_cat_e: zeraCreditos ? 0 : form.qtds.e,
      ativo: form.ativo,
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const input = montarInput()
    startTransition(async () => {
      const result = editingId
        ? await editarProduto(editingId, input, autoescola_id)
        : await criarProduto(input, autoescola_id)
      if (!result.success) { setError(result.error); return }
      const produto = result.data
      setProdutos((prev) =>
        editingId ? prev.map((p) => (p.id === editingId ? produto : p)) : [produto, ...prev]
      )
      setFormOpen(false)
    })
  }

  function handleToggleAtivo(p: Produto) {
    startTransition(async () => {
      const result = await alternarAtivoProduto(p.id, !p.ativo, autoescola_id)
      if (!result.success) { setError(result.error); return }
      setProdutos((prev) => prev.map((x) => (x.id === p.id ? { ...x, ativo: !p.ativo } : x)))
    })
  }

  function handleExcluir(p: Produto) {
    if (!confirm(`Excluir o produto "${p.nome}"?`)) return
    startTransition(async () => {
      const result = await excluirProduto(p.id, autoescola_id)
      if (!result.success) { setError(result.error); return }
      if (result.data.desativado) {
        setProdutos((prev) => prev.map((x) => (x.id === p.id ? { ...x, ativo: false } : x)))
        setError('Produto tinha vendas vinculadas — foi desativado em vez de excluído.')
      } else {
        setProdutos((prev) => prev.filter((x) => x.id !== p.id))
      }
    })
  }

  function creditosResumo(p: Produto): string {
    const partes: string[] = []
    if (p.qtd_cat_a > 0) partes.push(`${p.qtd_cat_a} ${catNome('a')}`)
    if (p.qtd_cat_b > 0) partes.push(`${p.qtd_cat_b} ${catNome('b')}`)
    if (p.qtd_cat_c > 0) partes.push(`${p.qtd_cat_c} ${catNome('c')}`)
    if (p.qtd_cat_d > 0) partes.push(`${p.qtd_cat_d} ${catNome('d')}`)
    if (p.qtd_cat_e > 0) partes.push(`${p.qtd_cat_e} ${catNome('e')}`)
    return partes.join(' + ') || 'Sem aulas (serviço)'
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[--p-text-3]">
          {produtos.length} produto{produtos.length !== 1 ? 's' : ''} no catálogo
        </p>
        <button
          onClick={abrirNovo}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[--p-accent] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          Novo produto
        </button>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* Lista */}
      {produtos.length === 0 ? (
        <div className="bg-[--p-bg-card] border border-[--p-border] rounded-2xl py-14 text-center">
          <Package className="w-8 h-8 text-[--p-text-3] mx-auto mb-3" />
          <p className="text-sm text-[--p-text-3]">Nenhum produto cadastrado. Crie o primeiro pacote acima.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {produtos.map((p) => (
            <div
              key={p.id}
              className={`bg-[--p-bg-card] border border-[--p-border] rounded-2xl p-4 ${!p.ativo ? 'opacity-55' : ''}`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  {p.qtd_cat_a > 0 && <Bike className="w-4 h-4 text-emerald-500 shrink-0" />}
                  {p.qtd_cat_b > 0 && <Car className="w-4 h-4 text-blue-500 shrink-0" />}
                  {p.tipo === 'servico' && <Wrench className="w-4 h-4 text-amber-500 shrink-0" />}
                  <h3 className="font-semibold text-[--p-text-1] text-sm truncate">{p.nome}</h3>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${TIPO_BADGE[p.tipo]}`}>
                  {TIPO_LABEL[p.tipo]}
                </span>
              </div>

              <p className="text-xs text-[--p-text-3] mb-1 flex items-center gap-1.5">
                <Tag className="w-3 h-3" />
                {creditosResumo(p)}
                {p.automatico && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-sky-500/10 text-sky-500 border border-sky-500/20">
                    <Sparkles className="w-2.5 h-2.5" /> Automático
                  </span>
                )}
              </p>
              {p.descricao && <p className="text-xs text-[--p-text-3] mb-2 line-clamp-2">{p.descricao}</p>}

              <div className="flex items-center justify-between mt-3">
                <p className="text-lg font-bold text-[--p-text-1]">{formatarPrecoCentavos(p.preco_centavos)}</p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleToggleAtivo(p)}
                    disabled={isPending}
                    className={`text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border transition-colors ${
                      p.ativo
                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20'
                        : 'bg-[--p-bg-input] text-[--p-text-3] border-[--p-border] hover:text-[--p-text-1]'
                    }`}
                  >
                    {p.ativo ? 'Ativo' : 'Inativo'}
                  </button>
                  <button
                    onClick={() => abrirEdicao(p)}
                    className="p-1.5 text-[--p-text-3] hover:text-[--p-accent] hover:bg-[--p-hover] rounded-lg transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleExcluir(p)}
                    disabled={isPending}
                    className="p-1.5 text-[--p-text-3] hover:text-red-500 hover:bg-red-500/5 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de criação/edição */}
      <AnimatePresence>
        {formOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40"
              onClick={() => setFormOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
            >
              <form
                onSubmit={handleSubmit}
                className="pointer-events-auto bg-[--p-bg-card] border border-[--p-border] rounded-2xl p-5 w-full max-w-lg max-h-[90vh] overflow-y-auto space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-[--p-text-1]">
                    {editingId ? 'Editar produto' : 'Novo produto'}
                  </h2>
                  <button type="button" onClick={() => setFormOpen(false)} className="p-1.5 text-[--p-text-3] hover:text-[--p-text-1] rounded-lg">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[--p-text-2] mb-1.5">Nome</label>
                  <input
                    value={form.nome}
                    onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                    placeholder="Ex: Pacote 10 aulas — Carro"
                    required
                    className="w-full px-3 py-2.5 text-sm rounded-xl bg-[--p-bg-input] border border-[--p-border] text-[--p-text-1] focus:outline-none focus:ring-1 focus:ring-[--p-accent]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[--p-text-2] mb-1.5">Descrição (opcional)</label>
                  <textarea
                    value={form.descricao}
                    onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                    rows={2}
                    placeholder="Ex: Inclui matrícula, material didático e aluguel do veículo"
                    className="w-full px-3 py-2.5 text-sm rounded-xl bg-[--p-bg-input] border border-[--p-border] text-[--p-text-1] focus:outline-none focus:ring-1 focus:ring-[--p-accent] resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[--p-text-2] mb-1.5">Tipo</label>
                    <select
                      value={form.tipo}
                      onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value as ProdutoTipo }))}
                      className="w-full px-3 py-2.5 text-sm rounded-xl bg-[--p-bg-input] border border-[--p-border] text-[--p-text-1] focus:outline-none focus:ring-1 focus:ring-[--p-accent]"
                    >
                      <option value="pacote">Pacote de aulas</option>
                      <option value="avulsa">Aula avulsa</option>
                      <option value="servico">Serviço (sem aulas)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[--p-text-2] mb-1.5">Preço (R$)</label>
                    <input
                      value={form.preco}
                      onChange={(e) => setForm((f) => ({ ...f, preco: e.target.value }))}
                      placeholder="1377,00"
                      inputMode="decimal"
                      required
                      className="w-full px-3 py-2.5 text-sm rounded-xl bg-[--p-bg-input] border border-[--p-border] text-[--p-text-1] focus:outline-none focus:ring-1 focus:ring-[--p-accent]"
                    />
                  </div>
                </div>

                {form.tipo !== 'servico' && (
                  <div>
                    <label className="block text-xs font-medium text-[--p-text-2] mb-1.5">
                      Aulas concedidas por categoria
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {cats.map((cat) => (
                        <div key={cat} className="flex items-center gap-2">
                          <span className="w-14 text-xs text-[--p-text-3]">{catNome(cat)}</span>
                          <input
                            type="number"
                            min={0}
                            value={form.qtds[cat]}
                            onChange={(e) =>
                              setForm((f) => ({
                                ...f,
                                qtds: { ...f.qtds, [cat]: Math.max(0, parseInt(e.target.value || '0', 10)) },
                              }))
                            }
                            className="flex-1 px-3 py-2 text-sm rounded-xl bg-[--p-bg-input] border border-[--p-border] text-[--p-text-1] focus:outline-none focus:ring-1 focus:ring-[--p-accent]"
                          />
                        </div>
                      ))}
                    </div>
                    {form.tipo === 'avulsa' && somaCreditos(montarInput()) !== 1 && (
                      <p className="text-[11px] text-amber-500 mt-1.5">Aula avulsa deve conceder exatamente 1 aula.</p>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 text-sm text-[--p-text-2] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.automatico}
                      onChange={(e) => setForm((f) => ({ ...f, automatico: e.target.checked }))}
                      className="rounded"
                    />
                    Carro automático
                  </label>
                  <label className="flex items-center gap-2 text-sm text-[--p-text-2] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.ativo}
                      onChange={(e) => setForm((f) => ({ ...f, ativo: e.target.checked }))}
                      className="rounded"
                    />
                    Ativo na loja
                  </label>
                </div>

                {error && <p className="text-sm text-red-500">{error}</p>}

                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full py-2.5 rounded-xl bg-[--p-accent] text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {isPending ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Criar produto'}
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
