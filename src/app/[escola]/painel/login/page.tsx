import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { listarUsuariosPainel } from '@/features/painel/actions/authPainel'
import { PainelLoginForm } from '@/features/painel/components/PainelLoginForm'

interface Props {
  params: Promise<{ escola: string }>
}

export default async function PainelLoginPage({ params }: Props) {
  const { escola } = await params
  const supabase = createServiceClient()

  const { data: autoescola } = await supabase
    .from('autoescolas')
    .select('id, nome, status')
    .eq('slug', escola)
    .single()

  if (!autoescola || autoescola.status !== 'active') notFound()

  const users = await listarUsuariosPainel(autoescola.id)

  return (
    <PainelLoginForm
      users={users}
      escola={escola}
      escolaNome={autoescola.nome}
    />
  )
}
