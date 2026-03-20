import { createServiceClient } from '@/lib/supabase/server'
import { EscolaSelector } from '@/features/landing/components/EscolaSelector'
import type { Autoescola } from '@/features/admin/types'

interface Props {
  searchParams: Promise<{ perfil?: string }>
}

export default async function EntrarPage({ searchParams }: Props) {
  const { perfil } = await searchParams
  const tipo = perfil === 'escola' ? 'escola' : 'aluno'

  const supabase = createServiceClient()
  const { data } = await supabase
    .from('autoescolas')
    .select('id, nome, slug, logo_url, status')
    .eq('status', 'active')
    .order('nome')

  const escolas: Pick<Autoescola, 'id' | 'nome' | 'slug' | 'logo_url' | 'status'>[] = data ?? []

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30">
      {/* Back link */}
      <div className="max-w-3xl mx-auto px-4 pt-8">
        <a
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
        >
          ← Voltar
        </a>
      </div>

      {/* Header */}
      <div className="max-w-3xl mx-auto px-4 pt-10 pb-8 text-center">
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-teal/10 text-brand-teal text-xs font-semibold rounded-full ring-1 ring-brand-teal/20 mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-teal animate-pulse" />
          {tipo === 'aluno' ? 'Acesso do Aluno' : 'Acesso da Autoescola'}
        </span>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          {tipo === 'aluno' ? 'Qual é a sua autoescola?' : 'Selecione sua autoescola'}
        </h1>
        <p className="text-slate-500 text-sm">
          {tipo === 'aluno'
            ? 'Escolha abaixo para acessar seus créditos e agendamentos.'
            : 'Escolha abaixo para acessar o painel de gestão.'}
        </p>
      </div>

      <div className="max-w-3xl mx-auto px-4 pb-16">
        <EscolaSelector escolas={escolas} tipo={tipo} />
      </div>
    </div>
  )
}
