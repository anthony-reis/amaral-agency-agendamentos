'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Building2, Link2, FileText, ImagePlus, AlertCircle,
  CheckCircle2, X, Upload,
} from 'lucide-react'
import { criarCliente, uploadLogo } from '../actions/clientes'

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function formatCnpj(value: string) {
  const d = value.replace(/\D/g, '').slice(0, 14)
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

export function NovoClienteForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [slugManual, setSlugManual] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ nome: '', slug: '', cnpj: '' })
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleNomeChange(value: string) {
    setForm((p) => ({ ...p, nome: value, slug: slugManual ? p.slug : slugify(value) }))
  }

  function handleSlugChange(value: string) {
    setSlugManual(true)
    setForm((p) => ({ ...p, slug: slugify(value) }))
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      setError('Arquivo muito grande. Máximo: 2MB.')
      return
    }
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml']
    if (!allowed.includes(file.type)) {
      setError('Formato inválido. Use JPG, PNG, WebP ou SVG.')
      return
    }

    setError('')
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  function removeLogo() {
    setLogoFile(null)
    setLogoPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    startTransition(async () => {
      let logo_url: string | undefined

      if (logoFile) {
        const fd = new FormData()
        fd.append('logo', logoFile)
        const uploadResult = await uploadLogo(fd)
        if (!uploadResult.success) {
          setError(uploadResult.error)
          return
        }
        logo_url = uploadResult.data
      }

      const result = await criarCliente({
        nome: form.nome,
        slug: form.slug,
        cnpj: form.cnpj || undefined,
        logo_url,
      })

      if (!result.success) {
        setError(result.error)
        return
      }
      router.push('/admin/clientes')
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
      {/* Nome */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Nome da autoescola <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            required
            value={form.nome}
            onChange={(e) => handleNomeChange(e.target.value)}
            placeholder="Ex: Autoescola Central"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-teal/30 focus:border-brand-teal transition-colors"
          />
        </div>
      </div>

      {/* Slug */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Slug (URL) <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            required
            value={form.slug}
            onChange={(e) => handleSlugChange(e.target.value)}
            placeholder="Ex: central"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-teal/30 focus:border-brand-teal transition-colors font-mono"
          />
        </div>
        {form.slug && (
          <p className="text-xs text-slate-400 mt-1.5">
            URL de acesso:{' '}
            <span className="text-brand-teal font-medium">
              dominio.com.br/{form.slug}/aluno
            </span>
          </p>
        )}
      </div>

      {/* CNPJ */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          CNPJ{' '}
          <span className="text-slate-400 font-normal text-xs">(opcional)</span>
        </label>
        <div className="relative">
          <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={form.cnpj}
            onChange={(e) => setForm((p) => ({ ...p, cnpj: formatCnpj(e.target.value) }))}
            placeholder="00.000.000/0001-00"
            maxLength={18}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-teal/30 focus:border-brand-teal transition-colors"
          />
        </div>
      </div>

      {/* Logo */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Logo{' '}
          <span className="text-slate-400 font-normal text-xs">
            (opcional — JPG, PNG, WebP ou SVG, máx. 2MB)
          </span>
        </label>

        {logoPreview ? (
          /* Preview da logo selecionada */
          <div className="flex items-center gap-4 p-3 rounded-xl border border-slate-200 bg-slate-50">
            <img
              src={logoPreview}
              alt="Preview"
              className="w-14 h-14 object-contain rounded-lg border border-slate-200 bg-white p-1"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-700 truncate">
                {logoFile?.name}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {logoFile ? (logoFile.size / 1024).toFixed(0) + ' KB' : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={removeLogo}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          /* Área de upload */
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex flex-col items-center gap-2 px-4 py-6 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 hover:border-brand-teal hover:bg-brand-teal/5 transition-colors group"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-200 group-hover:bg-brand-teal/10 flex items-center justify-center transition-colors">
              <ImagePlus className="w-5 h-5 text-slate-400 group-hover:text-brand-teal transition-colors" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-slate-600 group-hover:text-brand-teal transition-colors">
                Clique para selecionar
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                ou arraste o arquivo aqui
              </p>
            </div>
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp,image/svg+xml"
          className="hidden"
          onChange={handleLogoChange}
        />
      </div>

      {/* Erro */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <motion.button
          type="submit"
          disabled={isPending || !form.nome || !form.slug}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 px-5 py-2.5 bg-brand-teal text-white text-sm font-semibold rounded-xl hover:bg-brand-teal-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          {isPending ? (
            <>
              <Upload className="w-4 h-4 animate-pulse" />
              {logoFile ? 'Enviando logo...' : 'Criando...'}
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Criar Autoescola
            </>
          )}
        </motion.button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
