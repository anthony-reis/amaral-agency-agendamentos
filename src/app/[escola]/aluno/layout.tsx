import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { AlunoSidebar } from '@/features/aluno/components/AlunoSidebar'

interface Props {
  children: React.ReactNode
  params: Promise<{ escola: string }>
}

export default async function AlunoLayout({ children, params }: Props) {
  const { escola } = await params
  const cookieStore = await cookies()
  const studentName = cookieStore.get('student_name')?.value ?? ''
  const isIdentified = !!cookieStore.get('student_id')?.value

  const supabase = createServiceClient()
  const { data: autoescola } = await supabase
    .from('autoescolas')
    .select('nome, logo_url')
    .eq('slug', escola)
    .single()

  if (!autoescola) redirect('/')

  async function handleLogout() {
    'use server'
    const store = await cookies()
    store.delete('student_id')
    store.delete('student_name')
    store.delete('student_document')
    redirect(`/${escola}/aluno`)
  }

  return (
    <div className={`min-h-screen bg-[--p-bg-base] ${isIdentified ? 'flex flex-col lg:flex-row' : 'flex flex-col'}`}>
      <AlunoSidebar
        escola={escola}
        autoescolaNome={autoescola.nome}
        autoescolaLogoUrl={autoescola.logo_url ?? null}
        studentName={studentName}
        isIdentified={isIdentified}
        onLogout={handleLogout}
      />
      <main className="flex-1 min-w-0">
        {children}
      </main>
    </div>
  )
}
