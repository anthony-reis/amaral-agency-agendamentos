import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'

interface Props {
  children: React.ReactNode
  params: Promise<{ escola: string }>
}

export default async function EscolaLayout({ children, params }: Props) {
  const { escola } = await params
  const supabase = createServiceClient()

  const { data: autoescola } = await supabase
    .from('autoescolas')
    .select('id, nome, logo_url, slug, status')
    .eq('slug', escola)
    .eq('status', 'active')
    .maybeSingle()

  if (!autoescola) notFound()

  return <>{children}</>
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ escola: string }>
}) {
  const { escola } = await params
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('autoescolas')
    .select('nome')
    .eq('slug', escola)
    .maybeSingle()

  return {
    title: data ? `${data.nome} — AmaralPro` : 'AmaralPro',
  }
}
