import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import { Calendar as CalendarIcon, Clock, User, CheckCircle2, RefreshCw, Car } from 'lucide-react'

interface Props {
  params: Promise<{ escola: string }>
}

export default async function MinhasAulasPage({ params }: Props) {
  const { escola } = await params
  const cookieStore = await cookies()
  const studentId = cookieStore.get('student_id')?.value
  const studentName = cookieStore.get('student_name')?.value

  if (!studentId) {
    redirect(`/${escola}/aluno`)
  }

  const supabase = createServiceClient()

  // Autoescola info
  const { data: autoescola } = await supabase
    .from('autoescolas')
    .select('id, nome, logo_url')
    .eq('slug', escola)
    .single()

  if (!autoescola) redirect('/')

  // Fetch Credits
  const { data: credits } = await supabase
    .from('student_credits')
    .select('*')
    .eq('student_id', studentId)
    .single()

  // We should query using the actual student document/ID. Since we might have stored it using cpf_cnh:
  // Let's get the document_id from the student record
  const { data: student } = await supabase
    .from('students')
    .select('document_id')
    .eq('id', studentId)
    .single()

  // Fetch Agendamentos using document_id (or student_id if schema has it, but claude.md says cpf_cnh or student_document)
  const doc = student?.document_id || ''
  const { data: agendamentos, error } = await supabase
    .from('agendamentos')
    .select('*')
    .eq('autoescola_id', autoescola.id)
    .eq('student_document', doc) // assuming student_document matches the cpf_cnh
    .order('date', { ascending: false })
    .order('time_slot', { ascending: false })

  // Fallback to fetch using CPF/CNH directly if student_document is empty on old records
  const agendamentosList = agendamentos || []
  if (agendamentosList.length === 0 && doc) {
    const { data: fallbackAgendamentos } = await supabase
      .from('agendamentos')
      .select('*')
      .eq('autoescola_id', autoescola.id)
      .eq('cpf_cnh', doc)
      .order('date', { ascending: false })
      .order('time_slot', { ascending: false })
    if (fallbackAgendamentos) agendamentosList.push(...fallbackAgendamentos)
  }

  // Deduplicate manually just in case
  const uniqueAgendamentos = Array.from(new Map(agendamentosList.map(item => [item.id, item])).values())

  const agendadas = uniqueAgendamentos.filter(a => a.status === 'scheduled' || a.status === 'confirmed')
  const concluidas = uniqueAgendamentos.filter(a => a.status === 'completed')

  return (
    <main className="min-h-screen bg-gradient-navy flex flex-col">
      {/* Header */}
      <header className="w-full py-4 px-4 flex items-center justify-between border-b border-white/5 bg-white/5">
        <Link href={`/${escola}/aluno/agendar`} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 text-slate-300 hover:bg-white/20">
          <CalendarIcon className="w-4 h-4" />
        </Link>
        <span className="text-sm font-semibold text-white tracking-wide">Minhas Aulas</span>
        <div className="w-8" />
      </header>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center pt-6 pb-12 px-4">
        <div className="w-full max-w-sm flex flex-col items-stretch space-y-6">
          
          {/* User & Credits Card */}
          <div className="bg-white rounded-2xl shadow-card p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-teal/5 rounded-full blur-2xl -mt-10 -mr-10" />
            
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-full bg-brand-teal/10 flex items-center justify-center text-brand-teal">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800 uppercase leading-tight">{studentName?.split(' ')[0]}</h2>
                <p className="text-xs text-slate-500 font-medium">Aluno</p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Créditos Disponíveis</p>
              <div className="flex flex-wrap gap-2">
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-3 py-2 rounded-xl">
                  <span className="text-sm font-semibold text-slate-700">Carro:</span>
                  <span className="bg-brand-teal text-white text-xs font-bold px-2 py-0.5 rounded-md">{credits?.aulas_cat_b || 0}</span>
                </div>
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-3 py-2 rounded-xl">
                  <span className="text-sm font-semibold text-slate-700">Moto:</span>
                  <span className="bg-brand-teal text-white text-xs font-bold px-2 py-0.5 rounded-md">{credits?.aulas_cat_a || 0}</span>
                </div>
              </div>
            </div>
            
            <Link href={`/${escola}/aluno/agendar`} className="mt-5 w-full bg-brand-teal text-white font-semibold text-sm py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-brand-teal-dark transition-colors shadow-md">
              <CalendarIcon className="w-4 h-4" />
              Agendar Nova Aula
            </Link>
          </div>

          {/* Agendadas */}
          <div>
            <div className="flex items-center gap-2 mb-3 px-1">
              <CalendarIcon className="w-5 h-5 text-blue-500" />
              <h3 className="font-bold text-white">Aulas Agendadas ({agendadas.length})</h3>
            </div>
            
            <div className="space-y-3">
              {agendadas.length === 0 ? (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
                  <p className="text-sm text-slate-400">Você não possui aulas agendadas.</p>
                </div>
              ) : (
                agendadas.map(aula => (
                  <div key={aula.id} className="bg-white rounded-2xl shadow-card p-4 space-y-3 border-l-4 border-blue-500">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2 py-1 rounded-md">Agendada</span>
                        <span className="bg-purple-50 text-purple-700 text-xs font-bold px-2 py-1 rounded-md">{aula.instructorCategory === 'CARRO' ? 'Carro' : 'Moto'}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-slate-600 text-sm">
                        <CalendarIcon className="w-4 h-4 text-slate-400" />
                        <span className="capitalize">{new Date(aula.date).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600 text-sm">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span>{aula.time_slot.substring(0, 5)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600 text-sm">
                        <User className="w-4 h-4 text-slate-400" />
                        <span className="uppercase">{aula.instructor_name}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Concluidas */}
          <div className="pt-4">
            <div className="flex items-center gap-2 mb-3 px-1">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-white">Aulas Concluídas ({concluidas.length})</h3>
            </div>
            
            <div className="space-y-3">
              {concluidas.length === 0 ? (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
                  <p className="text-sm text-slate-400">Nenhuma aula concluída ainda.</p>
                </div>
              ) : (
                concluidas.map(aula => (
                  <div key={aula.id} className="bg-white/95 rounded-2xl shadow-card p-4 space-y-3 border-l-4 border-emerald-500 opacity-90">
                    <div className="flex items-center gap-2">
                      <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1">
                         Concluída
                      </span>
                      <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2 py-1 rounded-md">{aula.instructorCategory === 'CARRO' ? 'Carro' : 'Moto'}</span>
                    </div>
                    
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-slate-500 text-sm">
                        <CalendarIcon className="w-4 h-4 text-slate-400" />
                        <span className="capitalize">{new Date(aula.date).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'short' })}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </main>
  )
}
