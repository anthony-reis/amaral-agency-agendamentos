import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ShoppingBag, ReceiptText } from 'lucide-react'
import { createServiceClient } from '@/lib/supabase/server'
import { lojaHabilitada } from '@/lib/loja'
import { listarProdutosLoja } from '@/features/aluno/actions/loja'
import { LojaProdutos } from '@/features/aluno/components/LojaProdutos'

interface Props {
  params: Promise<{ escola: string }>
}

export default async function LojaPage({ params }: Props) {
  const { escola } = await params
  const cookieStore = await cookies()
  const studentId = cookieStore.get('student_id')?.value
  if (!studentId) redirect(`/${escola}/aluno`)

  const supabase = createServiceClient()
  const { data: autoescola } = await supabase
    .from('autoescolas')
    .select('id, nome')
    .eq('slug', escola)
    .single()
  if (!autoescola) redirect('/')

  // Feature gate: sem credencial MP ativa a loja não existe para o tenant
  if (!(await lojaHabilitada(autoescola.id))) {
    redirect(`/${escola}/aluno/agendar`)
  }

  const produtos = await listarProdutosLoja(autoescola.id)

  return (
    <div className="px-4 pt-6 pb-8 max-w-2xl mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[--p-accent]/10 flex items-center justify-center">
            <ShoppingBag className="w-5 h-5 text-[--p-accent]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[--p-text-1]">Loja</h1>
            <p className="text-sm text-[--p-text-3]">Compre pacotes de aulas e serviços</p>
          </div>
        </div>
        <Link
          href={`/${escola}/aluno/loja/compras`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[--p-text-3] hover:text-[--p-accent] transition-colors"
        >
          <ReceiptText className="w-3.5 h-3.5" />
          Minhas compras
        </Link>
      </div>

      <LojaProdutos escola={escola} produtos={produtos} />
    </div>
  )
}
