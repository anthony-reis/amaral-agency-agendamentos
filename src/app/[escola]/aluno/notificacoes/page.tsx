import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { listarMinhasNotificacoes } from '@/features/aluno/actions/avisos'
import { createServiceClient } from '@/lib/supabase/server'
import { exigirFeature } from '@/lib/features.server'
import { StatusNotificacoes } from '@/features/push/StatusNotificacoes'
import { ListaNotificacoes } from '@/features/push/ListaNotificacoes'

export default async function AlunoNotificacoesPage({ params }: { params: Promise<{ escola: string }> }) {
  const { escola } = await params
  const studentId = (await cookies()).get('student_id')?.value
  if (!studentId) redirect(`/${escola}/aluno`)

  const { data: esc } = await createServiceClient().from('autoescolas').select('id').eq('slug', escola).maybeSingle()
  if (!esc) redirect('/')
  await exigirFeature(esc.id, 'notificacoes')

  const itens = await listarMinhasNotificacoes()
  return (
    <div className="flex flex-col px-4 pt-6 pb-8 max-w-2xl mx-auto w-full space-y-5">
      <div>
        <h1 className="text-xl font-bold text-[--p-text-1]">Notificações</h1>
        <p className="text-sm text-[--p-text-3] mt-0.5">Seus avisos recentes e o estado das notificações neste aparelho</p>
      </div>
      <StatusNotificacoes perfil="aluno" escola={escola} />
      <ListaNotificacoes inicial={itens} buscar={listarMinhasNotificacoes} />
    </div>
  )
}
