import { createServiceClient } from '@/lib/supabase/server'
import { ProgressBar } from '@/features/identificacao/components/ProgressBar'
import { StepIcon } from '@/features/identificacao/components/StepIcon'
import { IdentificacaoForm } from '@/features/identificacao/components/IdentificacaoForm'

interface Props {
  params: Promise<{ escola: string }>
}

export default async function EscolaAlunoPage({ params }: Props) {
  const { escola } = await params
  const supabase = createServiceClient()

  const { data: autoescola } = await supabase
    .from('autoescolas')
    .select('nome, logo_url')
    .eq('slug', escola)
    .single()

  const nome = autoescola?.nome ?? 'Autoescola'
  const logoUrl = autoescola?.logo_url ?? null

  return (
    <main className="min-h-screen bg-gradient-navy flex flex-col">
      {/* Header */}
      <header className="w-full py-4 px-4 flex items-center justify-center border-b border-white/5">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={nome}
            className="h-8 object-contain"
          />
        ) : (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-teal/20 flex items-center justify-center">
              <span className="text-brand-teal font-bold text-sm">{nome.charAt(0)}</span>
            </div>
            <span className="text-sm font-semibold text-white tracking-wide">{nome}</span>
          </div>
        )}
      </header>

      {/* Progress */}
      <div className="w-full">
        <ProgressBar currentStep={1} totalSteps={6} />
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-start pt-10 pb-12 px-4">
        <div className="w-full max-w-sm flex flex-col items-center">
          <StepIcon />

          <div className="text-center mb-7 space-y-2">
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Identificação do Aluno
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed max-w-[280px] mx-auto">
              Digite seu CPF ou CNH para verificar seus créditos disponíveis
            </p>
          </div>

          <div className="w-full">
            <IdentificacaoForm redirectTo={`/${escola}/aluno/agendar`} />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full pb-8 flex items-center justify-center gap-1 text-xs text-slate-600">
        <a href="#" className="hover:text-slate-400 transition-colors">Ajuda</a>
        <span className="mx-1">•</span>
        <a href="#" className="hover:text-slate-400 transition-colors">Termos de Uso</a>
        <span className="mx-1">•</span>
        <a href="#" className="hover:text-slate-400 transition-colors">Privacidade</a>
      </footer>
    </main>
  )
}
