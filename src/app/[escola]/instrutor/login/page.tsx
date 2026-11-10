import { notFound } from 'next/navigation'
import { getAutoescolaPorSlug } from '@/lib/autoescola.server'
import { autoescolaAcessivel } from '@/lib/autoescolaAcesso'
import { listarInstrutoresParaLogin } from '@/features/instrutor/actions/authInstrutor'
import { InstructorLoginForm } from '@/features/instrutor/components/InstructorLoginForm'

interface Props {
  params: Promise<{ escola: string }>
  searchParams: Promise<{ expirada?: string }>
}

export default async function InstructorLoginPage({ params, searchParams }: Props) {
  const { escola } = await params
  const { expirada } = await searchParams
  const autoescola = await getAutoescolaPorSlug(escola)

  if (!autoescolaAcessivel(autoescola)) notFound()

  const instructors = await listarInstrutoresParaLogin(autoescola.id)

  return (
    <InstructorLoginForm
      instructors={instructors}
      escola={escola}
      escolaNome={autoescola.nome}
      sessaoExpirada={expirada === '1'}
    />
  )
}
