import { notFound } from 'next/navigation'
import { ArrowLeft, Pencil } from 'lucide-react'
import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import { EditarClienteForm } from '@/features/admin/components/EditarClienteForm'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditarClientePage({ params }: Props) {
  const { id } = await params
  const supabase = createServiceClient()

  const { data: cliente } = await supabase
    .from('autoescolas')
    .select('*')
    .eq('id', id)
    .single()

  if (!cliente) notFound()

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/clientes"
          className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Clientes
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-sm text-slate-700 dark:text-slate-200 font-medium">{cliente.nome}</span>
      </div>

      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-brand-teal/10 flex items-center justify-center">
          <Pencil className="w-4 h-4 text-brand-teal" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Editar Cliente</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{cliente.nome}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-slate-200 dark:border-white/5 p-6">
        <EditarClienteForm cliente={cliente} />
      </div>
    </div>
  )
}
