'use client'

import { useState, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, CheckCircle2, X, User, Users } from 'lucide-react'
import { resolverConflito } from '../actions/conflitos'
import type { Conflito } from '../types'

function formatDate(d: string) {
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

interface Props {
  conflitos: Conflito[]
  autoescola_id: string
}

export function ConflitosPanel({ conflitos: initial, autoescola_id }: Props) {
  const [conflitos, setConflitos] = useState<Conflito[]>(initial)
  const [isPending, startTransition] = useTransition()
  const [resolving, setResolving] = useState<{ conflito: Conflito; idToCancel: string } | null>(null)

  function handleResolve(conflito: Conflito, idToCancel: string) {
    startTransition(async () => {
      await resolverConflito(idToCancel, autoescola_id)
      // Remove or update the conflito from list
      setConflitos((prev) =>
        prev.map((c) => {
          if (c === conflito) {
            const newIds = c.ids.filter((id) => id !== idToCancel)
            const newAlunos = c.alunos?.filter((_, i) => c.ids[i] !== idToCancel)
            if (newIds.length <= 1) return null as unknown as Conflito
            return { ...c, ids: newIds, alunos: newAlunos, total: newIds.length }
          }
          return c
        }).filter(Boolean)
      )
      setResolving(null)
    })
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 text-yellow-400" />
        <div>
          <h1 className="text-xl font-bold text-[--p-text-1]">Verificar Conflitos</h1>
          <p className="text-sm text-[--p-text-3]">Agendamentos duplicados ou sobrepostos</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className={`rounded-2xl p-4 ${conflitos.length > 0 ? 'bg-yellow-500/10 border border-yellow-500/20' : 'bg-emerald-500/10 border border-emerald-500/20'}`}>
          <p className="text-xs text-[--p-text-3] mb-1">Conflitos por Instrutor</p>
          <p className="text-2xl font-bold text-[--p-text-1]">
            {conflitos.filter((c) => c.type === 'instrutor').length}
          </p>
        </div>
        <div className={`rounded-2xl p-4 ${conflitos.filter((c) => c.type === 'aluno').length > 0 ? 'bg-orange-500/10 border border-orange-500/20' : 'bg-emerald-500/10 border border-emerald-500/20'}`}>
          <p className="text-xs text-[--p-text-3] mb-1">Conflitos por Aluno</p>
          <p className="text-2xl font-bold text-[--p-text-1]">
            {conflitos.filter((c) => c.type === 'aluno').length}
          </p>
        </div>
      </div>

      {conflitos.length === 0 ? (
        <div className="text-center py-16 bg-[--p-bg-card] rounded-2xl border border-[--p-border]">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
          <p className="text-white font-semibold text-lg">Nenhum conflito detectado</p>
          <p className="text-[--p-text-3] text-sm mt-1">Todos os agendamentos estão sem sobreposição.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {conflitos.map((conflito, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              className={`bg-[--p-bg-card] rounded-2xl border overflow-hidden ${
                conflito.type === 'instrutor'
                  ? 'border-yellow-500/20'
                  : 'border-orange-500/20'
              }`}
            >
              <div className="flex items-start justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                    conflito.type === 'instrutor'
                      ? 'bg-yellow-500/10'
                      : 'bg-orange-500/10'
                  }`}>
                    {conflito.type === 'instrutor'
                      ? <Users className="w-4 h-4 text-yellow-400" />
                      : <User className="w-4 h-4 text-orange-400" />
                    }
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[--p-text-1]">
                      {conflito.type === 'instrutor'
                        ? `Instrutor: ${conflito.instructor_name}`
                        : `Aluno: ${conflito.student_name}`}
                    </p>
                    <p className="text-xs text-[--p-text-3] mt-0.5">
                      {formatDate(conflito.date)} · {conflito.time_slot} ·{' '}
                      <span className={conflito.type === 'instrutor' ? 'text-yellow-400' : 'text-orange-400'}>
                        {conflito.total} agendamentos
                      </span>
                    </p>
                  </div>
                </div>
                <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                  conflito.type === 'instrutor'
                    ? 'bg-yellow-500/10 text-yellow-400'
                    : 'bg-orange-500/10 text-orange-400'
                }`}>
                  {conflito.type === 'instrutor' ? 'Conflito Instrutor' : 'Duplicidade Aluno'}
                </span>
              </div>

              {/* IDs involved */}
              <div className="px-5 pb-4 space-y-2">
                <p className="text-xs text-[--p-text-3] font-medium uppercase tracking-wide">Agendamentos em conflito:</p>
                {conflito.ids.map((id, i) => (
                  <div key={id} className="flex items-center justify-between bg-[--p-hover] rounded-xl px-4 py-2.5">
                    <div>
                      <p className="text-sm text-slate-300">
                        {conflito.alunos?.[i] ?? `Agendamento ${i + 1}`}
                      </p>
                      <p className="text-xs text-slate-600 font-mono">{id}</p>
                    </div>
                    <button
                      onClick={() => setResolving({ conflito, idToCancel: id })}
                      className="px-3 py-1.5 text-xs font-semibold text-red-400 border border-red-400/30 rounded-lg hover:bg-red-400/10 transition-colors"
                    >
                      Cancelar este
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
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
                  <AlertTriangle className="w-5 h-5 text-yellow-400" />
                  <h3 className="text-base font-semibold text-[--p-text-1]">Confirmar Cancelamento</h3>
                </div>
                <p className="text-sm text-[--p-text-3] mb-6">
                  Este agendamento será marcado como{' '}
                  <span className="text-red-400 font-semibold">cancelado</span>.
                  Esta ação não pode ser desfeita.
                </p>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setResolving(null)}
                    className="px-4 py-2 text-sm text-[--p-text-3] hover:text-[--p-text-1]"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={() => handleResolve(resolving.conflito, resolving.idToCancel)}
                    disabled={isPending}
                    className="px-4 py-2 bg-red-500 text-white text-sm font-semibold rounded-xl hover:bg-red-600 disabled:opacity-50"
                  >
                    Confirmar Cancelamento
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
