import { redirect } from 'next/navigation'
import { getInstructorSession } from '@/features/instrutor/actions/authInstrutor'
import { listarNotificacoesInstrutor } from '@/features/instrutor/actions/avisos'
import { StatusNotificacoes } from '@/features/push/StatusNotificacoes'
import { ListaNotificacoes } from '@/features/push/ListaNotificacoes'

export default async function InstrutorNotificacoesPage({ params }: { params: Promise<{ escola: string }> }) {
  const { escola } = await params
  const session = await getInstructorSession(escola)
  if (!session) redirect(`/${escola}/instrutor/login?expirada=1`)

  const itens = await listarNotificacoesInstrutor(escola)
  const buscar = async () => {
    'use server'
    return listarNotificacoesInstrutor(escola)
  }
  return (
    <div className="flex flex-col max-w-2xl mx-auto w-full space-y-5">
      <div>
        <h1 className="text-xl font-bold text-[--p-text-1]">Notificações</h1>
        <p className="text-sm text-[--p-text-3] mt-0.5">Seus avisos recentes e o estado das notificações neste aparelho</p>
      </div>
      <StatusNotificacoes perfil="instrutor" escola={escola} />
      <ListaNotificacoes inicial={itens} buscar={buscar} />
    </div>
  )
}
