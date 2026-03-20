import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Tag } from 'lucide-react'
import { createServiceClient } from '@/lib/supabase/server'
import { listarCategorias } from '@/features/admin/actions/categorias'
import { CategoriasManager } from '@/features/admin/components/CategoriasManager'

interface Props {
  params: Promise<{ id: string }>
}

export default async function CategoriasPage({ params }: Props) {
  const { id } = await params
  const supabase = createServiceClient()

  const { data: autoescola } = await supabase
    .from('autoescolas')
    .select('id, nome, slug')
    .eq('id', id)
    .single()

  if (!autoescola) notFound()

  const categorias = await listarCategorias(id)

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/admin/clientes/${id}/editar`}
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para {autoescola.nome}
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-teal/10 flex items-center justify-center">
            <Tag className="w-5 h-5 text-brand-teal" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Categorias CNH</h1>
            <p className="text-sm text-slate-500">{autoescola.nome}</p>
          </div>
        </div>
      </div>

      <CategoriasManager autoescola_id={id} categorias={categorias} />
    </div>
  )
}
