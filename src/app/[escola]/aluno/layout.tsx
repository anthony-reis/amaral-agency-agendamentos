import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { AlunoSidebar } from '@/features/aluno/components/AlunoSidebar'
import { ComunicadosModalWrapper } from '@/features/aluno/components/ComunicadosModalWrapper'
import { buscarComunicadosNaoLidos } from '@/features/aluno/actions/comunicados'
import { lojaVisivelParaAluno } from '@/lib/loja'
import { getAutoescolaFeatures } from '@/lib/features.server'
import { TermosAceiteGate } from '@/features/aluno/components/TermosAceiteGate'
import { getTermosPendentesAluno } from '@/lib/termos.server'
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
  const studentId = cookieStore.get('student_id')?.value
  const isIdentified = !!studentId

  const supabase = createServiceClient()
  const { data: autoescola } = await supabase
    .from('autoescolas')
    .select('id, nome, logo_url')
    .eq('slug', escola)
    .single()

  if (!autoescola) redirect('/')

  async function handleLogout() {
    'use server'
    const store = await cookies()
    store.delete('student_id')
    store.delete('student_name')
    store.delete('student_document')
    store.delete('student_sig')
    redirect(`/${escola}/aluno`)
  }

  // Termos de uso / privacidade: no primeiro acesso, nada do app abre antes
  // do aceite (vale para todas as rotas do aluno, não só a inicial).
  const termosPendentes = studentId ? await getTermosPendentesAluno(autoescola.id, studentId) : null
  if (termosPendentes) {
    return (
      <TermosAceiteGate
        escola={escola}
        autoescolaNome={autoescola.nome}
        logoUrl={autoescola.logo_url ?? null}
        studentName={studentName}
        termos={{
          id: termosPendentes.id,
          versao: termosPendentes.versao,
          termos_uso: termosPendentes.termos_uso,
          politica_privacidade: termosPendentes.politica_privacidade,
          created_at: termosPendentes.created_at,
        }}
        onLogout={handleLogout}
      />
    )
  }

  let unreadComunicados: Comunicado[] = []
  if (isIdentified && studentDocument) {
    unreadComunicados = await buscarComunicadosNaoLidos(autoescola.id, studentDocument)
  }

  const features = await getAutoescolaFeatures(autoescola.id)
  const lojaAtiva = isIdentified ? await lojaVisivelParaAluno(autoescola.id) : false

  return (
    <div className={`min-h-screen bg-[--p-bg-base] ${isIdentified ? 'flex flex-col lg:flex-row' : 'flex flex-col'}`}>
      <AlunoSidebar
        escola={escola}
        autoescolaNome={autoescola.nome}
        autoescolaLogoUrl={autoescola.logo_url ?? null}
        studentName={studentName}
        isIdentified={isIdentified}
        solicitacoesAtivo={features.solicitacoes}
        dashboardAtivo={features.dashboard_aluno}
        lojaAtiva={lojaAtiva}
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
