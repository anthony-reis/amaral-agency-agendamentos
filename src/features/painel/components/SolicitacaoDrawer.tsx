'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  FileCheck,
  BookOpenCheck,
  MessageCircle,
  Search,
  CalendarCheck2,
  XCircle,
  GraduationCap,
  Wallet,
  History,
  Send,
  Clock,
  ArrowRight,
} from 'lucide-react'
import {
  getSolicitacao,
  marcarComoVisualizada,
  iniciarAnalise,
  agendarSolicitacao,
  recusarSolicitacao,
} from '@/features/painel/actions/solicitacoes'
import type { SolicitacaoDetalhe, SolicitacaoTipo } from '@/features/painel/types'

interface Props {
  solicitacaoId: string
  autoescolaId: string
  escola: string
  onClose: () => void
  onChanged: () => void
}

const TIPO_LABEL: Record<SolicitacaoTipo, { label: string; icon: React.ReactNode }> = {
  exame: { label: 'Agendamento de exame', icon: <FileCheck className="w-4 h-4" /> },
  legislacao: { label: 'Curso de legislação', icon: <BookOpenCheck className="w-4 h-4" /> },
}

const EVENTO_LABEL: Record<string, string> = {
  criada: 'Solicitação criada pelo aluno',
  visualizada: 'Visualizada pela autoescola',
  em_analise: 'Colocada em análise',
  agendada: 'Agendada/atendida',
  recusada: 'Recusada',
  cancelada: 'Cancelada pelo aluno',
  mensagem: 'Mensagem enviada',
}

function fmtDataHora(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function SolicitacaoDrawer({ solicitacaoId, autoescolaId, escola, onClose, onChanged }: Props) {
  const router = useRouter()
  const [detalhe, setDetalhe] = useState<SolicitacaoDetalhe | null>(null)
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const [mensagem, setMensagem] = useState('')
  const [motivoRecusa, setMotivoRecusa] = useState('')
  const [showRecusar, setShowRecusar] = useState(false)
  const [showAgendar, setShowAgendar] = useState(false)
  const [dadosAtendimento, setDadosAtendimento] = useState({ data: '', horario: '', local: '', observacoes: '' })

  useEffect(() => {
    let ativo = true
    async function carregar() {
      setLoading(true)
      const dados = await getSolicitacao(solicitacaoId, autoescolaId)
      if (!ativo) return
      setDetalhe(dados)
      setLoading(false)
      if (dados && !dados.visualizado_em) {
        await marcarComoVisualizada(solicitacaoId, autoescolaId)
        onChanged()
      }
    }
    carregar()
    return () => {
      ativo = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solicitacaoId, autoescolaId])

  function handleIniciarAnalise() {
    setError('')
    startTransition(async () => {
      const result = await iniciarAnalise(solicitacaoId, autoescolaId, escola)
      if (!result.success) { setError(result.error); return }
      const atualizado = await getSolicitacao(solicitacaoId, autoescolaId)
      setDetalhe(atualizado)
      onChanged()
    })
  }

  function handleAgendar() {
    setError('')
    startTransition(async () => {
      const result = await agendarSolicitacao(
        solicitacaoId,
        autoescolaId,
        {
          data: dadosAtendimento.data,
          horario: dadosAtendimento.horario,
          local: dadosAtendimento.local || null,
          observacoes: dadosAtendimento.observacoes || null,
        },
        mensagem || null,
        escola
      )
      if (!result.success) { setError(result.error); return }
      const atualizado = await getSolicitacao(solicitacaoId, autoescolaId)
      setDetalhe(atualizado)
      setShowAgendar(false)
      onChanged()
    })
  }

  function handleRecusar() {
    setError('')
    startTransition(async () => {
      const result = await recusarSolicitacao(solicitacaoId, autoescolaId, motivoRecusa, mensagem || null, escola)
      if (!result.success) { setError(result.error); return }
      const atualizado = await getSolicitacao(solicitacaoId, autoescolaId)
      setDetalhe(atualizado)
      setShowRecusar(false)
      onChanged()
    })
  }

  function irParaMutirao() {
    if (!detalhe?.categoria) return
    const params = new URLSearchParams({ categoria: detalhe.categoria })
    if (detalhe.data_preferida) params.set('data', detalhe.data_preferida)
    onClose()
    router.push(`/${escola}/painel/datas-exame?${params}`)
  }

  const podeAgir = detalhe && ['pendente', 'em_analise'].includes(detalhe.status)
  const whatsappHref = detalhe?.student_phone
    ? `https://wa.me/55${detalhe.student_phone.replace(/\D/g, '')}`
    : null

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 z-40"
        onClick={onClose}
      />
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'tween', duration: 0.22 }}
        className="fixed right-0 top-0 bottom-0 w-full sm:w-[440px] bg-[--p-bg-card] z-50 flex flex-col shadow-2xl overflow-y-auto"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[--p-border] sticky top-0 bg-[--p-bg-card] z-10">
          <h2 className="text-base font-semibold text-[--p-text-1]">Detalhe da solicitação</h2>
          <button onClick={onClose} className="text-[--p-text-3] hover:text-[--p-text-1]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading || !detalhe ? (
          <div className="flex-1 flex items-center justify-center text-sm text-[--p-text-3]">Carregando...</div>
        ) : (
          <div className="flex-1 p-5 space-y-5">
            {/* Aluno */}
            <div className="bg-[--p-bg-input] rounded-xl p-4">
              <p className="text-sm font-bold text-[--p-text-1]">{detalhe.student_name}</p>
              <p className="text-xs text-[--p-text-3]">CPF/CNH: {detalhe.student_document || '—'}</p>
              {whatsappHref && (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-2 text-xs font-semibold text-emerald-500 hover:text-emerald-400"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  Falar no WhatsApp
                </a>
              )}
            </div>

            {/* Tipo + status */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[--p-accent]/10 text-[--p-accent] flex items-center justify-center shrink-0">
                {TIPO_LABEL[detalhe.tipo].icon}
              </div>
              <div>
                <p className="text-sm font-semibold text-[--p-text-1]">{TIPO_LABEL[detalhe.tipo].label}</p>
                <p className="text-xs text-[--p-text-3]">Criada em {fmtDataHora(detalhe.created_at)}</p>
              </div>
            </div>

            {detalhe.tipo === 'exame' && detalhe.categoria && (
              <div className="bg-[--p-bg-input] rounded-xl p-3 text-sm">
                <p className="text-[--p-text-1]">
                  Categoria: <span className="font-semibold">{detalhe.categoria}</span>
                  {detalhe.aulasConcluidasCategoria !== null && (
                    <span className="text-[--p-text-3]"> · {detalhe.aulasConcluidasCategoria} aulas concluídas nessa categoria</span>
                  )}
                </p>
                {detalhe.data_preferida && (
                  <p className="text-[--p-text-3] mt-0.5">Data preferida: {detalhe.data_preferida.split('-').reverse().join('/')}</p>
                )}
              </div>
            )}

            {detalhe.observacao_aluno && (
              <div className="text-sm text-[--p-text-2]">
                <span className="text-[--p-text-3]">Observação do aluno: </span>
                {detalhe.observacao_aluno}
              </div>
            )}

            {/* Aulas e créditos */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[--p-bg-input] rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-xs text-[--p-text-3] mb-1">
                  <GraduationCap className="w-3.5 h-3.5" /> Aulas concluídas
                </div>
                <p className="text-lg font-bold text-[--p-text-1]">{detalhe.aulasConcluidas}</p>
              </div>
              <div className="bg-[--p-bg-input] rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-xs text-[--p-text-3] mb-1">
                  <Wallet className="w-3.5 h-3.5" /> Créditos
                </div>
                <p
                  className={`text-sm font-bold ${
                    detalhe.situacaoCreditos === 'com_creditos'
                      ? 'text-emerald-500'
                      : detalhe.situacaoCreditos === 'sem_creditos'
                      ? 'text-red-400'
                      : 'text-[--p-text-3]'
                  }`}
                >
                  {detalhe.situacaoCreditos === 'com_creditos' && `Possui (${detalhe.totalCreditos})`}
                  {detalhe.situacaoCreditos === 'sem_creditos' && 'Sem créditos'}
                  {detalhe.situacaoCreditos === 'indisponivel' && 'Indisponível'}
                </p>
              </div>
            </div>

            {/* Estado atual / mensagens */}
            {detalhe.status === 'agendado' && detalhe.dados_atendimento && (
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 space-y-1">
                <p className="text-xs font-semibold text-emerald-500 flex items-center gap-1.5">
                  <CalendarCheck2 className="w-3.5 h-3.5" /> Atendimento registrado
                </p>
                <p className="text-sm text-[--p-text-1]">
                  {detalhe.dados_atendimento.data} às {detalhe.dados_atendimento.horario}
                </p>
                {detalhe.dados_atendimento.local && (
                  <p className="text-xs text-[--p-text-3]">{detalhe.dados_atendimento.local}</p>
                )}
                {detalhe.dados_atendimento.observacoes && (
                  <p className="text-xs text-[--p-text-3]">{detalhe.dados_atendimento.observacoes}</p>
                )}
              </div>
            )}
            {detalhe.status === 'recusado' && (
              <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-3">
                <p className="text-xs font-semibold text-red-400 flex items-center gap-1.5 mb-1">
                  <XCircle className="w-3.5 h-3.5" /> Recusada
                </p>
                <p className="text-sm text-[--p-text-1]">{detalhe.motivo_recusa}</p>
              </div>
            )}

            {/* Histórico */}
            <div>
              <p className="text-xs font-semibold text-[--p-text-3] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5" /> Histórico
              </p>
              <div className="space-y-2">
                {detalhe.eventos.map((ev) => (
                  <div key={ev.id} className="flex items-start gap-2 text-xs">
                    <Clock className="w-3.5 h-3.5 text-[--p-text-3] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[--p-text-2]">
                        {EVENTO_LABEL[ev.tipo_evento] ?? ev.tipo_evento} — <span className="text-[--p-text-3]">{ev.autor_nome}</span>
                      </p>
                      <p className="text-[--p-text-3]">{fmtDataHora(ev.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            {/* Ações */}
            {podeAgir && !showAgendar && !showRecusar && (
              <div className="space-y-2 pt-2">
                {detalhe.status === 'pendente' && (
                  <button
                    onClick={handleIniciarAnalise}
                    disabled={isPending}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500/10 text-blue-500 text-sm font-semibold hover:bg-blue-500/20 disabled:opacity-50 transition-colors"
                  >
                    <Search className="w-4 h-4" /> Iniciar análise
                  </button>
                )}
                {detalhe.tipo === 'exame' ? (
                  <button
                    onClick={irParaMutirao}
                    disabled={isPending}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 text-sm font-semibold hover:bg-emerald-500/20 disabled:opacity-50 transition-colors"
                  >
                    <ArrowRight className="w-4 h-4" /> Ir para mutirão de exame
                  </button>
                ) : (
                  <button
                    onClick={() => setShowAgendar(true)}
                    disabled={isPending}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 text-sm font-semibold hover:bg-emerald-500/20 disabled:opacity-50 transition-colors"
                  >
                    <CalendarCheck2 className="w-4 h-4" /> Agendar / Atender
                  </button>
                )}
                <button
                  onClick={() => setShowRecusar(true)}
                  disabled={isPending}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 text-red-400 text-sm font-semibold hover:bg-red-500/20 disabled:opacity-50 transition-colors"
                >
                  <XCircle className="w-4 h-4" /> Recusar
                </button>
              </div>
            )}

            {showAgendar && (
              <div className="bg-[--p-bg-input] rounded-xl p-4 space-y-3">
                <p className="text-sm font-semibold text-[--p-text-1]">Dados do atendimento</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-[--p-text-3] mb-1">Data</label>
                    <input
                      type="date"
                      value={dadosAtendimento.data}
                      onChange={(e) => setDadosAtendimento((p) => ({ ...p, data: e.target.value }))}
                      className="w-full px-2.5 py-2 rounded-lg bg-[--p-bg-base] border border-[--p-border] text-sm text-[--p-text-1]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[--p-text-3] mb-1">Horário</label>
                    <input
                      type="time"
                      value={dadosAtendimento.horario}
                      onChange={(e) => setDadosAtendimento((p) => ({ ...p, horario: e.target.value }))}
                      className="w-full px-2.5 py-2 rounded-lg bg-[--p-bg-base] border border-[--p-border] text-sm text-[--p-text-1]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-[--p-text-3] mb-1">Local (opcional)</label>
                  <input
                    type="text"
                    value={dadosAtendimento.local}
                    onChange={(e) => setDadosAtendimento((p) => ({ ...p, local: e.target.value }))}
                    placeholder="Ex: Detran, unidade central..."
                    className="w-full px-2.5 py-2 rounded-lg bg-[--p-bg-base] border border-[--p-border] text-sm text-[--p-text-1] placeholder:text-[--p-text-3]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[--p-text-3] mb-1">Observações/orientações (opcional)</label>
                  <textarea
                    value={dadosAtendimento.observacoes}
                    onChange={(e) => setDadosAtendimento((p) => ({ ...p, observacoes: e.target.value }))}
                    rows={2}
                    className="w-full px-2.5 py-2 rounded-lg bg-[--p-bg-base] border border-[--p-border] text-sm text-[--p-text-1] resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[--p-text-3] mb-1">Mensagem para o aluno (opcional)</label>
                  <textarea
                    value={mensagem}
                    onChange={(e) => setMensagem(e.target.value)}
                    rows={2}
                    placeholder="Ex: Leve documento com foto."
                    className="w-full px-2.5 py-2 rounded-lg bg-[--p-bg-base] border border-[--p-border] text-sm text-[--p-text-1] placeholder:text-[--p-text-3] resize-none"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setShowAgendar(false)} disabled={isPending} className="px-3 py-2 text-sm text-[--p-text-3] hover:text-[--p-text-1]">
                    Cancelar
                  </button>
                  <button
                    onClick={handleAgendar}
                    disabled={isPending}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-500 disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" /> Confirmar agendamento
                  </button>
                </div>
              </div>
            )}

            {showRecusar && (
              <div className="bg-[--p-bg-input] rounded-xl p-4 space-y-3">
                <p className="text-sm font-semibold text-[--p-text-1]">Motivo da recusa</p>
                <textarea
                  value={motivoRecusa}
                  onChange={(e) => setMotivoRecusa(e.target.value)}
                  rows={3}
                  placeholder="Explique de forma clara e respeitosa por que a solicitação foi recusada."
                  className="w-full px-2.5 py-2 rounded-lg bg-[--p-bg-base] border border-[--p-border] text-sm text-[--p-text-1] placeholder:text-[--p-text-3] resize-none"
                />
                <div>
                  <label className="block text-xs text-[--p-text-3] mb-1">Mensagem adicional (opcional)</label>
                  <textarea
                    value={mensagem}
                    onChange={(e) => setMensagem(e.target.value)}
                    rows={2}
                    className="w-full px-2.5 py-2 rounded-lg bg-[--p-bg-base] border border-[--p-border] text-sm text-[--p-text-1] resize-none"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setShowRecusar(false)} disabled={isPending} className="px-3 py-2 text-sm text-[--p-text-3] hover:text-[--p-text-1]">
                    Voltar
                  </button>
                  <button
                    onClick={handleRecusar}
                    disabled={isPending || !motivoRecusa.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-500 disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" /> Confirmar recusa
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </>
  )
}
