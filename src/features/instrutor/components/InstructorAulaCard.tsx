'use client'

import { useState, useTransition } from 'react'
import { motion } from 'framer-motion'
import { Clock, Car, User, FileText, BarChart2, Calendar } from 'lucide-react'
import { atualizarStatusAula } from '../actions/minhasAulas'
import type { AulaInstrutor } from '../actions/minhasAulas'
import type { InstructorConfig } from '@/features/painel/actions/configuracoes'
import { ConfirmarAcaoModal } from './ConfirmarAcaoModal'
import { FinalizarAulaModal } from './FinalizarAulaModal'
import { ModalCancelamentoAula } from '@/features/shared/components/ModalCancelamentoAula'

interface Props {
  aula: AulaInstrutor
  instructorName: string
  onUpdate: (id: string, status: string) => void
  instructorConfig: InstructorConfig
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  scheduled: { label: 'PENDENTE', color: 'bg-blue-500/20 text-blue-300' },
  confirmed: { label: 'CONFIRMADA', color: 'bg-emerald-500/20 text-emerald-300' },
  completed: { label: 'CONCLUÍDA', color: 'bg-green-500/20 text-green-300' },
  absent: { label: 'FALTA', color: 'bg-red-500/20 text-red-300' },
  cancelled: { label: 'DESMARCADA', color: 'bg-slate-500/20 text-slate-400' },
}

type ModalAberto = 'falta' | 'desmarcar' | 'finalizar' | null

export function InstructorAulaCard({ aula, instructorName, onUpdate, instructorConfig }: Props) {
  const [isPending, startTransition] = useTransition()
  const [modalAberto, setModalAberto] = useState<ModalAberto>(null)

  function handleConfirmarAcao(status: 'absent') {
    startTransition(async () => {
      const result = await atualizarStatusAula(aula.id, status, instructorName, aula.autoescola_id)
      if (result.success) {
        onUpdate(aula.id, status)
        setModalAberto(null)
      }
    })
  }

  function handleConfirmarCancelamento(options: { blockSlot: boolean; reason?: string }) {
    startTransition(async () => {
      const result = await atualizarStatusAula(aula.id, 'cancelled', instructorName, aula.autoescola_id, options)
      if (result.success) {
        onUpdate(aula.id, 'cancelled')
        setModalAberto(null)
      } else {
        alert(result.error || 'Erro ao desmarcar aula')
      }
    })
  }

  const isDone = ['completed', 'absent', 'cancelled'].includes(aula.status)
  const statusInfo = STATUS_LABELS[aula.status] ?? { label: aula.status, color: 'bg-slate-500/20 text-slate-300' }

  const creditoPct =
    aula.creditos_total && aula.creditos_usados != null && aula.creditos_total > 0
      ? Math.round((aula.creditos_usados / aula.creditos_total) * 100)
      : null

  return (
    <>
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
              <span>{aula.instructorCategory}</span>
            </div>
          )}
          {(aula.cpf_cnh ?? aula.student_document) && (
            <div className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              <span>CPF: {aula.cpf_cnh ?? aula.student_document}</span>
            </div>
          )}
          {instructorConfig.mostrar_telefone && aula.phone && (
            <div className="col-span-2 flex items-center gap-1.5">
              <a
                href={`https://wa.me/55${aula.phone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current shrink-0">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.528 5.855L.057 23.428a.5.5 0 0 0 .609.61l5.627-1.476A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.9a9.893 9.893 0 0 1-5.031-1.371l-.361-.214-3.741.981.998-3.648-.235-.374A9.861 9.861 0 0 1 2.1 12C2.1 6.533 6.533 2.1 12 2.1c5.467 0 9.9 4.433 9.9 9.9 0 5.467-4.433 9.9-9.9 9.9z"/>
                </svg>
                <span>{aula.phone}</span>
              </a>
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
        {!isDone && (instructorConfig.pode_dar_falta || instructorConfig.pode_desmarcar || instructorConfig.pode_finalizar) && (
          <div className="grid grid-cols-2 gap-2">
            {instructorConfig.pode_dar_falta && (
              <button
                onClick={() => setModalAberto('falta')}
                disabled={isPending}
                className="py-2 px-3 text-xs font-semibold rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 disabled:opacity-50 transition-colors"
              >
                Dar Falta
              </button>
            )}
            {instructorConfig.pode_desmarcar && (
              <button
                onClick={() => setModalAberto('desmarcar')}
                disabled={isPending}
                className={`py-2 px-3 text-xs font-semibold rounded-xl bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 disabled:opacity-50 transition-colors ${
                  !instructorConfig.pode_dar_falta ? 'col-span-2' : ''
                }`}
              >
                Desmarcar
              </button>
            )}
            {instructorConfig.pode_finalizar && (
              <button
                onClick={() => setModalAberto('finalizar')}
                disabled={isPending}
                className={`py-2.5 px-3 text-sm font-bold rounded-xl bg-emerald-500 text-white hover:bg-emerald-400 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 ${
                  !instructorConfig.pode_dar_falta && !instructorConfig.pode_desmarcar ? 'col-span-2' : 'col-span-2'
                }`}
              >
                Finalizar Aula ✓
              </button>
            )}
          </div>
        )}
      </motion.div>

      {/* Modal: Dar Falta */}
      <ConfirmarAcaoModal
        open={modalAberto === 'falta'}
        titulo="Registrar Falta"
        descricao="Confirme para registrar a falta deste aluno."
        nomeAluno={aula.student_name}
        data={aula.date}
        horario={aula.time_slot}
        confirmLabel="Confirmar Falta"
        confirmClass="bg-red-500 hover:bg-red-400"
        isPending={isPending}
        onConfirm={() => handleConfirmarAcao('absent')}
        onCancel={() => setModalAberto(null)}
      />

      {/* Modal: Desmarcar */}
      <ModalCancelamentoAula
        open={modalAberto === 'desmarcar'}
        isPending={isPending}
        onClose={() => setModalAberto(null)}
        onConfirm={handleConfirmarCancelamento}
        aulaInfo={{
          studentName: aula.student_name,
          date: aula.date,
          timeSlot: aula.time_slot
        }}
      />

      {/* Modal: Finalizar com foto + assinatura */}
      <FinalizarAulaModal
        open={modalAberto === 'finalizar'}
        aula={aula}
        instructorName={instructorName}
        onSuccess={(id) => {
          onUpdate(id, 'completed')
          setModalAberto(null)
        }}
        onCancel={() => setModalAberto(null)}
      />
    </>
  )
}
