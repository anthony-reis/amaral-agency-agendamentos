'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, AlertTriangle, Info, Check, Trash2, Calendar, Clock, User, Gauge } from 'lucide-react'
import { corrigirKmAgendamento } from '../actions/agendamentos'
import type { InconsistenciaKm, MotivoInconsistenciaKm } from '../actions/agendamentos'
import { canEditPainel } from '../types'

interface Props {
  open: boolean
  onClose: () => void
  inconsistencias: InconsistenciaKm[]
  autoescola_id: string
  onResolved: () => void
  userRole: string
}

const MOTIVO_INFO: Record<MotivoInconsistenciaKm, { label: string; desc: string; color: string }> = {
  sem_km_final: {
    label: 'Sem KM final',
    desc: 'A aula foi iniciada com KM inicial, mas concluída sem informar o KM final.',
    color: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
  },
  final_menor_igual_inicial: {
    label: 'KM final ≤ inicial',
    desc: 'O KM final é menor ou igual ao inicial — impossível para uma aula real.',
    color: 'bg-rose-500/15 text-rose-500 border-rose-500/30',
  },
  distancia_absurda: {
    label: 'Distância absurda',
    desc: 'A diferença passa de 200 km — provável erro de digitação no hodômetro.',
    color: 'bg-red-600/15 text-red-500 border-red-600/30',
  },
}

function LinhaInconsistencia({
  item,
  autoescola_id,
  onResolved,
  canEdit,
}: {
  item: InconsistenciaKm
  autoescola_id: string
  onResolved: () => void
  canEdit: boolean
}) {
  const [kmIni, setKmIni] = useState(item.km_inicial != null ? String(item.km_inicial) : '')
  const [kmFim, setKmFim] = useState(item.km_final != null ? String(item.km_final) : '')
  const [pending, setPending] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [resolvido, setResolvido] = useState(false)

  const info = MOTIVO_INFO[item.motivo]

  async function salvar(limpar: boolean) {
    setErro(null)
    setPending(true)
    const ini = limpar ? null : kmIni !== '' ? parseInt(kmIni, 10) : null
    const fim = limpar ? null : kmFim !== '' ? parseInt(kmFim, 10) : null
    const res = await corrigirKmAgendamento(item.id, autoescola_id, ini, fim)
    setPending(false)
    if (res.success) {
      setResolvido(true)
      onResolved()
    } else {
      setErro(res.error ?? 'Erro ao salvar.')
    }
  }

  const diff = kmIni !== '' && kmFim !== '' ? parseInt(kmFim, 10) - parseInt(kmIni, 10) : null

  return (
    <div className={`rounded-xl border border-[--p-border] p-4 ${resolvido ? 'opacity-50' : ''}`}>
      <div className="mb-3">
        <div className="flex flex-wrap items-center gap-3 text-xs text-[--p-text-2]">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {item.date.split('-').reverse().join('/')}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {item.time_slot}
          </span>
          <span className="flex items-center gap-1 font-medium text-[--p-text-1]">
            <User className="w-3.5 h-3.5" />
            {item.student_name ?? '—'}
          </span>
          <span className="text-[--p-text-3]">· {item.instructor_name ?? '—'}</span>
        </div>
        <div className="mt-2">
          <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${info.color}`}>{info.label}</span>
        </div>
      </div>

      {resolvido ? (
        <p className="text-sm text-emerald-500 flex items-center gap-1.5">
          <Check className="w-4 h-4" /> Resolvido
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-xs text-[--p-text-3]">
              KM inicial
              <input
                type="number"
                inputMode="numeric"
                value={kmIni}
                onChange={(e) => setKmIni(e.target.value)}
                disabled={pending || !canEdit}
                className="mt-1 block w-28 px-2.5 py-1.5 rounded-lg bg-[--p-bg-input] border border-[--p-border] text-sm text-[--p-text-1] focus:outline-none focus:ring-1 focus:ring-[#0ea5e9]/40"
              />
            </label>
            <label className="text-xs text-[--p-text-3]">
              KM final
              <input
                type="number"
                inputMode="numeric"
                value={kmFim}
                onChange={(e) => setKmFim(e.target.value)}
                disabled={pending || !canEdit}
                className="mt-1 block w-28 px-2.5 py-1.5 rounded-lg bg-[--p-bg-input] border border-[--p-border] text-sm text-[--p-text-1] focus:outline-none focus:ring-1 focus:ring-[#0ea5e9]/40"
              />
            </label>
            {diff != null && (
              <span className={`text-xs font-semibold pb-2 ${diff > 0 && diff <= 200 ? 'text-emerald-500' : 'text-rose-500'}`}>
                = {diff} km
              </span>
            )}
            {canEdit && (
              <>
                <button
                  onClick={() => salvar(false)}
                  disabled={pending}
                  className="ml-auto px-3 py-1.5 text-xs font-bold rounded-lg bg-[#0ea5e9] text-white hover:bg-[#0284c7] disabled:opacity-50 transition-colors flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" /> Salvar
                </button>
                <button
                  onClick={() => salvar(true)}
                  disabled={pending}
                  title="Remover o registro de KM desta aula"
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-[--p-border] text-[--p-text-3] hover:text-rose-500 hover:border-rose-500/40 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Limpar
                </button>
              </>
            )}
          </div>
          {erro && <p className="text-xs text-rose-500 mt-2">{erro}</p>}
        </>
      )}
    </div>
  )
}

export function InconsistenciasKmModal({ open, onClose, inconsistencias, autoescola_id, onResolved, userRole }: Props) {
  const canEdit = canEditPainel(userRole)
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 12 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 flex items-start justify-center z-50 p-3 overflow-y-auto"
          >
            <div className="bg-[--p-bg-card] rounded-2xl border border-[--p-border] w-full max-w-2xl shadow-2xl my-auto">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-[--p-border]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-red-500/10 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[--p-text-1] text-base">Inconsistências de KM</h3>
                    <p className="text-xs text-[--p-text-3]">
                      {inconsistencias.length} aula(s) com quilometragem inválida no período
                    </p>
                  </div>
                </div>
                <button onClick={onClose} className="text-[--p-text-3] hover:text-[--p-text-1] transition-colors p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="px-5 py-4 space-y-4">
                {/* Explicação */}
                <div className="bg-[--p-bg-base] rounded-xl border border-[--p-border] p-3 space-y-2">
                  <p className="text-xs font-semibold text-[--p-text-2] flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5" /> O que é uma inconsistência?
                  </p>
                  <p className="text-xs text-[--p-text-3]">
                    A distância de cada aula é calculada por <strong>KM final − KM inicial</strong>. Estas aulas têm
                    valores que tornam o cálculo impossível ou irreal, então são <strong>excluídas da média</strong> de
                    KM. Corrija os valores abaixo (ou limpe o registro) para que voltem a contar.
                  </p>
                  <div className="grid sm:grid-cols-3 gap-2 pt-1">
                    {(Object.keys(MOTIVO_INFO) as MotivoInconsistenciaKm[]).map((m) => (
                      <div key={m} className="text-[11px] text-[--p-text-3]">
                        <span className={`inline-block px-1.5 py-0.5 rounded border font-bold mb-1 ${MOTIVO_INFO[m].color}`}>
                          {MOTIVO_INFO[m].label}
                        </span>
                        <p>{MOTIVO_INFO[m].desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Lista */}
                {inconsistencias.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-8 text-[--p-text-3]">
                    <Gauge className="w-8 h-8 opacity-40" />
                    <p className="text-sm">Nenhuma inconsistência no período. 🎉</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {inconsistencias.map((item) => (
                      <LinhaInconsistencia
                        key={item.id}
                        item={item}
                        autoescola_id={autoescola_id}
                        onResolved={onResolved}
                        canEdit={canEdit}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
