import { redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { getPainelSession } from '@/features/painel/actions/authPainel'
import { ListaAgendamentosView } from '@/features/painel/components/ListaAgendamentosView'
import { listarAgendamentos } from '@/features/painel/actions/agendamentos'

interface Props {
  params: Promise<{ escola: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function ListaAgendamentosPage({ params, searchParams }: Props) {
  const { escola } = await params
  const session = await getPainelSession(escola)
  if (!session) redirect(`/${escola}/painel/login`)

  const resolvedParams = await searchParams
  
  // Extrair filtros da query string
  const limitStr = typeof resolvedParams.limit === 'string' ? resolvedParams.limit : '100'
  const offsetStr = typeof resolvedParams.offset === 'string' ? resolvedParams.offset : '0'
  const date_start = typeof resolvedParams.date_start === 'string' ? resolvedParams.date_start : undefined
  const date_end = typeof resolvedParams.date_end === 'string' ? resolvedParams.date_end : undefined
  const instructor_name = typeof resolvedParams.instructor === 'string' ? resolvedParams.instructor : undefined
  const category = typeof resolvedParams.category === 'string' ? resolvedParams.category : undefined
  const status = typeof resolvedParams.status === 'string' ? resolvedParams.status : undefined
  const search = typeof resolvedParams.search === 'string' ? resolvedParams.search : undefined

  // Executar a busca
  const filter = {
    autoescola_id: session.autoescola_id,
    date_start,
    date_end,
    instructor_name,
    category,
    status,
    search,
    limit: parseInt(limitStr, 10),
    offset: parseInt(offsetStr, 10),
  }

  const result = await listarAgendamentos(filter)

  const supabase = createServiceClient()
  const { data: instrutores } = await supabase
    .from('instructors')
    .select('name')
    .eq('autoescola_id', session.autoescola_id)
    .order('name')

  const instructorNames = (instrutores ?? []).map((i) => i.name)

  return (
    <div className="p-6">
      <ListaAgendamentosView 
        initialAgendamentos={result.data}
        total={result.total}
        filter={filter}
        autoescola_id={session.autoescola_id}
        escolaSlug={escola}
        instrutores={instructorNames}
        userRole={session.role}
      />
    </div>
  )
}
