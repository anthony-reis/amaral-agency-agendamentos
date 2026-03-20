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
  const studentName = cookieStore.get('student_name')?.value ?? ''
  const studentDocument = cookieStore.get('student_document')?.value ?? ''

  if (!studentId) redirect(`/${escola}/aluno`)

  const supabase = createServiceClient()

  const [creditsResult, studentResult, autoescolaResult] = await Promise.all([
    supabase.from('student_credits').select('*').eq('student_id', studentId).single(),
    supabase.from('students').select('phone').eq('id', studentId).single(),
    supabase.from('autoescolas').select('id, nome, logo_url').eq('slug', escola).single(),
  ])

  if (!creditsResult.data) redirect(`/${escola}/aluno`)
  if (!autoescolaResult.data) redirect('/')

  return (
    <AgendamentoFlow
      escola={escola}
      autoescolaId={autoescolaResult.data.id}
      autoescolaNome={autoescolaResult.data.nome}
      autoescolaLogoUrl={autoescolaResult.data.logo_url}
      studentId={studentId}
      studentName={studentName}
      studentDocument={studentDocument}
      studentPhone={studentResult.data?.phone ?? null}
      credits={creditsResult.data}
    />
  )
}
