import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ShieldCheck } from 'lucide-react'
import { createServiceClient } from '@/lib/supabase/server'
import { carregarPerfisAdmin } from '@/features/admin/perfisOpcoes'
import { PerfisManager } from '@/features/admin/components/PerfisManager'

interface Props {
  params: Promise<{ id: string }>
}

export default async function PerfisPainelPage({ params }: Props) {
  const { id } = await params
  const supabase = createServiceClient()
  const { data: autoescola } = await supabase.from('autoescolas').select('id, nome').eq('id', id).single()
  if (!autoescola) notFound()

  const { opcoes, personalizados, areasDesligadas } = await carregarPerfisAdmin(id)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Link href="/admin/clientes" className="flex items-center gap-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white">
          <ArrowLeft className="w-4 h-4" /> Clientes
        </Link>
        <span className="text-slate-300">/</span>
        <Link href={`/admin/clientes/${id}/usuarios`} className="text-slate-500 hover:text-slate-900 dark:hover:text-white">{autoescola.nome}</Link>
        <span className="text-slate-300">/</span>
        <span className="flex items-center gap-1 text-slate-700 dark:text-slate-200 font-medium"><ShieldCheck className="w-3.5 h-3.5" /> Perfis e permissões</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Perfis e permissões</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Qual perfil dar a cada cargo da {autoescola.nome}. Atribua os perfis aos usuários em{' '}
          <Link href={`/admin/clientes/${id}/usuarios`} className="text-brand-teal hover:underline">Usuários do Painel</Link>.
        </p>
      </div>

      <PerfisManager
        autoescola_id={id}
        perfisPadrao={opcoes.filter((o) => !o.personalizado)}
        personalizadosIniciais={personalizados}
        areasDesligadas={areasDesligadas}
      />
    </div>
  )
}
