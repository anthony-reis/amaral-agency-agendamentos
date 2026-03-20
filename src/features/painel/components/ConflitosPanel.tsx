'use client'

import { useState, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, CheckCircle2, User, Users, CreditCard } from 'lucide-react'
import { resolverConflito } from '../actions/conflitos'
import type { Conflito } from '../types'

function formatDate(d: string) {
  const [y, m, day] = d.split('-')
  const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
  const dow = new Date(`${y}-${m}-${day}T12:00:00`).getDay()
  return `${weekdays[dow]}, ${day}/${m}/${y}`
}

interface Props {
  conflitos: Conflito[]
  autoescola_id: string
}

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000

function sortByDate(a: Conflito, b: Conflito) {
  return b.date.localeCompare(a.date) // descending (most recent first)
}

export function ConflitosPanel({ conflitos: initial, autoescola_id }: Props) {
  const [conflitos, setConflitos] = useState<Conflito[]>(() =>
    [...initial].sort(sortByDate)
  )
  const [showOld, setShowOld] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [resolving, setResolving] = useState<{
    conflito: Conflito
    idToCancel: string
    idx: number
  } | null>(null)

  const cutoff = new Date(Date.now() - ONE_WEEK_MS).toISOString().split('T')[0]
  const recent = conflitos.filter((c) => c.date >= cutoff)
  const old = conflitos.filter((c) => c.date < cutoff)
  const visible = showOld ? conflitos : recent

  function handleResolve(conflito: Conflito, idToCancel: string) {
    startTransition(async () => {
      await resolverConflito(idToCancel, autoescola_id)
      setConflitos((prev) =>
        prev.map((c) => {
          if (c !== conflito) return c
          const pos = c.ids.indexOf(idToCancel)
          const newIds = c.ids.filter((_, i) => i !== pos)
          const newAlunos = c.alunos?.filter((_, i) => i !== pos)
          const newStudentDocs = c.studentDocs?.filter((_, i) => i !== pos)
          const newCategories = c.categories?.filter((_, i) => i !== pos)
          const newInstructorNames = c.instructorNames?.filter((_, i) => i !== pos)
          if (newIds.length <= 1) return null as unknown as Conflito
          return { ...c, ids: newIds, alunos: newAlunos, studentDocs: newStudentDocs, categories: newCategories, instructorNames: newInstructorNames, total: newIds.length }
        }).filter(Boolean)
      )
      setResolving(null)
    })
  }

  const conflitosInstrutor = visible.filter((c) => c.type === 'instrutor')
  const conflitosAluno = visible.filter((c) => c.type === 'aluno')

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 text-yellow-500" />
        <div>
          <h1 className="text-xl font-bold text-[--p-text-1]">Verificar Conflitos</h1>
          <p className="text-sm text-[--p-text-3]">Agendamentos duplicados no mesmo horário</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className={`rounded-2xl p-4 border ${conflitosInstrutor.length > 0 ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-emerald-500/10 border-emerald-500/30'}`}>
          <p className="text-xs text-[--p-text-3] mb-1">Conflitos de Instrutor</p>
          <p className={`text-2xl font-bold ${conflitosInstrutor.length > 0 ? 'text-yellow-500' : 'text-emerald-500'}`}>
            {conflitosInstrutor.length}
          </p>
          <p className="text-xs text-[--p-text-3] mt-1">
            {conflitosInstrutor.length > 0
              ? 'Instrutor com 2+ alunos no mesmo horário'
              : 'Nenhum instrutor sobrecarregado'}
          </p>
        </div>
        <div className={`rounded-2xl p-4 border ${conflitosAluno.length > 0 ? 'bg-orange-500/10 border-orange-500/30' : 'bg-emerald-500/10 border-emerald-500/30'}`}>
          <p className="text-xs text-[--p-text-3] mb-1">Duplicidades de Aluno</p>
          <p className={`text-2xl font-bold ${conflitosAluno.length > 0 ? 'text-orange-500' : 'text-emerald-500'}`}>
            {conflitosAluno.length}
          </p>
          <p className="text-xs text-[--p-text-3] mt-1">
            {conflitosAluno.length > 0
              ? 'Aluno agendado 2x no mesmo horário'
              : 'Nenhuma duplicidade de aluno'}
          </p>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="text-center py-16 bg-[--p-bg-card] rounded-2xl border border-[--p-border]">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <p className="text-[--p-text-1] font-semibold text-lg">Nenhum conflito recente</p>
          <p className="text-[--p-text-3] text-sm mt-1">
            {old.length > 0
              ? `Há ${old.length} conflito${old.length > 1 ? 's' : ''} mais antigo${old.length > 1 ? 's' : ''} — veja abaixo.`
              : 'Todos os agendamentos estão sem sobreposição.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((conflito, idx) => {
            const isInst = conflito.type === 'instrutor'
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className={`bg-[--p-bg-card] rounded-2xl border overflow-hidden ${
                  isInst ? 'border-yellow-500/30' : 'border-orange-500/30'
                }`}
              >
                {/* Card header */}
                <div className={`px-5 py-3.5 flex items-start justify-between gap-4 ${isInst ? 'bg-yellow-500/5' : 'bg-orange-500/5'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${isInst ? 'bg-yellow-500/15' : 'bg-orange-500/15'}`}>
                      {isInst
                        ? <Users className="w-4 h-4 text-yellow-500" />
                        : <User className="w-4 h-4 text-orange-500" />
                      }
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[--p-text-1]">
                        {isInst
                          ? <>Instrutor <span className={`text-yellow-500`}>{conflito.instructor_name}</span> está com {conflito.total} alunos no mesmo horário</>
                          : <>Aluno <span className="text-orange-500">{conflito.student_name}</span> aparece {conflito.total}x no mesmo horário</>
                        }
                      </p>
                      <p className="text-xs text-[--p-text-3] mt-0.5">
                        {formatDate(conflito.date)} · {conflito.time_slot}
                        {conflito.categories?.[0] && (
                          <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[--p-hover] text-[--p-text-2]">
                            {conflito.categories[0]}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <span className={`shrink-0 px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                    isInst
                      ? 'bg-yellow-500/15 text-yellow-500'
                      : 'bg-orange-500/15 text-orange-500'
                  }`}>
                    {isInst ? 'Conflito de instrutor' : 'Duplicidade de aluno'}
                  </span>
                </div>

                {/* Rows */}
                <div className="px-5 pb-4 pt-3 space-y-2">
                  <p className="text-xs font-semibold text-[--p-text-3] uppercase tracking-wide mb-2">
                    Agendamentos em conflito — cancele o que deve ser removido:
                  </p>
                  {conflito.ids.map((id, i) => (
                    <div key={id} className="flex items-center justify-between bg-[--p-hover] rounded-xl px-4 py-3 gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[--p-text-1] truncate">
                          {isInst
                            ? (conflito.alunos?.[i] ?? `Agendamento ${i + 1}`)
                            : (conflito.instructorNames?.[i]
                                ? <>Instrutor: <span className="font-semibold">{conflito.instructorNames[i]}</span></>
                                : `Agendamento ${i + 1}`)
                          }
                        </p>
                        {isInst && conflito.alunos?.[i] && (
                          <p className="text-xs text-[--p-text-3] mt-0.5">
                            {conflito.studentDocs?.[i]
                              ? `Doc: ${conflito.studentDocs[i]}`
                              : ''}
                          </p>
                        )}
                        <p className="text-[10px] font-mono text-[--p-text-3] mt-0.5 opacity-60">{id}</p>
                      </div>
                      <button
                        onClick={() => setResolving({ conflito, idToCancel: id, idx: i })}
                        className="shrink-0 px-3 py-1.5 text-xs font-semibold text-red-500 border border-red-500/30 rounded-lg hover:bg-red-500/10 transition-colors"
                      >
                        Cancelar este
                      </button>
                    </div>
                  ))}
                  <p className={`text-xs mt-2 ${isInst ? 'text-yellow-500/80' : 'text-orange-500/80'}`}>
                    {isInst
                      ? 'Ao cancelar, o crédito da aula é devolvido automaticamente ao aluno.'
                      : 'Ao cancelar, o crédito da aula duplicada é devolvido automaticamente ao aluno.'}
                  </p>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Toggle old conflicts */}
      {old.length > 0 && (
        <button
          onClick={() => setShowOld((v) => !v)}
          className="w-full py-2.5 text-sm text-[--p-text-3] hover:text-[--p-text-2] border border-dashed border-[--p-border] rounded-xl transition-colors"
        >
          {showOld
            ? 'Ocultar conflitos antigos'
            : `Ver ${old.length} conflito${old.length > 1 ? 's' : ''} com mais de 1 semana`}
        </button>
      )}

      {/* Confirm modal */}
      <AnimatePresence>
        {resolving && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40"
              onClick={() => setResolving(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
            >
              <div className="bg-[--p-bg-card] rounded-2xl border border-[--p-border] p-6 w-full max-w-sm shadow-2xl">
                <div className="flex items-center gap-3 mb-4">
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  <h3 className="text-base font-semibold text-[--p-text-1]">Confirmar Cancelamento</h3>
                </div>

                {/* Summary of what's being cancelled */}
                <div className="bg-[--p-hover] rounded-xl p-3 mb-4 space-y-1">
                  <p className="text-sm font-semibold text-[--p-text-1]">
                    {resolving.conflito.type === 'instrutor'
                      ? (resolving.conflito.alunos?.[resolving.idx] ?? 'Agendamento')
                      : `Instrutor: ${resolving.conflito.instructorNames?.[resolving.idx] ?? '—'}`
                    }
                  </p>
                  <p className="text-xs text-[--p-text-3]">
                    {formatDate(resolving.conflito.date)} · {resolving.conflito.time_slot}
                    {resolving.conflito.categories?.[resolving.idx] && ` · ${resolving.conflito.categories[resolving.idx]}`}
                  </p>
                </div>

                <div className="flex items-start gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 mb-5">
                  <CreditCard className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-[--p-text-2]">
                    O crédito desta aula será <span className="text-emerald-500 font-semibold">devolvido automaticamente</span> ao aluno.
                  </p>
                </div>

                <p className="text-sm text-[--p-text-3] mb-5">
                  Este agendamento será marcado como{' '}
                  <span className="text-red-500 font-semibold">cancelado</span>.
                  Esta ação não pode ser desfeita.
                </p>

                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setResolving(null)}
                    className="px-4 py-2 text-sm text-[--p-text-3] hover:text-[--p-text-1] transition-colors"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={() => handleResolve(resolving.conflito, resolving.idToCancel)}
                    disabled={isPending}
                    className="px-4 py-2 bg-red-500 text-white text-sm font-semibold rounded-xl hover:bg-red-600 disabled:opacity-50 transition-colors"
                  >
                    {isPending ? 'Cancelando…' : 'Confirmar Cancelamento'}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
