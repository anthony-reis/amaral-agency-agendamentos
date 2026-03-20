import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { AgendamentoFlow } from '@/features/identificacao/components/AgendamentoFlow'

interface Props {
  params: Promise<{ escola: string }>
}

export default async function EscolaAgendarPage({ params }: Props) {
  const { escola } = await params
  const cookieStore = await cookies()
  const studentId = cookieStore.get('student_id')?.value

  if (!studentId) {
    redirect(`/${escola}/aluno`)
  }

  const supabase = createServiceClient()
  
  // Get student credits again to pass to flow
  const { data: credits } = await supabase
    .from('student_credits')
    .select('*')
    .eq('student_id', studentId)
    .single()

  if (!credits) {
    redirect(`/${escola}/aluno`)
  }

  // Get autoescola details for context
  const { data: autoescola } = await supabase
    .from('autoescolas')
    .select('id, nome, logo_url')
    .eq('slug', escola)
    .single()

  if (!autoescola) {
    redirect('/')
  }

  return (
    <AgendamentoFlow 
      escola={escola}
      autoescolaId={autoescola.id}
      autoescolaNome={autoescola.nome}
      autoescolaLogoUrl={autoescola.logo_url}
      studentId={studentId}
      credits={credits}
    />
  )
}
