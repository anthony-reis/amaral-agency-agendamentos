import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { Calendar, Clock, User, CheckCircle2, CalendarDays, Car, Bike, XCircle } from 'lucide-react'

interface Props {
  params: Promise<{ escola: string }>
}

function getDaysUntil(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr + 'T12:00:00')
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function groupByMonth<T extends { date: string }>(items: T[]): { label: string; items: T[] }[] {
  const map = new Map<string, T[]>()
  for (const item of items) {
    const d = new Date(item.date + 'T12:00:00')
    const key = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(item)
  }
  return Array.from(map.entries()).map(([label, items]) => ({ label, items }))
}

export default async function MinhasAulasPage({ params }: Props) {
  const { escola } = await params
  const cookieStore = await cookies()
  const studentId = cookieStore.get('student_id')?.value
  const studentName = cookieStore.get('student_name')?.value

  if (!studentId) redirect(`/${escola}/aluno`)

  const supabase = createServiceClient()

  const { data: autoescola } = await supabase
    .from('autoescolas')
    .select('id, nome, logo_url')
    .eq('slug', escola)
    .single()

  if (!autoescola) redirect('/')

  const [{ data: credits }, { data: student }] = await Promise.all([
    supabase.from('student_credits').select('*').eq('student_id', studentId).single(),
    supabase.from('students').select('document_id').eq('id', studentId).single(),
  ])

  const doc = student?.document_id ?? ''

  const { data: byDoc } = doc
    ? await supabase
        .from('agendamentos')
        .select('id, date, time_slot, instructor_name, instructorCategory, status')
        .eq('autoescola_id', autoescola.id)
        .eq('student_document', doc)
        .neq('status', 'cancelled')
        .order('date', { ascending: false })
    : { data: [] }

  const { data: byCpf } = doc
    ? await supabase
        .from('agendamentos')
        .select('id, date, time_slot, instructor_name, instructorCategory, status')
        .eq('autoescola_id', autoescola.id)
        .eq('cpf_cnh', doc)
        .neq('status', 'cancelled')
        .order('date', { ascending: false })
    : { data: [] }

  const all = [...(byDoc ?? []), ...(byCpf ?? [])]
  const unique = Array.from(new Map(all.map(a => [a.id, a])).values())
  unique.sort((a, b) => (a.date < b.date ? 1 : -1))

  const agendadas = unique
    .filter(a => a.status === 'scheduled' || a.status === 'confirmed')
    .sort((a, b) => (a.date > b.date ? 1 : -1)) // ascending for upcoming
  const concluidas = unique.filter(a => a.status === 'completed' || a.status === 'absent')

  const concluídasPorMês = groupByMonth(concluidas)

  const totalCredits = (credits?.aulas_cat_a ?? 0) + (credits?.aulas_cat_b ?? 0)
  const carroCredits = credits?.aulas_cat_b ?? 0
  const motoCredits = credits?.aulas_cat_a ?? 0

  return (
    <div className="flex flex-col min-h-full">
      <div className="flex-1 flex flex-col px-4 pt-6 pb-8 max-w-2xl mx-auto w-full">

        {/* Page title */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-[--p-text-1]">Minhas Aulas</h1>
          <p className="text-sm text-[--p-text-3] mt-0.5 capitalize">
            {studentName?.toLowerCase()}
          </p>
        </div>

        {/* Créditos */}
        <div className="bg-[--p-bg-card] border border-[--p-border] rounded-2xl p-5 mb-6">
          <p className="text-xs font-semibold text-[--p-text-3] uppercase tracking-wider mb-4">
            Créditos disponíveis
          </p>
          <div className="grid grid-cols-2 gap-3">
            {/* Carro */}
            <div className="bg-[--p-bg-input] rounded-xl p-4 border border-[--p-border]">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                  <Car className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <span className="text-xs font-semibold text-[--p-text-2]">Carro</span>
              </div>
              <p className="text-3xl font-bold text-[--p-text-1] leading-none">{carroCredits}</p>
              <p className="text-xs text-[--p-text-3] mt-1">créditos</p>
              {carroCredits > 0 && (
                <div className="mt-2 h-1 bg-[--p-border] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-400 rounded-full transition-all"
                    style={{ width: `${Math.min(100, (carroCredits / Math.max(carroCredits + motoCredits, 1)) * 100)}%` }}
                  />
                </div>
              )}
            </div>
            {/* Moto */}
            <div className="bg-[--p-bg-input] rounded-xl p-4 border border-[--p-border]">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <Bike className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <span className="text-xs font-semibold text-[--p-text-2]">Moto</span>
              </div>
              <p className="text-3xl font-bold text-[--p-text-1] leading-none">{motoCredits}</p>
              <p className="text-xs text-[--p-text-3] mt-1">créditos</p>
              {motoCredits > 0 && (
                <div className="mt-2 h-1 bg-[--p-border] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 rounded-full transition-all"
                    style={{ width: `${Math.min(100, (motoCredits / Math.max(carroCredits + motoCredits, 1)) * 100)}%` }}
                  />
                </div>
              )}
            </div>
          </div>
          {totalCredits === 0 && (
            <p className="text-xs text-[--p-text-3] text-center mt-3">
              Sem créditos disponíveis. Entre em contato com a autoescola.
            </p>
          )}
        </div>

        {/* Agendadas */}
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <CalendarDays className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-bold text-[--p-text-1]">Próximas Aulas</h3>
            {agendadas.length > 0 && (
              <span className="ml-auto text-xs font-semibold bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full">
                {agendadas.length}
              </span>
            )}
          </div>

          {agendadas.length === 0 ? (
            <div className="bg-[--p-bg-card] border border-[--p-border] rounded-2xl p-6 text-center">
              <CalendarDays className="w-8 h-8 text-[--p-text-3] mx-auto mb-2 opacity-40" />
              <p className="text-sm text-[--p-text-3]">Nenhuma aula agendada.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {agendadas.map(aula => {
                const daysUntil = getDaysUntil(aula.date)
                const isToday = daysUntil === 0
                const isTomorrow = daysUntil === 1
                const isCarro = aula.instructorCategory === 'CARRO'
                return (
                  <div
                    key={aula.id}
                    className={`bg-[--p-bg-card] border border-[--p-border] rounded-2xl p-4 border-l-4 ${isCarro ? 'border-l-blue-500' : 'border-l-emerald-500'} space-y-3`}
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                          aula.status === 'confirmed'
                            ? 'bg-blue-500/15 text-blue-400'
                            : 'bg-[--p-bg-input] text-[--p-text-3] border border-[--p-border]'
                        }`}>
                          {aula.status === 'confirmed' ? 'Confirmada' : 'Agendada'}
                        </span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                          isCarro ? 'bg-blue-500/10 text-blue-400' : 'bg-emerald-500/10 text-emerald-400'
                        }`}>
                          {isCarro ? 'Carro' : 'Moto'}
                        </span>
                      </div>
                      {isToday ? (
                        <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">Hoje</span>
                      ) : isTomorrow ? (
                        <span className="text-xs font-bold text-[--p-accent] bg-[--p-accent]/10 px-2 py-0.5 rounded-full">Amanhã</span>
                      ) : daysUntil > 0 ? (
                        <span className="text-xs text-[--p-text-3]">em {daysUntil} dias</span>
                      ) : null}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center gap-2 text-sm text-[--p-text-2]">
                        <Calendar className="w-3.5 h-3.5 text-[--p-text-3] shrink-0" />
                        <span className="capitalize text-xs">
                          {new Date(aula.date + 'T12:00:00').toLocaleDateString('pt-BR', {
                            weekday: 'short', day: '2-digit', month: 'short',
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-[--p-text-2]">
                        <Clock className="w-3.5 h-3.5 text-[--p-text-3] shrink-0" />
                        <span className="font-semibold">{aula.time_slot?.substring(0, 5)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-[--p-text-2] col-span-2">
                        <User className="w-3.5 h-3.5 text-[--p-text-3] shrink-0" />
                        <span className="uppercase text-xs truncate">{aula.instructor_name}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Concluídas */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-[--p-text-1]">Histórico</h3>
            {concluidas.length > 0 && (
              <span className="ml-auto text-xs font-semibold bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full">
                {concluidas.length}
              </span>
            )}
          </div>

          {concluidas.length === 0 ? (
            <div className="bg-[--p-bg-card] border border-[--p-border] rounded-2xl p-6 text-center">
              <CheckCircle2 className="w-8 h-8 text-[--p-text-3] mx-auto mb-2 opacity-40" />
              <p className="text-sm text-[--p-text-3]">Nenhuma aula concluída ainda.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {concluídasPorMês.map(({ label, items }) => (
                <div key={label}>
                  <p className="text-xs font-semibold text-[--p-text-3] capitalize tracking-wider mb-2">{label}</p>
                  <div className="space-y-2">
                    {items.map(aula => {
                      const isAbsent = aula.status === 'absent'
                      const isCarro = aula.instructorCategory === 'CARRO'
                      return (
                        <div
                          key={aula.id}
                          className={`bg-[--p-bg-card] border border-[--p-border] rounded-xl p-3.5 border-l-4 ${
                            isAbsent ? 'border-l-red-500/60 opacity-70' : isCarro ? 'border-l-blue-500/40' : 'border-l-emerald-500/40'
                          } flex items-center gap-3`}
                        >
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                            isAbsent ? 'bg-red-500/10' : 'bg-emerald-500/10'
                          }`}>
                            {isAbsent
                              ? <XCircle className="w-3.5 h-3.5 text-red-400" />
                              : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-semibold text-[--p-text-2] capitalize">
                                {new Date(aula.date + 'T12:00:00').toLocaleDateString('pt-BR', {
                                  weekday: 'short', day: '2-digit', month: 'short',
                                })}
                              </span>
                              <span className="text-xs text-[--p-text-3]">{aula.time_slot?.substring(0, 5)}</span>
                            </div>
                            <p className="text-xs text-[--p-text-3] truncate uppercase mt-0.5 tracking-wide">{aula.instructor_name}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              isAbsent ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'
                            }`}>
                              {isAbsent ? 'Falta' : 'OK'}
                            </span>
                            <span className={`text-[10px] ${isCarro ? 'text-blue-400' : 'text-emerald-400'}`}>
                              {isCarro ? 'Carro' : 'Moto'}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  )
}
