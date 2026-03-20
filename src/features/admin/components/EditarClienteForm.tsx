'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Upload } from 'lucide-react'
import { editarCliente, uploadLogo } from '../actions/clientes'
import type { Autoescola } from '../types'

interface Props {
  cliente: Autoescola
}

const STATUS = [
  { value: 'active', label: 'Ativo' },
  { value: 'trial', label: 'Trial' },
  { value: 'suspended', label: 'Suspenso' },
]

export function EditarClienteForm({ cliente }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const [form, setForm] = useState({
    nome: cliente.nome,
    slug: cliente.slug,
    cnpj: cliente.cnpj ?? '',
    logo_url: cliente.logo_url ?? '',
    plano: cliente.plano,
    status: cliente.status,
  })

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    startTransition(async () => {
      const formData = new FormData()
      formData.append('logo', file)
      const result = await uploadLogo(formData)
      if (result.success) {
        setForm((p) => ({ ...p, logo_url: result.data }))
      } else {
        setError(result.error)
      }
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess(false)
    startTransition(async () => {
      const result = await editarCliente(cliente.id, form)
      if (!result.success) { setError(result.error); return }
      setSuccess(true)
      setTimeout(() => router.push('/admin/clientes'), 1200)
    })
  }

  const inputCls = 'w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-slate-200 bg-white dark:bg-[#0f172a] focus:outline-none focus:ring-2 focus:ring-brand-teal/30'
  const labelCls = 'block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1'

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Nome *</label>
          <input required value={form.nome} onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Slug (URL) *</label>
          <input required value={form.slug} onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))} className={inputCls} />
          <p className="text-xs text-slate-400 mt-1">Ex: moctran → /{form.slug}/painel</p>
        </div>
        <div>
          <label className={labelCls}>CNPJ</label>
          <input value={form.cnpj} onChange={(e) => setForm((p) => ({ ...p, cnpj: e.target.value }))} placeholder="00.000.000/0000-00" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Logo URL</label>
          <div className="flex gap-2">
            <input value={form.logo_url} onChange={(e) => setForm((p) => ({ ...p, logo_url: e.target.value }))} placeholder="https://..." className={`${inputCls} flex-1`} />
            <label className="px-3 py-2.5 border border-slate-200 dark:border-white/10 rounded-xl cursor-pointer text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
              <Upload className="w-4 h-4" />
              <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
            </label>
          </div>
          {form.logo_url && (
            <img src={form.logo_url} alt="preview" className="mt-2 h-10 object-contain rounded" />
          )}
        </div>
        <div>
          <label className={labelCls}>Status</label>
          <select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as import('../types').AutoescolaStatus }))} className={inputCls}>
            {STATUS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-emerald-600 font-medium">Salvo com sucesso! Redirecionando…</p>}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2.5 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/10 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 px-5 py-2.5 bg-brand-teal text-white text-sm font-semibold rounded-xl hover:bg-brand-teal-dark disabled:opacity-50 transition-colors shadow-sm"
        >
          <Save className="w-4 h-4" />
          {isPending ? 'Salvando…' : 'Salvar Alterações'}
        </button>
      </div>
    </form>
  )
}
