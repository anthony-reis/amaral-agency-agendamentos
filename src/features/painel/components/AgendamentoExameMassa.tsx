'use client'

import { useEffect, useState, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Users, Clock, CheckCircle2, AlertCircle, Loader2, FileCheck } from 'lucide-react'
import {
  listarSolicitacoesPendentesParaData,
  buscarDisponibilidadeExameMassa,
  confirmarAgendamentoExameMassa,
} from '../actions/agendamentoExameMassa'
import type { SolicitacaoPendenteExame, InstrutorDisponivelExame, AtribuicaoExameMassa } from '../types-exame'

interface Props {
  autoescola_id: string
  escola: string
  categoriaCodigo: string
  categoriaNome: string
  examDate: string
  onClose: () => void
  onConcluido: () => void
}

type Step = 'selecionar' | 'atribuir' | 'confirmar' | 'sucesso'

function formatarData(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long',
  })
}

export function AgendamentoExameMassa({
  autoescola_id, escola, categoriaCodigo, categoriaNome, examDate, onClose, onConcluido,
}: Props) {
  const [step, setStep] = useState<Step>('selecionar')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const [pendentes, setPendentes] = useState<SolicitacaoPendenteExame[] | null>(null)
  const [selecionadosIds, setSelecionadosIds] = useState<Set<string>>(new Set())

  const [disponibilidade, setDisponibilidade] = useState<InstrutorDisponivelExame[] | null>(null)
  const [atribuicoes, setAtribuicoes] = useState<Record<string, { instructorName: string; timeSlot: string }>>({})

  const [mensagemAdmin, setMensagemAdmin] = useState('')
  const [criados, setCriados] = useState(0)

  useEffect(() => {
    listarSolicitacoesPendentesParaData(autoescola_id, categoriaCodigo).then(setPendentes)
  }, [autoescola_id, categoriaCodigo])

  function toggleSelecionado(id: string) {
    setSelecionadosIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function irParaAtribuicao() {
    if (selecionadosIds.size === 0) { setError('Selecione ao menos um aluno.'); return }
    setError('')
    startTransition(async () => {
      const disp = await buscarDisponibilidadeExameMassa(autoescola_id, categoriaCodigo, examDate)
      setDisponibilidade(disp)
      setStep('atribuir')
    })
  }

  const selecionados = (pendentes ?? []).filter((p) => selecionadosIds.has(p.solicitacaoId))

  // Vários alunos PODEM compartilhar o mesmo instrutor+horário (turma indo
  // junto pro exame) — diferente de aula normal, não excluímos combos já
  // escolhidos por outro aluno da lista.
  function opcoesParaAluno() {
    const opcoes: { value: string; instructorName: string; timeSlot: string; label: string }[] = []
    for (const inst of disponibilidade ?? []) {
      for (const horario of inst.horarios) {
        opcoes.push({ value: `${inst.nome}__${horario}`, instructorName: inst.nome, timeSlot: horario, label: `${inst.nome} — ${horario}` })
      }
    }
    return opcoes
  }

  function handleAtribuir(studentId: string, value: string) {
    if (!value) {
      setAtribuicoes((prev) => {
        const next = { ...prev }
        delete next[studentId]
        return next
      })
      return
    }
    const [instructorName, timeSlot] = value.split('__')
    setAtribuicoes((prev) => ({ ...prev, [studentId]: { instructorName, timeSlot } }))
  }

  const todosAtribuidos = selecionados.every((s) => atribuicoes[s.studentId])

  function irParaConfirmar() {
    if (!todosAtribuidos) { setError('Atribua instrutor e horário para todos os alunos selecionados.'); return }
    setError('')
    setStep('confirmar')
  }

  function handleConfirmar() {
    setError('')
    const lista: AtribuicaoExameMassa[] = selecionados.map((s) => ({
      solicitacaoId: s.solicitacaoId,
      studentId: s.studentId,
      studentName: s.studentName,
      studentDocument: s.studentDocument,
      instructorName: atribuicoes[s.studentId].instructorName,
      timeSlot: atribuicoes[s.studentId].timeSlot,
    }))
    startTransition(async () => {
      const result = await confirmarAgendamentoExameMassa({
        autoescola_id, categoria_codigo: categoriaCodigo, examDate, atribuicoes: lista,
        mensagemAdmin: mensagemAdmin || null, escola,
      })
      if (!result.success) { setError(result.error); return }
      setCriados(result.data.criados)
      setStep('sucesso')
      onConcluido()
    })
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 z-40"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
      >
        <div className="pointer-events-auto bg-[--p-bg-card] border border-[--p-border] rounded-2xl p-5 w-full max-w-2xl max-h-[90vh] overflow-y-auto space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-[--p-text-1] flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-[--p-accent]" />
                Mutirão de exame — {categoriaNome}
              </h2>
              <p className="text-xs text-[--p-text-3] capitalize mt-0.5">{formatarData(examDate)}</p>
            </div>
            <button onClick={onClose} className="p-1.5 text-[--p-text-3] hover:text-[--p-text-1] rounded-lg">
              <X className="w-4 h-4" />
            </button>
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-500/5 border border-red-500/20 rounded-xl px-4 py-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
            </p>
          )}

          {step === 'selecionar' && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-[--p-text-3] uppercase tracking-wide flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> Solicitações pendentes — {categoriaNome}
              </p>
              {pendentes === null ? (
                <div className="py-10 text-center text-sm text-[--p-text-3]">Carregando...</div>
              ) : pendentes.length === 0 ? (
                <div className="py-10 text-center text-sm text-[--p-text-3]">Nenhuma solicitação pendente para essa categoria.</div>
              ) : (
                <div className="space-y-2">
                  {pendentes.map((p) => (
                    <label
                      key={p.solicitacaoId}
                      className="flex items-center gap-3 bg-[--p-bg-base] border border-[--p-border] rounded-xl px-3 py-2.5 cursor-pointer hover:bg-[--p-hover] transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selecionadosIds.has(p.solicitacaoId)}
                        onChange={() => toggleSelecionado(p.solicitacaoId)}
                        className="rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[--p-text-1] truncate">{p.studentName}</p>
                        <p className="text-xs text-[--p-text-3]">{p.studentDocument}</p>
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        p.aulasConcluidasCategoria >= 5 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                      }`}>
                        {p.aulasConcluidasCategoria} aulas concluídas
                      </span>
                      {p.dataPreferida && (
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          p.dataPreferida === examDate ? 'bg-sky-500/10 text-sky-500' : 'bg-[--p-bg-input] text-[--p-text-3]'
                        }`}>
                          {p.dataPreferida === examDate ? 'coincide com esta data' : 'preferia outra data'}
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              )}
              <button
                onClick={irParaAtribuicao}
                disabled={isPending || (pendentes?.length ?? 0) === 0}
                className="w-full py-2.5 rounded-xl bg-[--p-accent] text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isPending ? 'Buscando disponibilidade...' : `Continuar (${selecionadosIds.size} selecionado${selecionadosIds.size !== 1 ? 's' : ''})`}
              </button>
            </div>
          )}

          {step === 'atribuir' && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-[--p-text-3] uppercase tracking-wide flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Atribuir instrutor e horário
              </p>
              {(disponibilidade?.length ?? 0) === 0 ? (
                <p className="text-sm text-amber-500 bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-3">
                  Nenhum instrutor disponível para {categoriaNome} nessa data.
                </p>
              ) : (
                <div className="space-y-2">
                  {selecionados.map((s) => (
                    <div key={s.studentId} className="flex items-center gap-3 bg-[--p-bg-base] border border-[--p-border] rounded-xl px-3 py-2.5">
                      <span className="text-sm text-[--p-text-1] flex-1 min-w-0 truncate">{s.studentName}</span>
                      <select
                        value={atribuicoes[s.studentId] ? `${atribuicoes[s.studentId].instructorName}__${atribuicoes[s.studentId].timeSlot}` : ''}
                        onChange={(e) => handleAtribuir(s.studentId, e.target.value)}
                        className="px-3 py-2 text-sm rounded-lg bg-[--p-bg-input] border border-[--p-border] text-[--p-text-1] focus:outline-none focus:ring-1 focus:ring-[--p-accent]"
                      >
                        <option value="">Selecione...</option>
                        {opcoesParaAluno().map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={() => setStep('selecionar')} className="flex-1 py-2.5 rounded-xl border border-[--p-border] text-[--p-text-2] text-sm font-semibold hover:bg-[--p-hover] transition-colors">
                  Voltar
                </button>
                <button
                  onClick={irParaConfirmar}
                  className="flex-1 py-2.5 rounded-xl bg-[--p-accent] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                  Continuar
                </button>
              </div>
            </div>
          )}

          {step === 'confirmar' && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-[--p-text-3] uppercase tracking-wide">Resumo</p>
              <div className="bg-[--p-bg-base] border border-[--p-border] rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[--p-border] text-left">
                      <th className="px-3 py-2 text-xs font-semibold text-[--p-text-3]">Aluno</th>
                      <th className="px-3 py-2 text-xs font-semibold text-[--p-text-3]">Instrutor</th>
                      <th className="px-3 py-2 text-xs font-semibold text-[--p-text-3]">Horário</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[--p-border]">
                    {selecionados.map((s) => (
                      <tr key={s.studentId}>
                        <td className="px-3 py-2 text-[--p-text-1]">{s.studentName}</td>
                        <td className="px-3 py-2 text-[--p-text-2]">{atribuicoes[s.studentId]?.instructorName}</td>
                        <td className="px-3 py-2 text-[--p-text-2]">{atribuicoes[s.studentId]?.timeSlot}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div>
                <label className="block text-xs font-medium text-[--p-text-2] mb-1.5">Mensagem para os alunos (opcional)</label>
                <textarea
                  value={mensagemAdmin}
                  onChange={(e) => setMensagemAdmin(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2.5 text-sm rounded-xl bg-[--p-bg-input] border border-[--p-border] text-[--p-text-1] focus:outline-none focus:ring-1 focus:ring-[--p-accent] resize-none"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setStep('atribuir')} disabled={isPending} className="flex-1 py-2.5 rounded-xl border border-[--p-border] text-[--p-text-2] text-sm font-semibold hover:bg-[--p-hover] transition-colors disabled:opacity-50">
                  Voltar
                </button>
                <button
                  onClick={handleConfirmar}
                  disabled={isPending}
                  className="flex-1 py-2.5 rounded-xl bg-[--p-accent] text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Confirmando...</> : 'Confirmar mutirão'}
                </button>
              </div>
            </div>
          )}

          {step === 'sucesso' && (
            <div className="py-8 text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <p className="text-sm font-semibold text-[--p-text-1]">{criados} aluno{criados !== 1 ? 's' : ''} agendado{criados !== 1 ? 's' : ''} para exame</p>
              <button onClick={onClose} className="px-6 py-2.5 rounded-xl bg-[--p-accent] text-white text-sm font-semibold hover:opacity-90 transition-opacity">
                Fechar
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </>
  )
}
