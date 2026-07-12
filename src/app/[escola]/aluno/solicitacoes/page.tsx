import { cookies } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { listarMinhasSolicitacoes } from '@/features/aluno/actions/solicitacoes'
import { SolicitacoesAluno } from '@/features/aluno/components/SolicitacoesAluno'

interface Props {
  params: Promise<{ escola: string }>
}

export default async function AlunoSolicitacoesPage({ params }: Props) {
  const { escola } = await params
  const cookieStore = await cookies()
  const studentId = cookieStore.get('student_id')?.value
  const studentName = cookieStore.get('student_name')?.value ?? ''

  if (!studentId) redirect(`/${escola}/aluno`)

  const supabase = createServiceClient()
  const { data: autoescola } = await supabase
    .from('autoescolas')
    .select('id, solicitacoes_ativo')
    .eq('slug', escola)
    .single()

  if (!autoescola) redirect('/')
  if (!autoescola.solicitacoes_ativo) notFound()

  const solicitacoes = await listarMinhasSolicitacoes(autoescola.id, studentId)

  return (
    <SolicitacoesAluno
      escola={escola}
      autoescolaId={autoescola.id}
      studentId={studentId}
      studentName={studentName}
      solicitacoesIniciais={solicitacoes}
    />
  )
}
