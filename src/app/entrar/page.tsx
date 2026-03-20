import { createServiceClient } from '@/lib/supabase/server'
import { EscolaSelector } from '@/features/landing/components/EscolaSelector'
import { ThemeToggle } from '@/components/ThemeToggle'
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
    <div className="min-h-screen bg-[--p-bg-base]">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[--p-bg-card] border-b border-[--p-border] px-4 py-3 flex items-center justify-between">
        <a href="/" className="text-sm text-[--p-text-3] hover:text-[--p-text-1] transition-colors">
          ← Voltar
        </a>
        <ThemeToggle />
      </header>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 pt-10 pb-8 text-center">
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[--p-accent]/10 text-[--p-accent] text-xs font-semibold rounded-full ring-1 ring-[--p-accent]/20 mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-[--p-accent] animate-pulse" />
          {tipo === 'aluno' ? 'Acesso do Aluno' : 'Acesso da Autoescola'}
        </span>
        <h1 className="text-3xl font-bold text-[--p-text-1] mb-2">
          {tipo === 'aluno' ? 'Qual é a sua autoescola?' : 'Selecione sua autoescola'}
        </h1>
        <p className="text-[--p-text-3] text-sm">
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
