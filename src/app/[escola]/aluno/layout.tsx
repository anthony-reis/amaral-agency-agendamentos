import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { AlunoSidebar } from '@/features/aluno/components/AlunoSidebar'
import { ComunicadosModalWrapper } from '@/features/aluno/components/ComunicadosModalWrapper'
import { buscarComunicadosNaoLidos } from '@/features/aluno/actions/comunicados'
import type { Comunicado } from '@/features/painel/types'

interface Props {
  children: React.ReactNode
  params: Promise<{ escola: string }>
}

export default async function AlunoLayout({ children, params }: Props) {
  const { escola } = await params
  const cookieStore = await cookies()
  const studentName = cookieStore.get('student_name')?.value ?? ''
  const studentDocument = cookieStore.get('student_document')?.value ?? ''
  const isIdentified = !!cookieStore.get('student_id')?.value

  const supabase = createServiceClient()
  const { data: autoescola } = await supabase
    .from('autoescolas')
    .select('id, nome, logo_url, solicitacoes_ativo')
    .eq('slug', escola)
    .single()

  if (!autoescola) redirect('/')

  let unreadComunicados: Comunicado[] = []
  if (isIdentified && studentDocument) {
    unreadComunicados = await buscarComunicadosNaoLidos(autoescola.id, studentDocument)
  }

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
        solicitacoesAtivo={autoescola.solicitacoes_ativo ?? false}
        onLogout={handleLogout}
      />
      <main className="flex-1 min-w-0">
        {children}
      </main>
      {isIdentified && unreadComunicados.length > 0 && (
        <ComunicadosModalWrapper
          comunicados={unreadComunicados}
          studentDocument={studentDocument}
          autoescolaId={autoescola.id}
          escola={escola}
        />
      )}
    </div>
  )
}
