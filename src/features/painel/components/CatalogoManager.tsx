'use client'

import { useRef, useState, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Package, Plus, Pencil, Trash2, X, Car, Bike, Sparkles, Wrench, Tag,
  ImagePlus, Upload, Smartphone, Monitor, Eye,
} from 'lucide-react'
import {
  criarProduto, editarProduto, alternarAtivoProduto, excluirProduto, uploadImagemProduto,
} from '../actions/catalogo'
import {
  formatarPrecoCentavos, somaCreditos,
  type Produto, type ProdutoTipo, type NovoProdutoInput, type CategoriaCredito,
} from '@/lib/loja-types'
import { ProdutoCard } from '@/features/shared/components/ProdutoCard'

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

  // Imagens desktop/mobile do produto em edição: url já persistida (ou já enviada
  // nesta sessão) + arquivo recém-escolhido (preview local via blob: até salvar).
  const [imgDesktopUrl, setImgDesktopUrl] = useState<string | null>(null)
  const [imgMobileUrl, setImgMobileUrl] = useState<string | null>(null)
  const [imgDesktopFile, setImgDesktopFile] = useState<File | null>(null)
  const [imgMobileFile, setImgMobileFile] = useState<File | null>(null)
  // Preview local (blob:) do arquivo recém-escolhido, antes de enviar ao storage.
  const [imgDesktopPreview, setImgDesktopPreview] = useState<string | null>(null)
  const [imgMobilePreview, setImgMobilePreview] = useState<string | null>(null)
  const desktopInputRef = useRef<HTMLInputElement>(null)
  const mobileInputRef = useRef<HTMLInputElement>(null)
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'desktop'>('mobile')

  // Preview "todos os planos juntos", como aparecem na loja do aluno.
  const [vitrineOpen, setVitrineOpen] = useState(false)
  const [vitrineDevice, setVitrineDevice] = useState<'mobile' | 'desktop'>('mobile')

  const cats: CategoriaCredito[] = categorias.length > 0
    ? categorias.map((c) => c.codigo.toLowerCase() as CategoriaCredito)
    : ['a', 'b']

  function catNome(cat: CategoriaCredito): string {
    return categorias.find((c) => c.codigo.toLowerCase() === cat)?.nome ?? `Cat. ${cat.toUpperCase()}`
  }

  function abrirNovo() {
    setForm(FORM_VAZIO)
    setEditingId(null)
    setImgDesktopUrl(null)
    setImgMobileUrl(null)
    setImgDesktopFile(null)
    setImgMobileFile(null)
    setImgDesktopPreview(null)
    setImgMobilePreview(null)
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
    setImgDesktopUrl(p.imagem_desktop_url)
    setImgMobileUrl(p.imagem_mobile_url)
    setImgDesktopFile(null)
    setImgMobileFile(null)
    setImgDesktopPreview(null)
    setImgMobilePreview(null)
    setFormOpen(true)
    setError('')
  }

  function handleImagemChange(e: React.ChangeEvent<HTMLInputElement>, device: 'desktop' | 'mobile') {
    const file = e.target.files?.[0] ?? null
    if (!file) return
    if (file.size > 3 * 1024 * 1024) { setError('Arquivo muito grande. Máximo: 3MB.'); return }
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) { setError('Formato inválido. Use JPG, PNG ou WebP.'); return }
    setError('')
    const preview = URL.createObjectURL(file)
    if (device === 'desktop') { setImgDesktopFile(file); setImgDesktopPreview(preview) }
    else { setImgMobileFile(file); setImgMobilePreview(preview) }
  }

  function removerImagem(device: 'desktop' | 'mobile') {
    if (device === 'desktop') {
      setImgDesktopFile(null); setImgDesktopPreview(null); setImgDesktopUrl(null)
      if (desktopInputRef.current) desktopInputRef.current.value = ''
    } else {
      setImgMobileFile(null); setImgMobilePreview(null); setImgMobileUrl(null)
      if (mobileInputRef.current) mobileInputRef.current.value = ''
    }
  }

  function montarInput(desktopUrl?: string | null, mobileUrl?: string | null): NovoProdutoInput {
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
      imagem_desktop_url: desktopUrl !== undefined ? desktopUrl : imgDesktopUrl,
      imagem_mobile_url: mobileUrl !== undefined ? mobileUrl : imgMobileUrl,
    }
  }

  async function enviarImagemSelecionada(file: File, device: 'desktop' | 'mobile'): Promise<string | null> {
    const fd = new FormData()
    fd.append('imagem', file)
    fd.append('device', device)
    fd.append('autoescola_id', autoescola_id)
    const result = await uploadImagemProduto(fd)
    if (!result.success) {
      setError(result.error)
      return null
    }
    return result.data
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    startTransition(async () => {
      let desktopUrl = imgDesktopUrl
      let mobileUrl = imgMobileUrl

      if (imgDesktopFile) {
        const url = await enviarImagemSelecionada(imgDesktopFile, 'desktop')
        if (!url) return
        desktopUrl = url
      }
      if (imgMobileFile) {
        const url = await enviarImagemSelecionada(imgMobileFile, 'mobile')
        if (!url) return
        mobileUrl = url
      }

      const input = montarInput(desktopUrl, mobileUrl)
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

  // Card do produto sendo criado/editado, ao vivo, refletindo o form atual.
  const draftInput = montarInput(imgDesktopPreview ?? imgDesktopUrl, imgMobilePreview ?? imgMobileUrl)
  const draftProduto = {
    nome: draftInput.nome,
    descricao: draftInput.descricao ?? null,
    tipo: draftInput.tipo,
    automatico: draftInput.automatico,
    preco_centavos: draftInput.preco_centavos,
    qtd_cat_a: draftInput.qtd_cat_a,
    qtd_cat_b: draftInput.qtd_cat_b,
    qtd_cat_c: draftInput.qtd_cat_c,
    qtd_cat_d: draftInput.qtd_cat_d,
    qtd_cat_e: draftInput.qtd_cat_e,
    imagem_desktop_url: draftInput.imagem_desktop_url ?? null,
    imagem_mobile_url: draftInput.imagem_mobile_url ?? null,
  }
  const labelCategoria = (cat: CategoriaCredito) => catNome(cat)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[--p-text-3]">
          {produtos.length} produto{produtos.length !== 1 ? 's' : ''} no catálogo
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setVitrineOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[--p-border] text-[--p-text-2] text-sm font-semibold hover:bg-[--p-hover] transition-colors"
          >
            <Eye className="w-4 h-4" />
            Visualizar loja
          </button>
          <button
            onClick={abrirNovo}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[--p-accent] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            Novo produto
          </button>
        </div>
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
              <div className="pointer-events-auto w-full max-w-4xl max-h-[90vh] grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 overflow-y-auto lg:overflow-visible">
              <form
                onSubmit={handleSubmit}
                className="bg-[--p-bg-card] border border-[--p-border] rounded-2xl p-5 w-full lg:max-h-[90vh] lg:overflow-y-auto space-y-4"
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

                <div>
                  <label className="block text-xs font-medium text-[--p-text-2] mb-1.5">
                    Imagens da vitrine (opcional)
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <ImagemPicker
                      label="Desktop"
                      icon={Monitor}
                      preview={imgDesktopPreview ?? imgDesktopUrl}
                      inputRef={desktopInputRef}
                      onChange={(e) => handleImagemChange(e, 'desktop')}
                      onRemove={() => removerImagem('desktop')}
                    />
                    <ImagemPicker
                      label="Mobile"
                      icon={Smartphone}
                      preview={imgMobilePreview ?? imgMobileUrl}
                      inputRef={mobileInputRef}
                      onChange={(e) => handleImagemChange(e, 'mobile')}
                      onRemove={() => removerImagem('mobile')}
                    />
                  </div>
                  <p className="text-[11px] text-[--p-text-3] mt-1.5">
                    Se só uma for enviada, ela é usada nas duas telas. Formato paisagem funciona melhor.
                  </p>
                </div>

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

              {/* Preview ao vivo deste produto, como vai aparecer na loja do aluno */}
              <aside className="bg-[--p-bg-card] border border-[--p-border] rounded-2xl p-4 h-fit lg:sticky lg:top-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-[--p-text-2] flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5" /> Preview
                  </p>
                  <DeviceToggle device={previewDevice} onChange={setPreviewDevice} />
                </div>
                <div className={previewDevice === 'mobile' ? 'max-w-[260px] mx-auto' : ''}>
                  <ProdutoCard produto={draftProduto} forceDevice={previewDevice} categoriaLabel={labelCategoria} />
                </div>
              </aside>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Preview "todos os planos juntos", como aparecem na loja do aluno */}
      <AnimatePresence>
        {vitrineOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40"
              onClick={() => setVitrineOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
            >
              <div className="pointer-events-auto bg-[--p-bg-card] border border-[--p-border] rounded-2xl p-5 w-full max-w-2xl max-h-[90vh] overflow-y-auto space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-[--p-text-1] flex items-center gap-2">
                    <Eye className="w-4 h-4" /> Como fica na loja do aluno
                  </h2>
                  <div className="flex items-center gap-2">
                    <DeviceToggle device={vitrineDevice} onChange={setVitrineDevice} />
                    <button type="button" onClick={() => setVitrineOpen(false)} className="p-1.5 text-[--p-text-3] hover:text-[--p-text-1] rounded-lg">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className={`mx-auto transition-all ${
                  vitrineDevice === 'mobile'
                    ? 'max-w-[300px] flex flex-col gap-3'
                    : 'max-w-2xl grid grid-cols-2 gap-4'
                }`}>
                  {produtos.filter((p) => p.ativo).length === 0 ? (
                    <div className="col-span-2 bg-[--p-bg-base] border border-[--p-border] rounded-2xl py-14 text-center">
                      <Package className="w-8 h-8 text-[--p-text-3] mx-auto mb-3" />
                      <p className="text-sm text-[--p-text-3]">Nenhum produto ativo para exibir.</p>
                    </div>
                  ) : (
                    produtos.filter((p) => p.ativo).map((p) => (
                      <ProdutoCard key={p.id} produto={p} forceDevice={vitrineDevice} categoriaLabel={labelCategoria} />
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

function DeviceToggle({
  device, onChange,
}: {
  device: 'mobile' | 'desktop'
  onChange: (d: 'mobile' | 'desktop') => void
}) {
  return (
    <div className="inline-flex items-center rounded-lg border border-[--p-border] p-0.5">
      {(['mobile', 'desktop'] as const).map((d) => (
        <button
          key={d}
          type="button"
          onClick={() => onChange(d)}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
            device === d ? 'bg-[--p-accent] text-white' : 'text-[--p-text-3] hover:text-[--p-text-1]'
          }`}
        >
          {d === 'mobile' ? <Smartphone className="w-3.5 h-3.5" /> : <Monitor className="w-3.5 h-3.5" />}
          {d === 'mobile' ? 'Mobile' : 'Desktop'}
        </button>
      ))}
    </div>
  )
}

function ImagemPicker({
  label, icon: Icon, preview, inputRef, onChange, onRemove,
}: {
  label: string
  icon: React.ElementType
  preview: string | null
  inputRef: React.RefObject<HTMLInputElement | null>
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onRemove: () => void
}) {
  return (
    <div>
      <p className="text-[11px] text-[--p-text-3] mb-1 flex items-center gap-1">
        <Icon className="w-3 h-3" /> {label}
      </p>
      {preview ? (
        <div className="relative group">
          <img src={preview} alt={label} className="w-full aspect-video object-cover rounded-lg border border-[--p-border]" />
          <button
            type="button"
            onClick={onRemove}
            className="absolute top-1 right-1 p-1 rounded-md bg-black/60 text-white hover:bg-black/80 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full aspect-video flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-[--p-border] text-[--p-text-3] hover:text-[--p-accent] hover:border-[--p-accent] transition-colors"
        >
          <ImagePlus className="w-4 h-4" />
          <span className="text-[10px]">Enviar</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={onChange}
        className="hidden"
      />
      {preview && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-1 w-full inline-flex items-center justify-center gap-1 text-[10px] text-[--p-text-3] hover:text-[--p-accent] transition-colors"
        >
          <Upload className="w-3 h-3" /> Trocar
        </button>
      )}
    </div>
  )
}
