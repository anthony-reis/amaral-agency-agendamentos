import { redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { getInstructorSession, logoutInstrutor } from '@/features/instrutor/actions/authInstrutor'
import { InstructorSidebar } from '@/features/instrutor/components/InstructorSidebar'

interface Props {
  children: React.ReactNode
  params: Promise<{ escola: string }>
}

export default async function InstructorLayout({ children, params }: Props) {
  const { escola } = await params
  const session = await getInstructorSession(escola)

  if (!session) redirect(`/${escola}/instrutor/login`)

  const supabase = createServiceClient()
  const { data: autoescola } = await supabase
    .from('autoescolas')
    .select('nome, logo_url')
    .eq('slug', escola)
    .single()

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
        onLogout={handleLogout}
      />
      <main className="flex-1 min-w-0 p-4 lg:p-6">
        {children}
      </main>
    </div>
  )
}
