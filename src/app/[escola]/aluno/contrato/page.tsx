import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { exigirFeature } from '@/lib/features.server'
import { listarMeusContratos } from '@/features/aluno/actions/contrato'
import { ContratoAluno } from '@/features/aluno/components/ContratoAluno'

interface Props {
  params: Promise<{ escola: string }>
}

export default async function AlunoContratoPage({ params }: Props) {
  const { escola } = await params
  const cookieStore = await cookies()
  const studentId = cookieStore.get('student_id')?.value
  if (!studentId) redirect(`/${escola}/aluno`)

  const supabase = createServiceClient()
  const { data: autoescola } = await supabase.from('autoescolas').select('id').eq('slug', escola).single()
  if (!autoescola) redirect('/')
  await exigirFeature(autoescola.id, 'contratos')

  const contratos = await listarMeusContratos(autoescola.id, studentId)
  return <ContratoAluno escola={escola} contratos={contratos} />
}
