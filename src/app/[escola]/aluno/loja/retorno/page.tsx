import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { RetornoCompra } from '@/features/aluno/components/RetornoCompra'

interface Props {
  params: Promise<{ escola: string }>
  searchParams: Promise<{ pedido?: string }>
}

export default async function RetornoPage({ params, searchParams }: Props) {
  const { escola } = await params
  const { pedido } = await searchParams

  const cookieStore = await cookies()
  if (!cookieStore.get('student_id')?.value) redirect(`/${escola}/aluno`)
  if (!pedido) redirect(`/${escola}/aluno/loja`)

  return (
    <div className="px-4 pt-6 pb-8 max-w-2xl mx-auto w-full">
      <RetornoCompra escola={escola} pedidoId={pedido} />
    </div>
  )
}
