import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import { CheckCircle2, CalendarDays, Car, Bike, XCircle, RefreshCw, Clock, ChevronDown } from 'lucide-react'

interface Props {
  params: Promise<{ escola: string }>
}

function Secao({ titulo, icone, contagem, aberta = false, children }: {
  titulo: string
  icone: React.ReactNode
  contagem?: number
  aberta?: boolean
  children: React.ReactNode
}) {
  return (
    <details open={aberta} className="group">
      <summary className="flex items-center gap-2 cursor-pointer list-none select-none mb-2.5 [&::-webkit-details-marker]:hidden">
        {icone}
        <h3 className="text-sm font-bold text-[--p-text-1]">{titulo}</h3>
        {contagem !== undefined && contagem > 0 && (
          <span className="text-xs font-semibold bg-[--p-bg-input] text-[--p-text-2] px-2 py-0.5 rounded-full">{contagem}</span>
        )}
        <ChevronDown className="w-4 h-4 ml-auto text-[--p-text-3] transition-transform group-open:rotate-180" />
      </summary>
      {children}
    </details>
  )
}

function getDaysUntil(dateStr: string): number {
  const todayBRT = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
  
  const todayDate = new Date(`${todayBRT}T12:00:00-03:00`);
  const targetDate = new Date(`${dateStr}T12:00:00-03:00`);
  
  return Math.round((targetDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));
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

  const [{ data: credits }, { data: student }, { data: autoescolaFull }] = await Promise.all([
    supabase.from('student_credits').select('*').eq('student_id', studentId).single(),
    supabase.from('students').select('document_id').eq('id', studentId).single(),
    supabase.from('autoescolas').select('id, reagendamento_min_horas').eq('slug', escola).single(),
  ])

  const minHorasReagendar = autoescolaFull?.reagendamento_min_horas ?? 2

  const doc = student?.document_id ?? ''

  const { data: byDoc } = doc
    ? await supabase
        .from('agendamentos')
        .select('id, date, time_slot, instructor_name, instructorCategory, status')
        .eq('autoescola_id', autoescola.id)
        .eq('student_document', doc)
        .order('date', { ascending: false })
    : { data: [] }

  const { data: byCpf } = doc
    ? await supabase
        .from('agendamentos')
        .select('id, date, time_slot, instructor_name, instructorCategory, status')
        .eq('autoescola_id', autoescola.id)
        .eq('cpf_cnh', doc)
        .order('date', { ascending: false })
    : { data: [] }

  const all = [...(byDoc ?? []), ...(byCpf ?? [])]
  const unique = Array.from(new Map(all.map(a => [a.id, a])).values())
  unique.sort((a, b) => (a.date < b.date ? 1 : -1))

  const emAberto = unique.filter(a => a.status === 'scheduled' || a.status === 'confirmed')
  const inicioDe = (a: { date: string; time_slot: string }) => new Date(`${a.date}T${a.time_slot}:00-03:00`).getTime()
  const agora = Date.now()
  // Próximas: só o que ainda vai acontecer, da mais próxima para a mais distante
  const agendadas = emAberto
    .filter(a => inicioDe(a) > agora)
    .sort((a, b) => inicioDe(a) - inicioDe(b))
  // Já passaram mas a escola/instrutor ainda não deu baixa: não são "próximas"
  const semBaixa = emAberto
    .filter(a => inicioDe(a) <= agora)
    .sort((a, b) => inicioDe(b) - inicioDe(a))
  const concluidas = unique.filter(a => a.status === 'completed' || a.status === 'absent')
  const canceladas = unique.filter(a => a.status === 'cancelled').slice(0, 10)

  const concluídasPorMês = groupByMonth(concluidas)

  const carroCredits = credits?.aulas_cat_b ?? 0
  const motoCredits = credits?.aulas_cat_a ?? 0

  const dataCurta = (d: string) =>
    new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }).replace('.', '')

  return (
    <div className="flex flex-col min-h-full">
      <div className="flex-1 flex flex-col px-4 pt-6 pb-10 max-w-2xl mx-auto w-full gap-6">

        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-[--p-text-1]">Minhas Aulas</h1>
            <p className="text-sm text-[--p-text-3] mt-0.5 capitalize">{studentName?.toLowerCase()}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-blue-500/10 text-blue-400">
              <Car className="w-3.5 h-3.5" /> Carro <b className="text-sm">{carroCredits}</b>
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Bike className="w-3.5 h-3.5" /> Moto <b className="text-sm">{motoCredits}</b>
            </span>
          </div>
        </div>

        {/* Próximas */}
        <Secao titulo="Próximas aulas" icone={<CalendarDays className="w-4 h-4 text-blue-400" />} contagem={agendadas.length} aberta>

          {agendadas.length === 0 ? (
            <div className="bg-[--p-bg-card] border border-[--p-border] rounded-xl px-4 py-5 flex items-center justify-between gap-3">
              <p className="text-sm text-[--p-text-3]">Nenhuma aula agendada.</p>
              <Link href={`/${escola}/aluno/agendar`} className="text-xs font-semibold text-[--p-accent] hover:underline shrink-0">Agendar aula</Link>
            </div>
          ) : (
            <div className="space-y-2">
              {agendadas.map(aula => {
                const daysUntil = getDaysUntil(aula.date)
                const isCarro = aula.instructorCategory?.toUpperCase() === 'CARRO'
                const diffHours = (inicioDe(aula) - agora) / (1000 * 60 * 60)
                const canReschedule = diffHours >= minHorasReagendar
                const quando = daysUntil === 0 ? 'Hoje' : daysUntil === 1 ? 'Amanhã' : `em ${daysUntil} dias`
                return (
                  <div
                    key={aula.id}
                    className={`bg-[--p-bg-card] border border-[--p-border] border-l-4 ${isCarro ? 'border-l-blue-500' : 'border-l-emerald-500'} rounded-xl px-4 py-3 flex items-center gap-3`}
                  >
                    <div className="text-center shrink-0 w-14">
                      <p className="text-lg font-bold text-[--p-text-1] leading-none">{aula.time_slot?.substring(0, 5)}</p>
                      <p className={`text-[10px] font-bold mt-1 ${daysUntil <= 1 ? 'text-amber-400' : 'text-[--p-text-3]'}`}>{quando}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[--p-text-1] capitalize">{dataCurta(aula.date)}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-xs text-[--p-text-3] uppercase truncate">{aula.instructor_name}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isCarro ? 'bg-blue-500/10 text-blue-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                          {isCarro ? 'Carro' : 'Moto'}
                        </span>
                        {aula.status === 'confirmed' && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400">Confirmada</span>
                        )}
                      </div>
                    </div>
                    {canReschedule ? (
                      <Link
                        href={`/${escola}/aluno/agendar?reagendar=${aula.id}`}
                        className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[--p-border] bg-[--p-bg-input] hover:bg-[--p-hover] hover:text-[--p-accent] text-xs font-semibold text-[--p-text-2] transition-colors"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Reagendar
                      </Link>
                    ) : (
                      <span className="shrink-0 inline-flex items-center gap-1 text-[10px] text-amber-400 text-right leading-tight" title={`Mínimo de ${minHorasReagendar}h de antecedência`}>
                        <Clock className="w-3 h-3" /> Prazo para<br />reagendar encerrado
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </Secao>

        {/* Desmarcadas */}
        {canceladas.length > 0 && (
          <Secao titulo="Desmarcadas" icone={<XCircle className="w-4 h-4 text-red-400" />} contagem={canceladas.length} aberta>
            <div className="space-y-2">
              {canceladas.map(aula => (
                <div key={aula.id} className="bg-[--p-bg-card] border border-[--p-border] border-l-4 border-l-red-500/60 rounded-xl px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[--p-text-2] capitalize line-through decoration-[--p-text-3]">
                      {dataCurta(aula.date)} · {aula.time_slot?.substring(0, 5)}
                    </p>
                    <p className="text-xs text-[--p-text-3] uppercase truncate mt-0.5">{aula.instructor_name}</p>
                  </div>
                  <Link href={`/${escola}/aluno/agendar`} className="shrink-0 text-xs font-semibold text-[--p-accent] hover:underline">
                    Agendar outra
                  </Link>
                </div>
              ))}
            </div>
          </Secao>
        )}

        {/* Histórico */}
        <Secao titulo="Histórico" icone={<CheckCircle2 className="w-4 h-4 text-emerald-400" />} contagem={concluidas.length}>

          {concluidas.length === 0 ? (
            <p className="text-sm text-[--p-text-3] px-1">Nenhuma aula concluída ainda.</p>
          ) : (
            <div className="space-y-4">
              {concluídasPorMês.map(({ label, items }) => (
                <div key={label}>
                  <p className="text-xs font-semibold text-[--p-text-3] capitalize tracking-wider mb-1.5">{label}</p>
                  <div className="space-y-1.5">
                    {items.map(aula => {
                      const isAbsent = aula.status === 'absent'
                      return (
                        <div key={aula.id} className="bg-[--p-bg-card] border border-[--p-border] rounded-lg px-3.5 py-2.5 flex items-center gap-3">
                          {isAbsent ? <XCircle className="w-4 h-4 text-red-400 shrink-0" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                          <p className="text-xs text-[--p-text-2] capitalize flex-1 min-w-0 truncate">
                            {dataCurta(aula.date)} · {aula.time_slot?.substring(0, 5)} · <span className="uppercase text-[--p-text-3]">{aula.instructor_name}</span>
                          </p>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${isAbsent ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                            {isAbsent ? 'Falta' : 'Concluída'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Secao>

        {/* Passaram mas ainda sem baixa */}
        {semBaixa.length > 0 && (
          <Secao titulo="Aulas passadas aguardando registro" icone={<Clock className="w-4 h-4 text-[--p-text-3]" />} contagem={semBaixa.length}>
            <div className="space-y-1.5 px-1">
              {semBaixa.map(aula => (
                <p key={aula.id} className="text-xs text-[--p-text-3] capitalize">
                  {dataCurta(aula.date)} · {aula.time_slot?.substring(0, 5)} · <span className="uppercase">{aula.instructor_name}</span>
                </p>
              ))}
            </div>
          </Secao>
        )}

      </div>
    </div>
  )
}
