import { notFound } from 'next/navigation'
import { ArrowLeft, Users } from 'lucide-react'
import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import { listarPainelUsers } from '@/features/admin/actions/painelUsers'
import { PainelUsersList } from '@/features/admin/components/PainelUsersList'

interface Props {
  params: Promise<{ id: string }>
}

export default async function UsuariosPainelPage({ params }: Props) {
  const { id } = await params
  const supabase = createServiceClient()

  const { data: autoescola } = await supabase
    .from('autoescolas')
    .select('id, nome, slug')
    .eq('id', id)
    .single()

  if (!autoescola) notFound()

  const users = await listarPainelUsers(id)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/clientes"
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Clientes
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-sm text-slate-700 font-medium">{autoescola.nome}</span>
        <span className="text-slate-300">/</span>
        <span className="text-sm text-slate-500 flex items-center gap-1">
          <Users className="w-3.5 h-3.5" />
          Usuários do Painel
        </span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">{autoescola.nome}</h1>
        <p className="text-sm text-slate-500 mt-0.5">Gerenciar usuários com acesso ao painel da autoescola</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <PainelUsersList
          users={users}
          autoescola_id={id}
          autoescola_slug={autoescola.slug}
        />
      </div>
    </div>
  )
}
