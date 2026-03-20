'use client'

import { useTransition } from 'react'
import { motion } from 'framer-motion'
import { Clock, Car, User, FileText, BarChart2, Calendar } from 'lucide-react'
import { atualizarStatusAula } from '../actions/minhasAulas'
import type { AulaInstrutor } from '../actions/minhasAulas'

interface Props {
  aula: AulaInstrutor
  instructorName: string
  onUpdate: (id: string, status: string) => void
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  scheduled: { label: 'PENDENTE', color: 'bg-blue-500/20 text-blue-300' },
  confirmed: { label: 'CONFIRMADA', color: 'bg-emerald-500/20 text-emerald-300' },
  completed: { label: 'CONCLUÍDA', color: 'bg-green-500/20 text-green-300' },
  absent: { label: 'FALTA', color: 'bg-red-500/20 text-red-300' },
  cancelled: { label: 'DESMARCADA', color: 'bg-slate-500/20 text-slate-400' },
}

export function InstructorAulaCard({ aula, instructorName, onUpdate }: Props) {
  const [isPending, startTransition] = useTransition()

  function handleAction(status: 'completed' | 'absent' | 'cancelled') {
    startTransition(async () => {
      const result = await atualizarStatusAula(aula.id, status, instructorName, aula.autoescola_id)
      if (result.success) onUpdate(aula.id, status)
    })
  }

  const isDone = ['completed', 'absent', 'cancelled'].includes(aula.status)
  const statusInfo = STATUS_LABELS[aula.status] ?? { label: aula.status, color: 'bg-slate-500/20 text-slate-300' }

  const creditoPct =
    aula.creditos_total && aula.creditos_usados != null && aula.creditos_total > 0
      ? Math.round((aula.creditos_usados / aula.creditos_total) * 100)
      : null

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-[--p-bg-card] rounded-2xl border border-[--p-border] p-5 ${isDone ? 'opacity-60' : ''}`}
    >
      {/* Student header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0">
            <User className="w-4 h-4 text-purple-400" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-[--p-text-1] text-sm truncate uppercase">
              {aula.student_name}
            </p>
            <div className="flex items-center gap-2 flex-wrap mt-0.5">
              {creditoPct != null && (
                <span className="inline-flex items-center gap-1 text-xs text-[--p-text-3]">
                  <BarChart2 className="w-3 h-3" />
                  {aula.creditos_usados}/{aula.creditos_total} ({creditoPct}%)
                  {aula.instructorCategory && (
                    <span className="ml-1 px-1.5 py-0.5 bg-purple-500/20 text-purple-300 text-[10px] font-bold rounded">
                      CAT {aula.instructorCategory}
                    </span>
                  )}
                </span>
              )}
              <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-[--p-text-3] mb-4">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" />
          <span>{aula.date.split('-').reverse().join('/')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          <span>{aula.time_slot}</span>
        </div>
        {aula.instructorCategory && (
          <div className="flex items-center gap-1.5">
            <Car className="w-3.5 h-3.5" />
            <span>{aula.instructorCategory === 'A' || aula.instructorCategory === 'MOTO' ? 'MOTORCYCLE' : 'AUTOMÓVEL'}</span>
          </div>
        )}
        {(aula.cpf_cnh ?? aula.student_document) && (
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" />
            <span>CPF: {aula.cpf_cnh ?? aula.student_document}</span>
          </div>
        )}
        {aula.notes && (
          <div className="col-span-2 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{aula.notes}</span>
          </div>
        )}
      </div>

      {/* Action buttons */}
      {!isDone && (
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handleAction('absent')}
            disabled={isPending}
            className="py-2 px-3 text-xs font-semibold rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 disabled:opacity-50 transition-colors"
          >
            Dar Falta
          </button>
          <button
            onClick={() => handleAction('cancelled')}
            disabled={isPending}
            className="py-2 px-3 text-xs font-semibold rounded-xl bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 disabled:opacity-50 transition-colors"
          >
            Desmarcar
          </button>
          <button
            onClick={() => handleAction('completed')}
            disabled={isPending}
            className="col-span-2 py-2.5 px-3 text-sm font-bold rounded-xl bg-emerald-500 text-white hover:bg-emerald-400 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {isPending ? (
              <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : (
              'Finalizar Aula ✓'
            )}
          </button>
        </div>
      )}
    </motion.div>
  )
}
