import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { AgendamentoFlow } from '@/features/identificacao/components/AgendamentoFlow'

interface Props {
  params: Promise<{ escola: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function EscolaAgendarPage({ params, searchParams }: Props) {
  const { escola } = await params
  const { reagendar } = await searchParams
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

  let rescheduleOldCategory: "CARRO" | "MOTO" | undefined = undefined;
  if (reagendar && typeof reagendar === 'string') {
    const { data: oldClass } = await supabase
      .from('agendamentos')
      .select('instructorCategory')
      .eq('id', reagendar)
      .or(`student_document.eq.${studentDocument},cpf_cnh.eq.${studentDocument}`)
      .single()
    
    if (oldClass) {
      rescheduleOldCategory = oldClass.instructorCategory as "CARRO" | "MOTO"
    } else {
      // Fallback: some bookings were created without student_document — trust the UUID
      const { data: fallback } = await supabase
        .from('agendamentos')
        .select('instructorCategory')
        .eq('id', reagendar)
        .single()
      if (fallback) {
        rescheduleOldCategory = fallback.instructorCategory as "CARRO" | "MOTO"
      }
    }
  }

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
      rescheduleMode={!!rescheduleOldCategory}
      rescheduleClassId={typeof reagendar === 'string' ? reagendar : undefined}
      rescheduleOldCategory={rescheduleOldCategory}
    />
  )
}
