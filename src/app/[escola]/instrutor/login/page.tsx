import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { listarInstrutoresParaLogin } from '@/features/instrutor/actions/authInstrutor'
import { InstructorLoginForm } from '@/features/instrutor/components/InstructorLoginForm'

interface Props {
  params: Promise<{ escola: string }>
}

export default async function InstructorLoginPage({ params }: Props) {
  const { escola } = await params
  const supabase = createServiceClient()

  const { data: autoescola } = await supabase
    .from('autoescolas')
    .select('id, nome, status')
    .eq('slug', escola)
    .single()

  if (!autoescola || autoescola.status !== 'active') notFound()

  const instructors = await listarInstrutoresParaLogin(autoescola.id)

  return (
    <InstructorLoginForm
      instructors={instructors}
      escola={escola}
      escolaNome={autoescola.nome}
    />
  )
}
