import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { getAutoescolaPorSlug } from '@/lib/autoescola.server'
import { getDashboardAluno, type DashboardAluno } from '@/features/aluno/actions/dashboard'
import { lojaVisivelParaAluno } from '@/lib/loja'
import { getAutoescolaFeatures } from '@/lib/features.server'
import { listarProdutosLoja } from '@/features/aluno/actions/loja'
import { IdentificacaoPageContent } from '@/features/identificacao/components/IdentificacaoPageContent'
import type { StudentCredits } from '@/features/identificacao/types'

interface Props {
  params: Promise<{ escola: string }>
}

export default async function EscolaAlunoPage({ params }: Props) {
  const { escola } = await params

  const autoescola = await getAutoescolaPorSlug(escola)
  if (!autoescola) notFound()

  const cookieStore = await cookies()
  const studentId = cookieStore.get('student_id')?.value
  const supabase = createServiceClient()

  // Independentes: em paralelo (layout e página compartilham o cache do request)
  const [features, mostrarPlanos, aluno] = await Promise.all([
    getAutoescolaFeatures(autoescola.id),
    lojaVisivelParaAluno(autoescola.id),
    // Sessão já ativa (cookie de identificação presente) — pula direto pro
    // dashboard em vez de pedir CPF e senha de novo.
    studentId
      ? Promise.all([
          supabase
            .from('students')
            .select('id, name, document_id')
            .eq('id', studentId)
            .eq('autoescola_id', autoescola.id)
            .maybeSingle(),
          supabase.from('student_credits').select('*').eq('student_id', studentId).maybeSingle(),
        ])
      : Promise.resolve(null),
  ])
  const produtos = mostrarPlanos ? await listarProdutosLoja(autoescola.id) : []

  let initialStudent: { name: string; document_id: string } | null = null
  let initialCredits: StudentCredits | null = null
  let initialDashboard: DashboardAluno | null = null

  const student = aluno?.[0].data
  if (student) {
    initialStudent = { name: student.name, document_id: student.document_id }
    initialCredits = (aluno?.[1].data as StudentCredits | null) ?? null
    if (features.dashboard_aluno) {
      const hoje = new Date()
      initialDashboard = await getDashboardAluno(autoescola.id, student.document_id, hoje.getFullYear(), hoje.getMonth() + 1)
    }
  }

  // Sem o dashboard do aluno, quem já está identificado vai direto agendar.
  if (initialStudent && !features.dashboard_aluno) redirect(`/${escola}/aluno/agendar`)

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
          exigeSenha={features.login_senha_aluno}
          dashboardAtivo={features.dashboard_aluno}
          initialDashboard={initialDashboard}
        />
      </div>
    </div>
  )
}
