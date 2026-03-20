import { redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { getPainelSession, logoutPainel } from '@/features/painel/actions/authPainel'
import { PainelNav } from '@/features/painel/components/PainelNav'

interface Props {
  children: React.ReactNode
  params: Promise<{ escola: string }>
}

export default async function PainelProtectedLayout({ children, params }: Props) {
  const { escola } = await params
  const session = await getPainelSession(escola)

  if (!session) {
    redirect(`/${escola}/painel/login`)
  }

  const supabase = createServiceClient()
  const { data: autoescola } = await supabase
    .from('autoescolas')
    .select('nome, logo_url')
    .eq('slug', escola)
    .single()

  async function handleLogout() {
    'use server'
    await logoutPainel(escola)
    redirect(`/${escola}/painel/login`)
  }

  return (
    <div className="min-h-screen bg-[--p-bg-base] flex flex-col lg:flex-row">
      <PainelNav
        escola={escola}
        escolaNome={autoescola?.nome ?? escola}
        logoUrl={autoescola?.logo_url ?? null}
        userName={session.full_name}
        userRole={session.role}
        onLogout={handleLogout}
      />
      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
