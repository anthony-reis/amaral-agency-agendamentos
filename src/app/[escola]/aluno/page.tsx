import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { lojaVisivelParaAluno } from '@/lib/loja'
import { listarProdutosLoja } from '@/features/aluno/actions/loja'
import { IdentificacaoPageContent } from '@/features/identificacao/components/IdentificacaoPageContent'
import type { StudentCredits } from '@/features/identificacao/types'

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

  const mostrarPlanos = await lojaVisivelParaAluno(autoescola.id)
  const produtos = mostrarPlanos ? await listarProdutosLoja(autoescola.id) : []

  // Sessão já ativa (cookie de identificação presente) — pula direto pro
  // dashboard em vez de pedir CPF e senha de novo.
  const cookieStore = await cookies()
  const studentId = cookieStore.get('student_id')?.value
  let initialStudent: { name: string; document_id: string } | null = null
  let initialCredits: StudentCredits | null = null

  if (studentId) {
    const { data: student } = await supabase
      .from('students')
      .select('id, name, document_id')
      .eq('id', studentId)
      .eq('autoescola_id', autoescola.id)
      .maybeSingle()
    if (student) {
      initialStudent = { name: student.name, document_id: student.document_id }
      const { data: credits } = await supabase
        .from('student_credits')
        .select('*')
        .eq('student_id', student.id)
        .maybeSingle()
      initialCredits = (credits as StudentCredits | null) ?? null
    }
  }

  return (
    <div className={`flex flex-col items-center justify-start pt-10 pb-6 px-4 min-h-full`}>
      <div className={`w-full mx-auto flex flex-col items-center gap-6 ${initialStudent ? 'max-w-5xl' : 'max-w-3xl'}`}>
        {!initialStudent && (
          <div className="text-center space-y-1.5">
            <h2 className="text-2xl font-bold text-[--p-text-1] tracking-tight">Identificação</h2>
            <p className="text-sm text-[--p-text-3] leading-relaxed max-w-[280px] mx-auto">
              Digite seu CPF ou CNH para verificar seus créditos e agendar aulas
            </p>
          </div>
        )}

        <IdentificacaoPageContent
          escola={escola}
          autoescolaId={autoescola.id}
          produtos={produtos}
          lojaAtiva={mostrarPlanos}
          initialIdentified={!!initialStudent}
          initialStudent={initialStudent}
          initialCredits={initialCredits}
        />
      </div>
    </div>
  )
}
