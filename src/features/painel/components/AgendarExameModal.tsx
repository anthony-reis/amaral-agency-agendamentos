'use client'

import { useEffect, useState, useTransition } from 'react'
import { motion } from 'framer-motion'
import { X, FileCheck, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react'
import { listarCategoriasElegiveisExame } from '../actions/exameElegibilidade'
import { listarDatasExame } from '../actions/datasExame'
import { buscarDisponibilidadeExameMassa, agendarExameDireto } from '../actions/agendamentoExameMassa'
import type { CategoriaElegivelExame } from '../actions/exameElegibilidade'
import type { DataExame, InstrutorDisponivelExame } from '../types-exame'

interface Props {
  autoescola_id: string
  escola: string
  studentId: string
  studentName: string
  documentId: string
  onClose: () => void
}

export function AgendarExameModal({ autoescola_id, escola, studentId, studentName, documentId, onClose }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [sucesso, setSucesso] = useState(false)

  const [categorias, setCategorias] = useState<CategoriaElegivelExame[] | null>(null)
  const [categoriaCodigo, setCategoriaCodigo] = useState('')

  const [datas, setDatas] = useState<DataExame[] | null>(null)
  const [examDate, setExamDate] = useState('')

  const [disponibilidade, setDisponibilidade] = useState<InstrutorDisponivelExame[] | null>(null)
  const [slot, setSlot] = useState('')

  useEffect(() => {
    listarCategoriasElegiveisExame(autoescola_id, studentId).then(setCategorias)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleCategoriaChange(codigo: string) {
    setCategoriaCodigo(codigo)
    setExamDate('')
    setDatas(null)
    setDisponibilidade(null)
    setSlot('')
    if (codigo) {
      listarDatasExame(autoescola_id, codigo, { apenasFuturas: true }).then(setDatas)
    }
  }

  function handleDataChange(date: string) {
    setExamDate(date)
    setDisponibilidade(null)
    setSlot('')
    if (date) {
      startTransition(async () => {
        const disp = await buscarDisponibilidadeExameMassa(autoescola_id, categoriaCodigo, date)
        setDisponibilidade(disp)
      })
    }
  }

  function handleConfirmar() {
    if (!categoriaCodigo || !examDate || !slot) return
    setError('')
    const [instructorName, timeSlot] = slot.split('__')
    startTransition(async () => {
      const result = await agendarExameDireto({
        autoescola_id, student_id: studentId, categoria_codigo: categoriaCodigo,
        examDate, instructorName, timeSlot, escola,
      })
      if (!result.success) { setError(result.error); return }
      setSucesso(true)
    })
  }

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-40" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-[--p-bg-card] rounded-2xl border border-[--p-border] p-6 w-full max-w-sm shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-[--p-text-1] flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-[--p-accent]" /> Agendar exame
            </h3>
            <button onClick={onClose} className="text-[--p-text-3] hover:text-[--p-text-1]">
              <X className="w-4 h-4" />
            </button>
          </div>

          {sucesso ? (
            <div className="py-6 text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <p className="text-sm font-semibold text-[--p-text-1]">Exame agendado para {studentName}</p>
              <button onClick={onClose} className="px-6 py-2.5 rounded-xl bg-[--p-accent] text-white text-sm font-semibold hover:opacity-90 transition-opacity">
                Fechar
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-[--p-text-2]">{studentName} <span className="text-[--p-text-3]">· {documentId}</span></p>

              <div>
                <label className="block text-xs text-[--p-text-3] mb-1">Categoria</label>
                {categorias === null ? (
                  <p className="text-xs text-[--p-text-3]">Carregando...</p>
                ) : categorias.length === 0 ? (
                  <p className="text-xs text-amber-500">Nenhuma categoria configurada.</p>
                ) : (
                  <select
                    value={categoriaCodigo}
                    onChange={(e) => handleCategoriaChange(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[--p-bg-input] border border-[--p-border] text-sm text-[--p-text-1] focus:outline-none focus:ring-1 focus:ring-[--p-accent]/40"
                  >
                    <option value="">Selecione...</option>
                    {categorias.map((c) => (
                      <option key={c.codigo} value={c.codigo} disabled={!c.elegivel}>
                        {c.nome}{!c.elegivel ? ` (${c.aulasConcluidas}/5 aulas concluídas)` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {categoriaCodigo && (
                <div>
                  <label className="block text-xs text-[--p-text-3] mb-1">Data do exame</label>
                  {datas === null ? (
                    <p className="text-xs text-[--p-text-3]">Carregando...</p>
                  ) : datas.length === 0 ? (
                    <p className="text-xs text-amber-500">Nenhuma data configurada para essa categoria. Configure em Datas de Exame.</p>
                  ) : (
                    <select
                      value={examDate}
                      onChange={(e) => handleDataChange(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-[--p-bg-input] border border-[--p-border] text-sm text-[--p-text-1] focus:outline-none focus:ring-1 focus:ring-[--p-accent]/40"
                    >
                      <option value="">Selecione...</option>
                      {datas.map((d) => (
                        <option key={d.id} value={d.date}>{d.date.split('-').reverse().join('/')}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {examDate && (
                <div>
                  <label className="block text-xs text-[--p-text-3] mb-1">Instrutor / horário</label>
                  {disponibilidade === null ? (
                    <p className="text-xs text-[--p-text-3]">Carregando disponibilidade...</p>
                  ) : disponibilidade.length === 0 ? (
                    <p className="text-xs text-amber-500">Nenhum instrutor disponível nessa data.</p>
                  ) : (
                    <select
                      value={slot}
                      onChange={(e) => setSlot(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-[--p-bg-input] border border-[--p-border] text-sm text-[--p-text-1] focus:outline-none focus:ring-1 focus:ring-[--p-accent]/40"
                    >
                      <option value="">Selecione...</option>
                      {disponibilidade.map((inst) =>
                        inst.horarios.map((h) => (
                          <option key={`${inst.nome}__${h}`} value={`${inst.nome}__${h}`}>{inst.nome} — {h}</option>
                        ))
                      )}
                    </select>
                  )}
                </div>
              )}

              {error && (
                <p className="text-sm text-red-500 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
                </p>
              )}

              <div className="flex gap-2 justify-end pt-1">
                <button onClick={onClose} disabled={isPending} className="px-4 py-2 text-sm text-[--p-text-3] hover:text-[--p-text-1] disabled:opacity-50">
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmar}
                  disabled={isPending || !slot}
                  className="px-4 py-2 bg-[--p-accent] text-white text-sm font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                >
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Confirmar agendamento
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </>
  )
}
