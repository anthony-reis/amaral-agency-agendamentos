import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { IdentificacaoForm } from '@/features/identificacao/components/IdentificacaoForm'

interface Props {
  params: Promise<{ escola: string }>
}

export default async function EscolaAlunoPage({ params }: Props) {
  const { escola } = await params

  const supabase = createServiceClient()
  const { data: autoescola } = await supabase
    .from('autoescolas')
    .select('id')
    .eq('slug', escola)
    .single()

  if (!autoescola) notFound()

  return (
    <div className="flex flex-col items-center justify-start pt-10 pb-6 px-4 min-h-full">
      <div className="w-full max-w-sm flex flex-col items-center gap-6">
        <div className="text-center space-y-1.5">
          <h2 className="text-2xl font-bold text-[--p-text-1] tracking-tight">Identificação</h2>
          <p className="text-sm text-[--p-text-3] leading-relaxed max-w-[280px] mx-auto">
            Digite seu CPF ou CNH para verificar seus créditos e agendar aulas
          </p>
        </div>

        <div className="w-full">
          <IdentificacaoForm redirectTo={`/${escola}/aluno/agendar`} autoescolaId={autoescola.id} />
        </div>
      </div>
    </div>
  )
}
