import { redirect } from 'next/navigation'
import { getPainelSession } from '@/features/painel/actions/authPainel'
import { listarAceitesTermos } from '@/features/painel/actions/termos'
import { TermosPrivacidade } from '@/features/painel/components/TermosPrivacidade'
import { createServiceClient } from '@/lib/supabase/server'
import { permite } from '@/lib/permissoes'
import { exigirArea } from '@/lib/permissoes.server'
import { getTermosVigentes } from '@/lib/termos.server'

interface Props {
  params: Promise<{ escola: string }>
}

export default async function TermosPage({ params }: Props) {
  const { escola } = await params
  const session = await getPainelSession(escola)
  if (!session) redirect(`/${escola}/painel/login`)
  const acesso = await exigirArea('sistema')
  const podeEditar = permite(acesso.permissoes.sistema, 'editar')

  const supabase = createServiceClient()
  const [vigente, aceites, { count: totalAlunos }] = await Promise.all([
    getTermosVigentes(session.autoescola_id),
    listarAceitesTermos(0),
    supabase
      .from('students')
      .select('id', { count: 'exact', head: true })
      .eq('autoescola_id', session.autoescola_id),
  ])

  return (
    <TermosPrivacidade
      escola={escola}
      vigente={vigente}
      initialAceites={aceites}
      totalAlunos={totalAlunos ?? 0}
      podeEditar={podeEditar}
    />
  )
}
