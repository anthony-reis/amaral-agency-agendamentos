import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { buscarTodosComunicados } from '@/features/aluno/actions/comunicados'
import { Megaphone, CheckCircle2, Clock } from 'lucide-react'

interface Props {
  params: Promise<{ escola: string }>
}

export default async function AlunoComunicadosPage({ params }: Props) {
  const { escola } = await params
  const cookieStore = await cookies()
  const studentDocument = cookieStore.get('student_document')?.value
  const studentId = cookieStore.get('student_id')?.value

  if (!studentId || !studentDocument) redirect(`/${escola}/aluno`)

  const supabase = createServiceClient()
  const { data: autoescola } = await supabase
    .from('autoescolas')
    .select('id')
    .eq('slug', escola)
    .single()

  if (!autoescola) redirect('/')

  const comunicados = await buscarTodosComunicados(autoescola.id, studentDocument)

  return (
    <div className="flex flex-col min-h-full">
      <div className="flex-1 flex flex-col px-4 pt-6 pb-8 max-w-2xl mx-auto w-full">

        <div className="mb-6">
          <h1 className="text-xl font-bold text-[--p-text-1]">Comunicados</h1>
          <p className="text-sm text-[--p-text-3] mt-0.5">Avisos e informações da autoescola</p>
        </div>

        {comunicados.length === 0 ? (
          <div className="bg-[--p-bg-card] border border-[--p-border] rounded-2xl p-10 text-center">
            <Megaphone className="w-10 h-10 text-[--p-text-3] mx-auto mb-3 opacity-30" />
            <p className="text-sm text-[--p-text-3]">Nenhum comunicado publicado ainda.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {comunicados.map((c) => (
              <div
                key={c.id}
                className={`bg-[--p-bg-card] border rounded-2xl p-5 transition-opacity ${
                  c.lido ? 'border-[--p-border] opacity-60' : 'border-[--p-accent]/30'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                    c.lido ? 'bg-[--p-bg-input]' : 'bg-[--p-accent]/15'
                  }`}>
                    {c.lido
                      ? <CheckCircle2 className="w-4 h-4 text-[--p-text-3]" />
                      : <Megaphone className="w-4 h-4 text-[--p-accent]" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="text-sm font-bold text-[--p-text-1]">{c.titulo}</h3>
                      {!c.lido && (
                        <span className="text-[10px] font-semibold bg-[--p-accent]/10 text-[--p-accent] px-1.5 py-0.5 rounded-full">
                          Novo
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[--p-text-2] whitespace-pre-wrap leading-relaxed mb-3">
                      {c.descricao}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-[--p-text-3]">
                      <Clock className="w-3 h-3" />
                      {new Date(c.created_at).toLocaleDateString('pt-BR', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
