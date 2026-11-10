import { notFound } from 'next/navigation'
import { autoescolaAcessivel } from '@/lib/autoescolaAcesso'
import { getAutoescolaPorSlug } from '@/lib/autoescola.server'

interface Props {
  children: React.ReactNode
  params: Promise<{ escola: string }>
}

export default async function EscolaLayout({ children, params }: Props) {
  const { escola } = await params
  const autoescola = await getAutoescolaPorSlug(escola)

  if (!autoescolaAcessivel(autoescola)) notFound()

  return <>{children}</>
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ escola: string }>
}) {
  const { escola } = await params
  const data = await getAutoescolaPorSlug(escola)

  return {
    title: data ? `${data.nome} — AmaralPro` : 'AmaralPro',
  }
}
