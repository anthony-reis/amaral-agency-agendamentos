import { redirect } from 'next/navigation'

interface Props {
  params: Promise<{ escola: string }>
}

// A tela virou "Travamentos"; mantém links antigos funcionando.
export default async function RegrasReagendamentoPage({ params }: Props) {
  const { escola } = await params
  redirect(`/${escola}/painel/travamentos`)
}
