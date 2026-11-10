import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { getAutoescolaPorSlug } from '@/lib/autoescola.server'
import { AgendamentoFlow } from '@/features/identificacao/components/AgendamentoFlow'
import { janelaAbertaAgora, MSG_FORA_DO_HORARIO, normalizarJanela } from '@/lib/janelaAgendamento'
import { CalendarClock } from 'lucide-react'

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

  const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())

  // Já resolvida pelo layout no mesmo request (React cache): não vai ao banco de novo
  const autoescola = await getAutoescolaPorSlug(escola)
  if (!autoescola) redirect('/')
  const autoescolaResult = { data: autoescola }

  const [creditsResult, studentResult, aulasFuturasResult] = await Promise.all([
    supabase.from('student_credits').select('*').eq('student_id', studentId).single(),
    supabase.from('students').select('phone').eq('id', studentId).single(),
    // Aulas futuras do aluno: o fluxo confere "1 aula por dia" no próprio navegador
    // (sem chamar o servidor a cada data escolhida). O servidor valida de novo ao agendar.
    studentDocument
      ? supabase
          .from('agendamentos')
          .select('id, date, time_slot, instructor_name')
          .eq('autoescola_id', autoescola.id)
          .gte('date', hoje)
          .neq('status', 'cancelled')
          .or(`student_document.eq.${studentDocument},cpf_cnh.eq.${studentDocument}`)
      : Promise.resolve({ data: [] as { id: string; date: string; time_slot: string; instructor_name: string }[] }),
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
  if (!janelaAbertaAgora(normalizarJanela(autoescolaResult.data.janela_agendamento))) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="max-w-sm text-center space-y-3">
          <div className="w-14 h-14 mx-auto rounded-full bg-amber-500/10 flex items-center justify-center">
            <CalendarClock className="w-7 h-7 text-amber-500" />
          </div>
          <h1 className="text-lg font-bold">Agendamento indisponível</h1>
          <p className="text-sm opacity-70">{MSG_FORA_DO_HORARIO}</p>
        </div>
      </div>
    )
  }

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
      rescheduleLimitHours={autoescolaResult.data.reagendamento_min_horas ?? 2}
      aulasFuturas={aulasFuturasResult.data ?? []}
    />
  )
}
