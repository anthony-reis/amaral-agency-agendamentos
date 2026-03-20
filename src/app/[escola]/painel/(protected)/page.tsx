import { redirect } from 'next/navigation'

interface Props {
  params: Promise<{ escola: string }>
}

export default async function PainelRootPage({ params }: Props) {
  const { escola } = await params
  redirect(`/${escola}/painel/dashboard`)
}
