'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Check, Calendar, Car, AlertCircle, Clock, CheckCircle2, Info } from 'lucide-react'
import { ProgressBar } from '@/features/identificacao/components/ProgressBar'
import { fetchDisponibilidade, criarAgendamento } from '@/features/aluno/actions/agendarAula'
import type { StudentCredits } from '@/features/identificacao/types'

interface AgendamentoFlowProps {
  escola: string
  autoescolaId: string
  autoescolaNome: string
  autoescolaLogoUrl: string | null
  studentId: string
  credits: StudentCredits
}

export function AgendamentoFlow({
  escola,
  autoescolaId,
  autoescolaNome,
  autoescolaLogoUrl,
  studentId,
  credits
}: AgendamentoFlowProps) {
  const router = useRouter()
  const [step, setStep] = useState(2) // 1 was identificacao
  
  // State
  const [date, setDate] = useState<Date | null>(null)
  const [category, setCategory] = useState<'CARRO' | 'MOTO' | null>(null)
  const [instructor, setInstructor] = useState<{ nome: string, aulasMinistradas: number, horarios: string[] } | null>(null)
  const [timeSlot, setTimeSlot] = useState<string | null>(null)
  
  const [availableInstructors, setAvailableInstructors] = useState<any[]>([])
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week')

  const goNext = () => setStep(s => Math.min(s + 1, 6))
  const goBack = () => {
    setError(null)
    setStep(s => Math.max(s - 1, 2))
    if (step === 2) router.push(`/${escola}/aluno`) // go back to start
  }

  // Generate calendar days
  const today = new Date()
  today.setHours(0,0,0,0)
  
  const getDays = () => {
    const days = []
    if (viewMode === 'week') {
      const start = new Date(currentMonth)
      // simple 7 day view from start
      for (let i = 0; i < 7; i++) {
        const d = new Date(start)
        d.setDate(d.getDate() + i)
        days.push(d)
      }
    } else {
      const year = currentMonth.getFullYear()
      const month = currentMonth.getMonth()
      const firstDay = new Date(year, month, 1)
      const lastDay = new Date(year, month + 1, 0)
      for (let i = 1; i <= lastDay.getDate(); i++) {
        days.push(new Date(year, month, i))
      }
    }
    return days
  }

  const handleDateSelect = (d: Date) => {
    if (d < today) return
    setDate(d)
    goNext()
  }

  const handleCategorySelect = (cat: 'CARRO' | 'MOTO') => {
    setCategory(cat)
    // Fetch instructors
    startTransition(async () => {
      try {
        const catStr = cat // 'CARRO' | 'MOTO'
        const dateStr = date!.toISOString().split('T')[0]
        const data = await fetchDisponibilidade(autoescolaId, dateStr, catStr)
        setAvailableInstructors(data)
        goNext()
      } catch (err: any) {
        setError(err.message)
      }
    })
  }

  const handleInstructorSelect = (inst: any) => {
    setInstructor(inst)
    goNext()
  }

  const handleTimeSelect = (time: string) => {
    setTimeSlot(time)
    goNext()
  }

  const handleConfirm = () => {
    startTransition(async () => {
      try {
        await criarAgendamento({
          autoescola_id: autoescolaId,
          date: date!.toISOString().split('T')[0],
          timeSlot: timeSlot!,
          instructorName: instructor!.nome,
          category: category!,
          studentId: studentId,
          studentName: '', // ideally we pass this from verified result
          studentDocument: '' // ideally we pass doc from cookie or verified result
        })
        setStep(7) // Success step
      } catch (err: any) {
        setError(err.message)
      }
    })
  }

  return (
    <main className="min-h-screen bg-gradient-navy flex flex-col">
      {/* Header */}
      <header className="w-full py-4 px-4 flex items-center justify-between border-b border-white/5 relative">
        <button onClick={goBack} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 text-slate-300 hover:bg-white/10" disabled={step === 7}>
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center">
          <span className="text-sm font-semibold text-white tracking-wide">{autoescolaNome}</span>
          <span className="text-xs text-brand-teal">{credits.aulas_cat_a + credits.aulas_cat_b} créditos disponíveis</span>
        </div>
        <div className="w-8" />
      </header>

      {/* Progress */}
      {step <= 6 && (
        <div className="w-full mt-2">
          <ProgressBar currentStep={step} totalSteps={6} />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 flex flex-col items-center pt-8 pb-12 px-4">
        <div className="w-full max-w-sm flex flex-col items-center relative">
          
          <AnimatePresence mode="wait">
            {/* STEP 2: DATA */}
            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="w-full">
                <div className="text-center mb-6">
                  <h2 className="text-xl font-bold text-white mb-1">Escolha a data</h2>
                </div>
                
                <div className="bg-white rounded-2xl shadow-card p-4 space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <button onClick={() => {
                        const newD = new Date(currentMonth)
                        if (viewMode === 'week') newD.setDate(newD.getDate() - 7); else newD.setMonth(newD.getMonth() - 1);
                        setCurrentMonth(newD)
                    }} className="p-2 bg-slate-100 rounded-lg text-slate-600"><ChevronLeft className="w-4 h-4" /></button>
                    <span className="text-sm font-bold text-slate-800 capitalize">
                      {currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                    </span>
                    <button onClick={() => {
                        const newD = new Date(currentMonth)
                        if (viewMode === 'week') { newD.setDate(newD.getDate() + 7); setViewMode('month'); } else newD.setMonth(newD.getMonth() + 1);
                        setCurrentMonth(newD)
                    }} className="p-2 bg-slate-100 rounded-lg text-slate-600"><ChevronRight className="w-4 h-4" /></button>
                  </div>

                  <div className="grid grid-cols-7 gap-2">
                    {['D','S','T','Q','Q','S','S'].map((d, i) => (
                      <div key={i} className="text-center text-xs font-semibold text-slate-400 py-1">{d}</div>
                    ))}
                    {getDays().map((d, i) => {
                      const isPast = d < today
                      const isSelected = date?.toDateString() === d.toDateString()
                      return (
                        <button
                          key={i}
                          disabled={isPast}
                          onClick={() => handleDateSelect(d)}
                          className={`
                            aspect-square rounded-full flex items-center justify-center text-sm font-medium transition-all
                            ${isPast ? 'text-slate-300 cursor-not-allowed' : 'text-slate-700 hover:bg-slate-100'}
                            ${isSelected ? 'bg-brand-teal text-white shadow-md hover:bg-brand-teal-dark font-bold' : ''}
                          `}
                        >
                          {d.getDate()}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 3: CATEGORIA */}
            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="w-full">
                <div className="text-center mb-6"><h2 className="text-xl font-bold text-white mb-1">Qual categoria?</h2></div>
                <div className="space-y-3">
                  {credits.aulas_cat_b > 0 && (
                    <button onClick={() => handleCategorySelect('CARRO')} className="w-full bg-white p-4 rounded-2xl flex items-center justify-between border-2 border-transparent hover:border-brand-teal/30 transition-all shadow-card">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600"><Car className="w-5 h-5" /></div>
                        <div className="text-left"><p className="font-bold text-slate-800">Carro</p><p className="text-xs text-brand-teal font-medium">{credits.aulas_cat_b} créditos disponíveis</p></div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-300" />
                    </button>
                  )}
                  {credits.aulas_cat_a > 0 && (
                    <button onClick={() => handleCategorySelect('MOTO')} className="w-full bg-white p-4 rounded-2xl flex items-center justify-between border-2 border-transparent hover:border-brand-teal/30 transition-all shadow-card">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600"><Car className="w-5 h-5" /></div>
                        <div className="text-left"><p className="font-bold text-slate-800">Moto</p><p className="text-xs text-brand-teal font-medium">{credits.aulas_cat_a} créditos disponíveis</p></div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-300" />
                    </button>
                  )}
                </div>
              </motion.div>
            )}

            {/* STEP 4: INSTRUTOR */}
            {step === 4 && (
              <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="w-full">
                <div className="text-center mb-6"><h2 className="text-xl font-bold text-white">Escolha o Instrutor</h2></div>
                {isPending ? (
                  <div className="bg-white rounded-2xl p-8 text-center"><div className="animate-spin w-8 h-8 border-4 border-brand-teal border-t-transparent rounded-full mx-auto" /><p className="mt-4 text-sm text-slate-500">Buscando disponibilidade...</p></div>
                ) : availableInstructors.length === 0 ? (
                   <div className="bg-white rounded-2xl p-6 text-center space-y-4"><AlertCircle className="w-8 h-8 text-slate-400 mx-auto" /><p className="text-sm text-slate-600">Nenhum instrutor disponível para esta data e categoria.</p><button onClick={goBack} className="text-brand-teal font-semibold text-sm">Voltar e escolher outra data</button></div>
                ) : (
                  <div className="space-y-3">
                    {availableInstructors.map((inst, i) => (
                      <button key={i} onClick={() => handleInstructorSelect(inst)} className="w-full bg-white p-4 rounded-2xl flex items-center justify-between hover:ring-2 hover:ring-brand-teal/20 transition-all text-left">
                        <div>
                          <p className="font-bold text-slate-800 uppercase">{inst.nome}</p>
                          <p className="text-xs text-slate-500">{inst.aulasMinistradas} aulas ministradas</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-300" />
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* STEP 5: HORÁRIO */}
            {step === 5 && (
              <motion.div key="step5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="w-full">
                <div className="text-center mb-6"><h2 className="text-xl font-bold text-white">Escolha o horário</h2><p className="text-slate-400 text-sm">Instrutor: {instructor?.nome}</p></div>
                <div className="bg-white rounded-2xl p-4 grid grid-cols-3 gap-2">
                  {instructor?.horarios.map(time => (
                    <button key={time} onClick={() => handleTimeSelect(time)} className="py-2.5 rounded-xl border border-slate-200 text-slate-700 font-medium text-sm hover:border-brand-teal hover:bg-brand-teal/5 hover:text-brand-teal transition-colors">
                      {time.substring(0, 5)}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* STEP 6: CONFIRMACAO */}
            {step === 6 && (
              <motion.div key="step6" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="w-full">
                <div className="text-center mb-6"><div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-3"><Check className="w-6 h-6 text-brand-teal" /></div><h2 className="text-xl font-bold text-white">Confirmação</h2><p className="text-slate-400 text-sm">Revise os dados do seu agendamento</p></div>
                <div className="bg-white rounded-2xl p-6 space-y-4">
                  <div><p className="text-xs text-slate-500 font-semibold mb-0.5">Categoria</p><p className="font-bold text-slate-800">{category === 'CARRO' ? 'Carro' : 'Moto'}</p></div>
                  <div className="h-px bg-slate-100" />
                  <div><p className="text-xs text-slate-500 font-semibold mb-0.5">Instrutor</p><p className="font-bold text-slate-800 uppercase">{instructor?.nome}</p></div>
                  <div className="h-px bg-slate-100" />
                  <div><p className="text-xs text-slate-500 font-semibold mb-0.5">Data</p><p className="font-bold text-slate-800 capitalize">{date?.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</p></div>
                  <div className="h-px bg-slate-100" />
                  <div><p className="text-xs text-slate-500 font-semibold mb-0.5">Horário</p><p className="font-bold text-slate-800">{timeSlot?.substring(0, 5)}</p></div>

                  <div className="mt-6 p-4 bg-blue-50 rounded-xl flex items-start gap-3">
                    <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-700">Ao confirmar, 1 crédito será debitado da categoria {category === 'CARRO' ? 'Carro' : 'Moto'}.</p>
                  </div>

                  {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>}

                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <button onClick={goBack} disabled={isPending} className="py-3 rounded-xl border border-slate-200 text-slate-700 font-semibold disabled:opacity-50">Voltar</button>
                    <button onClick={handleConfirm} disabled={isPending} className="py-3 rounded-xl bg-brand-teal text-white font-semibold disabled:opacity-50 flex items-center justify-center">
                      {isPending ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Confirmar'}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 7: SUCESSO */}
            {step === 7 && (
              <motion.div key="step7" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full text-center py-8">
                <div className="w-20 h-20 bg-brand-teal rounded-full flex items-center justify-center mx-auto mb-6 shadow-glow">
                  <Check className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Agendamento<br/>Confirmado!</h2>
                <p className="text-slate-400 text-sm max-w-[240px] mx-auto mb-8">
                  Sua aula com {instructor?.nome} no dia {date?.toLocaleDateString('pt-BR')} às {timeSlot?.substring(0,5)} foi agendada com sucesso.
                </p>
                <div className="space-y-3 max-w-xs mx-auto">
                  <button onClick={() => { setStep(2); setDate(null); setCategory(null); setInstructor(null); setTimeSlot(null) }} className="w-full py-3.5 bg-brand-teal text-white font-semibold rounded-xl hover:bg-brand-teal-dark transition-colors">Agendar nova aula</button>
                  <button onClick={() => router.push(`/${escola}/aluno/minhas-aulas`)} className="w-full py-3.5 bg-white/10 text-white font-semibold rounded-xl hover:bg-white/20 transition-colors">Ver Minhas Aulas</button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="w-full pb-8 flex items-center justify-center gap-1 text-xs text-slate-600">
        <a href="#" className="hover:text-slate-400">Ajuda</a><span className="mx-1">•</span><a href="#" className="hover:text-slate-400">Termos de Uso</a><span className="mx-1">•</span><a href="#" className="hover:text-slate-400">Privacidade</a>
      </footer>
    </main>
  )
}
