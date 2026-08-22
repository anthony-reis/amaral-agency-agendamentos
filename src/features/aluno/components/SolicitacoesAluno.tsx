'use client'

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ClipboardList,
  Plus,
  X,
  FileCheck,
  BookOpenCheck,
  Clock,
  Search,
  CalendarCheck2,
  XCircle,
  Ban,
  MapPin,
  CalendarDays,
  Info,
} from 'lucide-react'
import {
  listarMinhasSolicitacoes,
  criarSolicitacao,
  cancelarSolicitacao,
  contarSolicitacoesAtualizadas,
  listarCategoriasElegiveisExame,
  listarDatasExameParaSolicitacao,
  type CategoriaElegivelExame,
} from '@/features/aluno/actions/solicitacoes'
import type { Solicitacao, SolicitacaoTipo, SolicitacaoStatus } from '@/features/painel/types'

interface Props {
  escola: string
  autoescolaId: string
  studentId: string
  studentName: string
  solicitacoesIniciais: Solicitacao[]
}

const TIPO_INFO: Record<SolicitacaoTipo, { label: string; icon: React.ReactNode; descricao: string }> = {
  exame: {
    label: 'Agendamento de exame',
    icon: <FileCheck className="w-5 h-5" />,
    descricao: 'Peça para a autoescola agendar seu exame de habilitação.',
  },
  legislacao: {
    label: 'Curso de legislação',
    icon: <BookOpenCheck className="w-5 h-5" />,
    descricao: 'Peça para a autoescola agendar seu curso teórico de legislação.',
  },
}

const STATUS_INFO: Record<SolicitacaoStatus, { label: string; className: string; icon: React.ReactNode }> = {
  pendente: {
    label: 'Aguardando análise',
    className: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  em_analise: {
    label: 'Em análise',
    className: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    icon: <Search className="w-3.5 h-3.5" />,
  },
  agendado: {
    label: 'Agendado',
    className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    icon: <CalendarCheck2 className="w-3.5 h-3.5" />,
  },
  recusado: {
    label: 'Recusado',
    className: 'bg-red-500/10 text-red-500 border-red-500/20',
    icon: <XCircle className="w-3.5 h-3.5" />,
  },
  cancelado: {
    label: 'Cancelado',
    className: 'bg-[--p-bg-input] text-[--p-text-3] border-[--p-border]',
    icon: <Ban className="w-3.5 h-3.5" />,
  },
}

const POLL_INTERVAL_MS = 25_000

function fmtData(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtDataHora(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function SolicitacoesAluno({
  escola,
  autoescolaId,
  studentId,
  studentName,
  solicitacoesIniciais,
}: Props) {
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>(solicitacoesIniciais)
  const [showEscolha, setShowEscolha] = useState(false)
  const [tipoEscolhido, setTipoEscolhido] = useState<SolicitacaoTipo | null>(null)
  const [observacao, setObservacao] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [cancelandoId, setCancelandoId] = useState<string | null>(null)

  // Fluxo específico de exame: categoria + data preferida
  const [categoriasExame, setCategoriasExame] = useState<CategoriaElegivelExame[] | null>(null)
  const [categoriaSelecionada, setCategoriaSelecionada] = useState('')
  const [datasDisponiveis, setDatasDisponiveis] = useState<{ date: string }[] | null>(null)
  const [dataSelecionada, setDataSelecionada] = useState('')

  const mountedRef = useRef(true)
  const fetchingRef = useRef(false)
  const lastCheckRef = useRef(new Date().toISOString())

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  // Recarga completa (usada após criar/cancelar, quando já sabemos que mudou).
  const recarregar = useCallback(async () => {
    if (fetchingRef.current) return
    fetchingRef.current = true
    try {
      const dados = await listarMinhasSolicitacoes(autoescolaId, studentId)
      if (mountedRef.current) setSolicitacoes(dados)
      lastCheckRef.current = new Date().toISOString()
    } finally {
      fetchingRef.current = false
    }
  }, [autoescolaId, studentId])

  // Tick do polling: primeiro pergunta só "mudou algo desde X?" (query leve,
  // COUNT com filtro de updated_at) — só busca a lista completa se a resposta
  // for positiva. Evita buscar tudo a cada 25s sem necessidade.
  const checarAtualizacoes = useCallback(async () => {
    if (fetchingRef.current) return
    fetchingRef.current = true
    try {
      const desde = lastCheckRef.current
      const mudou = await contarSolicitacoesAtualizadas(autoescolaId, studentId, desde)
      lastCheckRef.current = new Date().toISOString()
      if (mudou > 0) {
        const dados = await listarMinhasSolicitacoes(autoescolaId, studentId)
        if (mountedRef.current) setSolicitacoes(dados)
      }
    } finally {
      fetchingRef.current = false
    }
  }, [autoescolaId, studentId])

  // Polling: só enquanto a aba está visível. Pausa em background, retoma no
  // foco/volta de visibilidade. Um único interval por vez (sem sobreposição
  // de requisições concorrentes via fetchingRef), limpo no unmount.
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null

    function start() {
      if (intervalId) return
      intervalId = setInterval(checarAtualizacoes, POLL_INTERVAL_MS)
    }
    function stop() {
      if (intervalId) {
        clearInterval(intervalId)
        intervalId = null
      }
    }
    function onVisibilityChange() {
      if (document.hidden) {
        stop()
      } else {
        checarAtualizacoes()
        start()
      }
    }

    if (!document.hidden) start()
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('focus', checarAtualizacoes)

    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('focus', checarAtualizacoes)
    }
  }, [checarAtualizacoes])

  const ativasPorTipo = new Set(
    solicitacoes.filter((s) => ['pendente', 'em_analise', 'agendado'].includes(s.status)).map((s) => s.tipo)
  )
  // Exame é segregado por categoria — uma categoria já solicitada não bloqueia as outras.
  const categoriasExameJaSolicitadas = new Set(
    solicitacoes
      .filter((s) => s.tipo === 'exame' && ['pendente', 'em_analise', 'agendado'].includes(s.status) && s.categoria)
      .map((s) => s.categoria as string)
  )

  function abrirEscolha() {
    setError('')
    setShowEscolha(true)
  }

  function fecharConfirmacao() {
    setTipoEscolhido(null)
    setObservacao('')
    setCategoriasExame(null)
    setCategoriaSelecionada('')
    setDatasDisponiveis(null)
    setDataSelecionada('')
  }

  function escolherTipo(tipo: SolicitacaoTipo) {
    setTipoEscolhido(tipo)
    setShowEscolha(false)
    if (tipo === 'exame') {
      setCategoriasExame(null)
      listarCategoriasElegiveisExame(autoescolaId, studentId).then(setCategoriasExame)
    }
  }

  function handleCategoriaChange(codigo: string) {
    setCategoriaSelecionada(codigo)
    setDataSelecionada('')
    setDatasDisponiveis(null)
    if (codigo) {
      listarDatasExameParaSolicitacao(autoescolaId, codigo).then(setDatasDisponiveis)
    }
  }

  const exameValido = tipoEscolhido !== 'exame' || (!!categoriaSelecionada && !!dataSelecionada)

  function confirmarSolicitacao() {
    if (!tipoEscolhido || !exameValido) return
    setError('')
    startTransition(async () => {
      const result = await criarSolicitacao(
        {
          autoescola_id: autoescolaId,
          student_id: studentId,
          student_name: studentName,
          tipo: tipoEscolhido,
          categoria: tipoEscolhido === 'exame' ? categoriaSelecionada : undefined,
          data_preferida: tipoEscolhido === 'exame' ? dataSelecionada : undefined,
          observacao_aluno: observacao,
        },
        escola
      )
      if (!result.success) {
        setError(result.error)
        return
      }
      setSolicitacoes((prev) => [result.data, ...prev])
      fecharConfirmacao()
    })
  }

  function cancelar(id: string) {
    if (!confirm('Cancelar esta solicitação? Essa ação não pode ser desfeita.')) return
    setCancelandoId(id)
    startTransition(async () => {
      const result = await cancelarSolicitacao(id, studentId, studentName, escola)
      if (result.success) {
        setSolicitacoes((prev) =>
          prev.map((s) => (s.id === id ? { ...s, status: 'cancelado' as const } : s))
        )
      } else {
        alert(result.error)
      }
      setCancelandoId(null)
    })
  }

  return (
    <div className="flex flex-col min-h-full">
      <div className="flex-1 flex flex-col px-4 pt-6 pb-8 max-w-2xl mx-auto w-full">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-xl font-bold text-[--p-text-1] flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-[--p-accent]" />
              Solicitações
            </h1>
            <p className="text-sm text-[--p-text-3] mt-0.5">
              Peça exame ou curso de legislação diretamente pelo app
            </p>
          </div>
          <button
            onClick={abrirEscolha}
            className="flex items-center gap-2 px-4 py-2.5 bg-[--p-accent] text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity shrink-0"
          >
            <Plus className="w-4 h-4" />
            Nova
          </button>
        </div>

        {solicitacoes.length === 0 ? (
          <div className="bg-[--p-bg-card] border border-[--p-border] rounded-2xl p-10 text-center">
            <ClipboardList className="w-10 h-10 text-[--p-text-3] mx-auto mb-3 opacity-30" />
            <p className="text-sm text-[--p-text-3]">Você ainda não fez nenhuma solicitação.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {solicitacoes.map((s) => {
              const tipo = TIPO_INFO[s.tipo]
              const status = STATUS_INFO[s.status]
              const podeCancel = ['pendente', 'em_analise'].includes(s.status)
              return (
                <div key={s.id} className="bg-[--p-bg-card] border border-[--p-border] rounded-2xl p-5">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[--p-accent]/10 text-[--p-accent] flex items-center justify-center shrink-0">
                      {tipo.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="text-sm font-bold text-[--p-text-1]">{tipo.label}</h3>
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${status.className}`}
                        >
                          {status.icon}
                          {status.label}
                        </span>
                      </div>
                      <p className="text-xs text-[--p-text-3] mb-2">
                        Solicitado em {fmtDataHora(s.created_at)} · Atualizado em {fmtDataHora(s.updated_at)}
                      </p>

                      {s.tipo === 'exame' && s.categoria && (
                        <p className="text-xs text-[--p-text-3] mb-2">
                          Categoria: <span className="text-[--p-text-2] font-medium">{s.categoria}</span>
                          {s.data_preferida && s.status !== 'agendado' && (
                            <> · Data preferida: <span className="text-[--p-text-2] font-medium">{fmtData(s.data_preferida + 'T12:00:00')}</span></>
                          )}
                        </p>
                      )}

                      {s.observacao_aluno && (
                        <p className="text-sm text-[--p-text-2] mb-2">
                          <span className="text-[--p-text-3]">Sua observação: </span>
                          {s.observacao_aluno}
                        </p>
                      )}

                      {s.status === 'agendado' && s.dados_atendimento && (
                        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 mt-2 space-y-1.5">
                          <div className="flex items-center gap-2 text-sm text-[--p-text-1] font-medium">
                            <CalendarDays className="w-4 h-4 text-emerald-500 shrink-0" />
                            {fmtData(s.dados_atendimento.data)} às {s.dados_atendimento.horario}
                          </div>
                          {s.dados_atendimento.local && (
                            <div className="flex items-center gap-2 text-sm text-[--p-text-2]">
                              <MapPin className="w-4 h-4 text-[--p-text-3] shrink-0" />
                              {s.dados_atendimento.local}
                            </div>
                          )}
                          {s.dados_atendimento.observacoes && (
                            <p className="text-xs text-[--p-text-3] pt-1">{s.dados_atendimento.observacoes}</p>
                          )}
                        </div>
                      )}

                      {s.status === 'recusado' && s.motivo_recusa && (
                        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-3 mt-2">
                          <p className="text-xs text-[--p-text-3] mb-0.5">Motivo da recusa</p>
                          <p className="text-sm text-[--p-text-1]">{s.motivo_recusa}</p>
                        </div>
                      )}

                      {s.mensagem_admin && s.status !== 'recusado' && (
                        <div className="bg-[--p-bg-input] rounded-xl p-3 mt-2">
                          <p className="text-xs text-[--p-text-3] mb-0.5">Mensagem da autoescola</p>
                          <p className="text-sm text-[--p-text-1]">{s.mensagem_admin}</p>
                        </div>
                      )}

                      {podeCancel && (
                        <button
                          onClick={() => cancelar(s.id)}
                          disabled={isPending && cancelandoId === s.id}
                          className="text-xs text-[--p-text-3] hover:text-red-400 mt-3 disabled:opacity-50 transition-colors"
                        >
                          Cancelar solicitação
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal: escolher tipo */}
      <AnimatePresence>
        {showEscolha && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40"
              onClick={() => setShowEscolha(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
            >
              <div className="bg-[--p-bg-card] rounded-2xl border border-[--p-border] p-6 w-full max-w-sm shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold text-[--p-text-1]">O que você precisa?</h3>
                  <button onClick={() => setShowEscolha(false)} className="text-[--p-text-3] hover:text-[--p-text-1]">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-2">
                  {(Object.keys(TIPO_INFO) as SolicitacaoTipo[]).map((tipo) => {
                    const info = TIPO_INFO[tipo]
                    // Exame é segregado por categoria (decidido na próxima etapa) — só
                    // legislação (categoria única) bloqueia aqui.
                    const bloqueado = tipo === 'legislacao' && ativasPorTipo.has(tipo)
                    return (
                      <button
                        key={tipo}
                        onClick={() => !bloqueado && escolherTipo(tipo)}
                        disabled={bloqueado}
                        className={`w-full flex items-start gap-3 p-4 rounded-xl border text-left transition-colors ${
                          bloqueado
                            ? 'border-[--p-border] opacity-50 cursor-not-allowed'
                            : 'border-[--p-border] hover:border-[--p-accent]/40 hover:bg-[--p-hover]'
                        }`}
                      >
                        <div className="w-9 h-9 rounded-xl bg-[--p-accent]/10 text-[--p-accent] flex items-center justify-center shrink-0">
                          {info.icon}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[--p-text-1]">{info.label}</p>
                          <p className="text-xs text-[--p-text-3] mt-0.5">
                            {bloqueado ? 'Você já tem uma solicitação desse tipo em andamento.' : info.descricao}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Modal: confirmação */}
      <AnimatePresence>
        {tipoEscolhido && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40"
              onClick={() => !isPending && fecharConfirmacao()}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
            >
              <div className="bg-[--p-bg-card] rounded-2xl border border-[--p-border] p-6 w-full max-w-sm shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold text-[--p-text-1]">Confirmar solicitação</h3>
                  <button
                    onClick={() => !isPending && fecharConfirmacao()}
                    className="text-[--p-text-3] hover:text-[--p-text-1]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-start gap-2 bg-[--p-bg-input] rounded-xl p-3 mb-4">
                  <Info className="w-4 h-4 text-[--p-accent] shrink-0 mt-0.5" />
                  <p className="text-xs text-[--p-text-2]">
                    Você está solicitando <strong>{TIPO_INFO[tipoEscolhido].label.toLowerCase()}</strong>.
                    A autoescola vai analisar seu pedido e avisar aqui mesmo quando tiver uma resposta.
                  </p>
                </div>

                {tipoEscolhido === 'exame' && (
                  <div className="space-y-3 mb-3">
                    <div>
                      <label className="block text-xs text-[--p-text-3] mb-1">Categoria</label>
                      {categoriasExame === null ? (
                        <p className="text-xs text-[--p-text-3]">Carregando categorias...</p>
                      ) : categoriasExame.length === 0 ? (
                        <p className="text-xs text-amber-500">Nenhuma categoria de exame disponível no momento.</p>
                      ) : (
                        <select
                          value={categoriaSelecionada}
                          onChange={(e) => handleCategoriaChange(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl bg-[--p-bg-input] border border-[--p-border] text-sm text-[--p-text-1] focus:outline-none focus:ring-1 focus:ring-[--p-accent]/40"
                        >
                          <option value="">Selecione a categoria...</option>
                          {categoriasExame.map((c) => {
                            const jaSolicitada = categoriasExameJaSolicitadas.has(c.codigo)
                            const desabilitada = !c.elegivel || jaSolicitada
                            return (
                              <option key={c.codigo} value={c.codigo} disabled={desabilitada}>
                                {c.nome}{desabilitada ? jaSolicitada ? ' (já solicitado)' : ` (${c.aulasConcluidas}/5 aulas concluídas)` : ''}
                              </option>
                            )
                          })}
                        </select>
                      )}
                    </div>

                    {categoriaSelecionada && (
                      <div>
                        <label className="block text-xs text-[--p-text-3] mb-1">Data preferida</label>
                        {datasDisponiveis === null ? (
                          <p className="text-xs text-[--p-text-3]">Carregando datas...</p>
                        ) : datasDisponiveis.length === 0 ? (
                          <p className="text-xs text-amber-500">Nenhuma data de exame configurada para essa categoria ainda.</p>
                        ) : (
                          <select
                            value={dataSelecionada}
                            onChange={(e) => setDataSelecionada(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-xl bg-[--p-bg-input] border border-[--p-border] text-sm text-[--p-text-1] focus:outline-none focus:ring-1 focus:ring-[--p-accent]/40"
                          >
                            <option value="">Selecione a data...</option>
                            {datasDisponiveis.map((d) => (
                              <option key={d.date} value={d.date}>{fmtData(d.date + 'T12:00:00')}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    )}

                    {dataSelecionada && (
                      <div className="flex items-start gap-2 bg-amber-500/5 border border-amber-500/20 rounded-xl p-3">
                        <Info className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                          Esta é sua data preferida. O exame pode acontecer nesta data ou em outra data disponível, conforme a organização da autoescola.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <label className="block text-xs text-[--p-text-3] mb-1">
                  Observação (opcional)
                </label>
                <textarea
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  placeholder="Alguma informação que ajude a autoescola?"
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl bg-[--p-bg-input] border border-[--p-border] text-sm text-[--p-text-1] placeholder:text-[--p-text-3] focus:outline-none focus:ring-1 focus:ring-[--p-accent]/40 resize-none mb-3"
                />

                {error && <p className="text-sm text-red-400 mb-3">{error}</p>}

                <div className="flex gap-2 justify-end">
                  <button
                    onClick={fecharConfirmacao}
                    disabled={isPending}
                    className="px-4 py-2 text-sm text-[--p-text-3] hover:text-[--p-text-1] disabled:opacity-50"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={confirmarSolicitacao}
                    disabled={isPending || !exameValido}
                    className="px-4 py-2 bg-[--p-accent] text-white text-sm font-semibold rounded-xl hover:opacity-90 disabled:opacity-50"
                  >
                    {isPending ? 'Enviando...' : 'Confirmar solicitação'}
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
