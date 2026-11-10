import { redirect } from 'next/navigation'
import { getAutoescolaPorSlug } from '@/lib/autoescola.server'
import { getInstructorSession, logoutInstrutor } from '@/features/instrutor/actions/authInstrutor'
import { InstructorSidebar } from '@/features/instrutor/components/InstructorSidebar'
import { AvisosInstrutor } from '@/features/instrutor/components/AvisosInstrutor'
import { AtivarNotificacoes } from '@/features/push/AtivarNotificacoes'
import { ComunicadosModalWrapper } from '@/features/instrutor/components/ComunicadosModalWrapper'
import { buscarComunicadosNaoLidosInstrutor } from '@/features/instrutor/actions/comunicados'
import { getAutoescolaFeatures } from '@/lib/features.server'

interface Props {
  children: React.ReactNode
  params: Promise<{ escola: string }>
}

export default async function InstructorLayout({ children, params }: Props) {
  const { escola } = await params
  const session = await getInstructorSession(escola)

  if (!session) redirect(`/${escola}/instrutor/login?expirada=1`)

  const autoescola = await getAutoescolaPorSlug(escola)

  const [unreadComunicados, features] = autoescola
    ? await Promise.all([
        buscarComunicadosNaoLidosInstrutor(autoescola.id, session.instructorId),
        getAutoescolaFeatures(autoescola.id),
      ])
    : [[], null]

  const notificacoesAtivo = features?.notificacoes ?? false

  async function handleLogout() {
    'use server'
    await logoutInstrutor()
    redirect(`/${escola}/instrutor/login`)
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[--p-bg-base]">
      <InstructorSidebar
        escola={escola}
        name={session.name}
        category={session.category}
        logoUrl={autoescola?.logo_url ?? null}
        notificacoesAtivo={notificacoesAtivo}
        onLogout={handleLogout}
      />
      <main className="flex-1 min-w-0 p-4 lg:p-6">
        {notificacoesAtivo && <AvisosInstrutor escola={escola} instructorId={session.instructorId} />}
        {notificacoesAtivo && <AtivarNotificacoes perfil="instrutor" escola={escola} />}
        {children}
      </main>
      {autoescola && unreadComunicados.length > 0 && (
        <ComunicadosModalWrapper
          comunicados={unreadComunicados}
          instructorId={session.instructorId}
          autoescolaId={autoescola.id}
          escola={escola}
        />
      )}
    </div>
  )
}
