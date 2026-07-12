'use client'

import { useEffect, useState, useTransition } from 'react'
import { useSearchParams } from 'next/navigation'
import { AnimatePresence } from 'framer-motion'
import { ClipboardList, Search, MessageCircle, FileCheck, BookOpenCheck } from 'lucide-react'
import { listarSolicitacoes } from '@/features/painel/actions/solicitacoes'
import { SolicitacaoDrawer } from './SolicitacaoDrawer'
import type { SolicitacaoComAluno, SolicitacaoStatus, SolicitacaoTipo, SolicitacoesFiltro } from '../types'

interface Props {
  escola: string
  autoescolaId: string
  solicitacoesIniciais: SolicitacaoComAluno[]
}

const STATUS_OPCOES: { value: SolicitacaoStatus | 'TODOS'; label: string }[] = [
  { value: 'TODOS', label: 'Todos os status' },
  { value: 'pendente', label: 'Pendente' },
  { value: 'em_analise', label: 'Em análise' },
  { value: 'agendado', label: 'Agendado' },
  { value: 'recusado', label: 'Recusado' },
  { value: 'cancelado', label: 'Cancelado' },
]

const STATUS_BADGE: Record<SolicitacaoStatus, string> = {
  pendente: 'bg-amber-500/10 text-amber-500',
  em_analise: 'bg-blue-500/10 text-blue-500',
  agendado: 'bg-emerald-500/10 text-emerald-500',
  recusado: 'bg-red-500/10 text-red-500',
  cancelado: 'bg-[--p-bg-input] text-[--p-text-3]',
}

const STATUS_LABEL: Record<SolicitacaoStatus, string> = {
  pendente: 'Pendente',
  em_analise: 'Em análise',
  agendado: 'Agendado',
  recusado: 'Recusado',
  cancelado: 'Cancelado',
}

const TIPO_LABEL: Record<SolicitacaoTipo, string> = {
  exame: 'Exame',
  legislacao: 'Legislação',
}

function fmtData(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function SolicitacoesList({ escola, autoescolaId, solicitacoesIniciais }: Props) {
  const searchParams = useSearchParams()
  const [itens, setItens] = useState<SolicitacaoComAluno[]>(solicitacoesIniciais)
  const [isPending, startTransition] = useTransition()
  const [drawerId, setDrawerId] = useState<string | null>(null)

  const [filtros, setFiltros] = useState<SolicitacoesFiltro>({
    tipo: 'TODOS',
    status: 'TODOS',
    naoVisualizadas: searchParams.get('filtro') === 'novas',
  })

  function aplicarFiltro(parcial: Partial<SolicitacoesFiltro>) {
    const novo = { ...filtros, ...parcial }
    setFiltros(novo)
    startTransition(async () => {
      const dados = await listarSolicitacoes(autoescolaId, novo)
      setItens(dados)
    })
  }

  // Se chegou via "Ver solicitações agora" do modal, já aplica o filtro na primeira carga.
  useEffect(() => {
    if (searchParams.get('filtro') === 'novas') {
      startTransition(async () => {
        const dados = await listarSolicitacoes(autoescolaId, { ...filtros, naoVisualizadas: true })
        setItens(dados)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function onDrawerChanged() {
    // Reaplica o filtro atual pra refletir visualizado_em/status atualizados na lista
    // e avisa o watcher global (badge do menu) para recarregar imediatamente.
    startTransition(async () => {
      const dados = await listarSolicitacoes(autoescolaId, filtros)
      setItens(dados)
    })
    window.dispatchEvent(new CustomEvent('solicitacoes:changed'))
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <ClipboardList className="w-5 h-5 text-[#0ea5e9]" />
        <div>
          <h1 className="text-xl font-bold text-[--p-text-1]">Solicitações</h1>
          <p className="text-sm text-[--p-text-3]">{itens.length} solicitação{itens.length !== 1 ? 'ões' : ''}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-[--p-bg-card] rounded-2xl border border-[--p-border] p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-[--p-text-3] mb-1">Tipo</label>
          <select
            value={filtros.tipo}
            onChange={(e) => aplicarFiltro({ tipo: e.target.value as SolicitacaoTipo | 'TODOS' })}
            className="px-3 py-2 rounded-xl bg-[--p-bg-input] border border-[--p-border] text-sm text-[--p-text-1]"
          >
            <option value="TODOS">Todos os tipos</option>
            <option value="exame">Exame</option>
            <option value="legislacao">Legislação</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-[--p-text-3] mb-1">Status</label>
          <select
            value={filtros.status}
            onChange={(e) => aplicarFiltro({ status: e.target.value as SolicitacaoStatus | 'TODOS' })}
            className="px-3 py-2 rounded-xl bg-[--p-bg-input] border border-[--p-border] text-sm text-[--p-text-1]"
          >
            {STATUS_OPCOES.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-[--p-text-3] mb-1">De</label>
          <input
            type="date"
            value={filtros.dateStart ?? ''}
            onChange={(e) => aplicarFiltro({ dateStart: e.target.value || undefined })}
            className="px-3 py-2 rounded-xl bg-[--p-bg-input] border border-[--p-border] text-sm text-[--p-text-1]"
          />
        </div>
        <div>
          <label className="block text-xs text-[--p-text-3] mb-1">Até</label>
          <input
            type="date"
            value={filtros.dateEnd ?? ''}
            onChange={(e) => aplicarFiltro({ dateEnd: e.target.value || undefined })}
            className="px-3 py-2 rounded-xl bg-[--p-bg-input] border border-[--p-border] text-sm text-[--p-text-1]"
          />
        </div>
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs text-[--p-text-3] mb-1">Aluno</label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[--p-text-3] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Nome ou documento"
              value={filtros.aluno ?? ''}
              onChange={(e) => aplicarFiltro({ aluno: e.target.value || undefined })}
              className="w-full pl-8 pr-3 py-2 rounded-xl bg-[--p-bg-input] border border-[--p-border] text-sm text-[--p-text-1] placeholder:text-[--p-text-3]"
            />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-[--p-text-2] pb-2">
          <input
            type="checkbox"
            checked={!!filtros.naoVisualizadas}
            onChange={(e) => aplicarFiltro({ naoVisualizadas: e.target.checked })}
            className="rounded"
          />
          Só não visualizadas
        </label>
        {isPending && <span className="text-xs text-[--p-text-3] animate-pulse pb-2">Atualizando...</span>}
      </div>

      {/* Lista */}
      {itens.length === 0 ? (
        <div className="bg-[--p-bg-card] rounded-2xl border border-[--p-border] px-6 py-16 text-center text-[--p-text-3] text-sm">
          Nenhuma solicitação encontrada com esses filtros.
        </div>
      ) : (
        <div className="bg-[--p-bg-card] rounded-2xl border border-[--p-border] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead className="bg-[--p-bg-base]">
                <tr className="border-b border-[--p-border]">
                  <th className="text-left text-xs font-semibold text-[--p-text-3] uppercase px-5 py-3">Aluno</th>
                  <th className="text-left text-xs font-semibold text-[--p-text-3] uppercase px-4 py-3">Tipo</th>
                  <th className="text-left text-xs font-semibold text-[--p-text-3] uppercase px-4 py-3">Status</th>
                  <th className="text-left text-xs font-semibold text-[--p-text-3] uppercase px-4 py-3">Criada em</th>
                  <th className="text-left text-xs font-semibold text-[--p-text-3] uppercase px-4 py-3">Atualizada em</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[--p-border]">
                {itens.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => setDrawerId(s.id)}
                    className="hover:bg-[--p-hover] transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        {!s.visualizado_em && (
                          <span className="w-2 h-2 rounded-full bg-[#0ea5e9] shrink-0" title="Nova / não visualizada" />
                        )}
                        <span className="font-medium text-[--p-text-1]">{s.student_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[--p-text-2]">
                      <span className="inline-flex items-center gap-1.5">
                        {s.tipo === 'exame' ? <FileCheck className="w-3.5 h-3.5" /> : <BookOpenCheck className="w-3.5 h-3.5" />}
                        {TIPO_LABEL[s.tipo]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-0.5 text-xs font-bold rounded-md ${STATUS_BADGE[s.status]}`}>
                        {STATUS_LABEL[s.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[--p-text-3]">{fmtData(s.created_at)}</td>
                    <td className="px-4 py-3 text-[--p-text-3]">{fmtData(s.updated_at)}</td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      {s.student_phone && (
                        <a
                          href={`https://wa.me/55${s.student_phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="WhatsApp"
                          className="inline-flex p-1.5 rounded-lg text-[--p-text-3] hover:text-emerald-500 hover:bg-emerald-500/5 transition-colors"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AnimatePresence>
        {drawerId && (
          <SolicitacaoDrawer
            solicitacaoId={drawerId}
            autoescolaId={autoescolaId}
            escola={escola}
            onClose={() => setDrawerId(null)}
            onChanged={onDrawerChanged}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
