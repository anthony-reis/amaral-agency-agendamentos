'use client'

import { useCallback, useMemo, useState, useTransition } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronRight, Download, GraduationCap, MessageCircle, Plus, Search } from 'lucide-react'
import { contarAulasAgendadas, excluirAluno, ajustarCredito } from '../actions/alunos'
import { canEditPainel, type AlunoComCreditos } from '../types'
import type { Produto } from '@/lib/loja-types'
import { AgendarExameModal } from './AgendarExameModal'
import { VenderCreditosModal } from './VenderCreditosModal'
import { AlunoDrawer } from './alunos/AlunoDrawer'
import { ExcluirAlunoModal } from './alunos/ExcluirAlunoModal'
import { NovoAlunoModal } from './alunos/NovoAlunoModal'
import { instrutorServe, MODALIDADES, rotuloAulas, type Modalidade } from '@/lib/vinculoInstrutor'
import { CATS, creditoDaCat, formatDoc, inputCls, linkWhatsapp, totalCreditos, type Cat } from './alunos/utils'

interface Props {
  alunos: AlunoComCreditos[]
  autoescola_id: string
  userRole: string
  produtos?: Produto[]
  escola: string
  /** Módulo "vendas": adicionar crédito vira venda + venda no cadastro. */
  vendasAtivo?: boolean
  /** Perfil pode vender (editar Vendas). Com o módulo ligado, "+" é venda. */
  podeVender?: boolean
  /** Módulo "exames": botão de agendar exame. */
  examesAtivo?: boolean
  /** Módulo "login_senha_aluno": resetar a senha do aluno. */
  loginSenhaAtivo?: boolean
  /** Módulo "separar_cambio": câmbio manual/automático do aluno. */
  cambioAtivo?: boolean
  /** Opção "vincular aluno ao instrutor" (aba Sistema): instrutores para escolher; null = desligada. */
  instrutoresVinculo?: { id: string; name: string; category: string }[] | null
  /** Aulas futuras por aluno, modalidade e instrutor (só com o vínculo ligado). */
  aulasFuturasPorAluno?: Record<string, { categoria: Modalidade; instrutor: string; qtd: number }[]>
  /** Módulo "contratos": aba Contrato e selo na tabela. */
  contratosAtivo?: boolean
  /** Situação do contrato por aluno (só com o módulo ligado). */
  contratoStatusInicial?: Record<string, 'pendente' | 'assinado'>
}

type Filtro = 'todos' | 'com' | 'sem'
type SortCol = 'nome' | 'cadastro' | 'total' | Cat

function CabecalhoOrdenavel({ label, ativo, dir, onClick, centro }: { label: string; ativo: boolean; dir: 'asc' | 'desc'; onClick: () => void; centro?: boolean }) {
  const Icon = !ativo ? ArrowUpDown : dir === 'asc' ? ArrowUp : ArrowDown
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 text-xs font-semibold uppercase transition-colors ${centro ? 'mx-auto' : ''} ${ativo ? 'text-[#0ea5e9]' : 'text-[--p-text-3] hover:text-[--p-text-2]'}`}
    >
      {label}
      <Icon className={`w-3 h-3 ${ativo ? '' : 'opacity-40'}`} />
    </button>
  )
}

const FILTROS: { id: Filtro; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'com', label: 'Com créditos' },
  { id: 'sem', label: 'Sem créditos' },
]

export function AlunosList({
  alunos: initial,
  autoescola_id,
  userRole,
  produtos = [],
  escola,
  vendasAtivo = false,
  podeVender = false,
  examesAtivo = false,
  loginSenhaAtivo = false,
  cambioAtivo = false,
  instrutoresVinculo = null,
  aulasFuturasPorAluno = {},
  contratosAtivo = false,
  contratoStatusInicial = {},
}: Props) {
  const canEdit = canEditPainel(userRole)
  const [alunos, setAlunos] = useState<AlunoComCreditos[]>(initial)
  const [isPending, startTransition] = useTransition()
  const [contratoStatus, setContratoStatus] = useState(contratoStatusInicial)

  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [sort, setSort] = useState<{ col: SortCol; dir: 'asc' | 'desc' }>({ col: 'nome', dir: 'asc' })
  const [abaInicial, setAbaInicial] = useState<'creditos' | 'dados'>('creditos')

  const [abertoId, setAbertoId] = useState<string | null>(null)
  const [modalNovo, setModalNovo] = useState(false)
  const [modalExcluir, setModalExcluir] = useState<{ aluno: AlunoComCreditos; aulasCount: number } | null>(null)
  const [carregandoExclusao, setCarregandoExclusao] = useState(false)
  const [examAlunoId, setExamAlunoId] = useState<string | null>(null)
  const [vendaAlunoId, setVendaAlunoId] = useState<string | null>(null)
  // "+" com módulo de vendas fica pendente até registrar a venda (valor + pagamento)
  const [pendingAdd, setPendingAdd] = useState<Record<string, Partial<Record<Cat, number>>>>({})

  function alternarOrdem(col: SortCol) {
    setSort((s) => s.col === col
      ? { col, dir: s.dir === 'asc' ? 'desc' : 'asc' }
      : { col, dir: col === 'nome' ? 'asc' : 'desc' })
  }

  function abrirAluno(id: string, aba: 'creditos' | 'dados' = 'dados') {
    setAbaInicial(aba)
    setAbertoId(id)
  }

  const podeAdicionar = !vendasAtivo || podeVender
  const aberto = alunos.find((a) => a.id === abertoId) ?? null
  const examAluno = alunos.find((a) => a.id === examAlunoId) ?? null
  const vendaAluno = alunos.find((a) => a.id === vendaAlunoId) ?? null
  const fecharDrawer = useCallback(() => setAbertoId(null), [])

  const resumo = useMemo(() => {
    const total = alunos.reduce((s, a) => s + totalCreditos(a), 0)
    const sem = alunos.filter((a) => totalCreditos(a) === 0).length
    return { total, sem }
  }, [alunos])

  const filtrados = useMemo(() => {
    const s = busca.trim().toLowerCase()
    const digitos = busca.replace(/\D/g, '')
    return alunos
      .filter((a) => {
        if (filtro === 'com' && totalCreditos(a) === 0) return false
        if (filtro === 'sem' && totalCreditos(a) > 0) return false
        if (!s) return true
        return (
          a.name.toLowerCase().includes(s) ||
          (digitos.length > 0 && (a.document_id.includes(digitos) || (a.phone ?? '').replace(/\D/g, '').includes(digitos))) ||
          (a.email ?? '').toLowerCase().includes(s)
        )
      })
      .sort((a, b) => {
        const valor = (x: AlunoComCreditos) =>
          sort.col === 'total' ? totalCreditos(x) : sort.col === 'cadastro' ? x.created_at : sort.col === 'nome' ? x.name : creditoDaCat(x, sort.col)
        const va = valor(a), vb = valor(b)
        const diff = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb), 'pt-BR')
        return sort.dir === 'asc' ? diff : -diff
      })
  }, [alunos, busca, filtro, sort])

  const atualizarAluno = useCallback((id: string, patch: Partial<AlunoComCreditos>) => {
    setAlunos((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)))
  }, [])

  // ── Créditos ───────────────────────────────────────────────────────────────
  function handleAjustar(aluno: AlunoComCreditos, cat: Cat, delta: number) {
    startTransition(async () => {
      const result = await ajustarCredito(aluno.id, cat, delta, autoescola_id)
      if (result.success) atualizarAluno(aluno.id, { creditos: result.data })
    })
  }

  // Variação em edição por categoria (+4 / -4). Nada é salvo até confirmar.
  // Não deixa o saldo ficar negativo; 0, vazio ou inválido limpa.
  function handleDefinir(aluno: AlunoComCreditos, cat: Cat, qtd: number) {
    const n = Number.isFinite(qtd) ? Math.trunc(qtd) : 0
    const valido = Math.min(1000, Math.max(-creditoDaCat(aluno, cat), n))
    setPendingAdd((prev) => {
      const next = { ...prev[aluno.id] }
      if (valido !== 0) next[cat] = valido
      else delete next[cat]
      const { [aluno.id]: _, ...resto } = prev
      return Object.keys(next).length ? { ...resto, [aluno.id]: next } : resto
    })
  }

  // Remoções são correção e salvam direto. Adições com o módulo de vendas
  // seguem para o registro da venda (valor, pagamento, comprovante).
  function confirmarPendente(aluno: AlunoComCreditos) {
    const faltam: Partial<Record<Cat, number>> = { ...pendingAdd[aluno.id] }
    startTransition(async () => {
      for (const cat of CATS) {
        const n = faltam[cat] ?? 0
        if (n === 0 || (n > 0 && vendasAtivo)) continue
        const result = await ajustarCredito(aluno.id, cat, n, autoescola_id)
        if (!result.success) { setPendingAdd((prev) => ({ ...prev, [aluno.id]: faltam })); return }
        atualizarAluno(aluno.id, { creditos: result.data })
        delete faltam[cat]
      }
      if (Object.keys(faltam).length > 0) {
        setPendingAdd((prev) => ({ ...prev, [aluno.id]: faltam }))
        setVendaAlunoId(aluno.id)
      } else {
        cancelarPendente(aluno.id)
      }
    })
  }

  function cancelarPendente(alunoId: string) {
    setPendingAdd((prev) => {
      const next = { ...prev }
      delete next[alunoId]
      return next
    })
  }

  // ── Exclusão ───────────────────────────────────────────────────────────────
  async function abrirExcluir(aluno: AlunoComCreditos) {
    setCarregandoExclusao(true)
    const count = await contarAulasAgendadas(aluno.id, autoescola_id)
    setCarregandoExclusao(false)
    setModalExcluir({ aluno, aulasCount: count })
  }

  function confirmarExcluir() {
    if (!modalExcluir) return
    const id = modalExcluir.aluno.id
    startTransition(async () => {
      const result = await excluirAluno(id, autoescola_id)
      if (result.success) {
        setAlunos((prev) => prev.filter((a) => a.id !== id))
        cancelarPendente(id)
        setAbertoId((atual) => (atual === id ? null : atual))
      }
      setModalExcluir(null)
    })
  }

  // ── CSV (respeita busca/filtro atuais) ─────────────────────────────────────
  function exportarCSV() {
    const header = 'Nome,CPF/CNH,Telefone,Email,Cat.A,Cat.B,Cat.C,Cat.D,Cat.E,Total,Cadastro'
    const rows = filtrados.map((a) => [
      a.name,
      formatDoc(a.document_id),
      a.phone ?? '',
      a.email ?? '',
      ...CATS.map((c) => creditoDaCat(a, c)),
      totalCreditos(a),
      new Date(a.created_at).toLocaleDateString('pt-BR'),
    ].join(','))
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `alunos-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-5">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <GraduationCap className="w-5 h-5 text-[#0ea5e9]" />
          <div>
            <h1 className="text-xl font-bold text-[--p-text-1]">Alunos</h1>
            <p className="text-sm text-[--p-text-3]">Cadastro, créditos e acesso dos alunos</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportarCSV}
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-[--p-text-2] border border-[--p-border] rounded-xl hover:bg-[--p-hover] transition-colors"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Exportar</span>
          </button>
          {canEdit && (
            <button
              onClick={() => setModalNovo(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#0ea5e9] text-white text-sm font-semibold rounded-xl hover:bg-[#0284c7] transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Novo aluno
            </button>
          )}
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Alunos', value: alunos.length, cor: 'text-[#0ea5e9]', bg: 'bg-[#0ea5e9]/10' },
          { label: 'Créditos no total', value: resumo.total, cor: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: 'Média por aluno', value: alunos.length ? (resumo.total / alunos.length).toFixed(1) : '0', cor: 'text-purple-500', bg: 'bg-purple-500/10' },
          { label: 'Sem créditos', value: resumo.sem, cor: 'text-amber-500', bg: 'bg-amber-500/10' },
        ].map((s) => (
          <div key={s.label} className={`rounded-2xl p-4 border border-[--p-border] ${s.bg}`}>
            <p className="text-xs text-[--p-text-3] mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.cor}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Busca, filtros e ordenação */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[--p-text-3]" />
          <input
            type="text"
            placeholder="Buscar por nome, CPF, telefone ou e-mail…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className={`${inputCls} pl-9`}
          />
        </div>
        <div className="flex p-1 rounded-xl bg-[--p-bg-input] border border-[--p-border]">
          {FILTROS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFiltro(f.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                filtro === f.id ? 'bg-[--p-bg-card] text-[--p-text-1] shadow-sm' : 'text-[--p-text-3] hover:text-[--p-text-2]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela */}
      {filtrados.length === 0 ? (
        <div className="text-center py-16 bg-[--p-bg-card] rounded-2xl border border-[--p-border]">
          <GraduationCap className="w-10 h-10 text-[--p-text-3] mx-auto mb-3" />
          <p className="text-[--p-text-2] font-medium">Nenhum aluno encontrado</p>
          {(busca || filtro !== 'todos') && (
            <button onClick={() => { setBusca(''); setFiltro('todos') }} className="mt-2 text-sm text-[#0ea5e9] hover:underline">
              Limpar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="bg-[--p-bg-card] rounded-2xl border border-[--p-border] overflow-auto max-h-[calc(100vh-22rem)] min-h-[320px]">
          <table className="w-full text-sm min-w-[960px] border-separate border-spacing-0">
            <thead className="sticky top-0 z-10">
              <tr>
                {([
                  { col: 'nome', label: 'Nome', align: 'text-left px-4' },
                ] as { col: SortCol; label: string; align: string }[]).map((h) => (
                  <th key={h.col} className={`${h.align} py-3 bg-[--p-bg-card] border-b border-[--p-border]`}>
                    <CabecalhoOrdenavel label={h.label} ativo={sort.col === h.col} dir={sort.dir} onClick={() => alternarOrdem(h.col)} />
                  </th>
                ))}
                <th className="text-left px-4 py-3 bg-[--p-bg-card] border-b border-[--p-border] text-xs font-semibold uppercase text-[--p-text-3]">CPF/CNH</th>
                <th className="text-left px-4 py-3 bg-[--p-bg-card] border-b border-[--p-border] text-xs font-semibold uppercase text-[--p-text-3]">Telefone</th>
                {CATS.map((c) => (
                  <th key={c} className="px-2 py-3 bg-[--p-bg-card] border-b border-[--p-border] text-center">
                    <CabecalhoOrdenavel centro label={`Cat. ${c.toUpperCase()}`} ativo={sort.col === c} dir={sort.dir} onClick={() => alternarOrdem(c)} />
                  </th>
                ))}
                <th className="px-3 py-3 bg-[--p-bg-card] border-b border-[--p-border] text-center">
                  <CabecalhoOrdenavel centro label="Total" ativo={sort.col === 'total'} dir={sort.dir} onClick={() => alternarOrdem('total')} />
                </th>
                <th className="px-3 py-3 bg-[--p-bg-card] border-b border-[--p-border] text-left">
                  <CabecalhoOrdenavel label="Cadastro" ativo={sort.col === 'cadastro'} dir={sort.dir} onClick={() => alternarOrdem('cadastro')} />
                </th>
                <th className="px-3 py-3 bg-[--p-bg-card] border-b border-[--p-border] w-28" />
              </tr>
            </thead>
            <tbody>
              {filtrados.map((a, i) => {
                const pendAluno = pendingAdd[a.id] ?? {}
                const temPend = Object.values(pendAluno).some((n) => (n ?? 0) !== 0)
                const temVendaPend = vendasAtivo && Object.values(pendAluno).some((n) => (n ?? 0) > 0)
                const linha = 'border-b border-[--p-border]'
                return (
                  <tr key={a.id} onClick={() => abrirAluno(a.id, 'creditos')} className={`group cursor-pointer ${i % 2 ? 'bg-[--p-bg-input]/40' : ''} hover:bg-[--p-hover] transition-colors`}>
                    <td className={`${linha} px-4 py-2.5`}>
                      <button className="text-left font-semibold text-[--p-text-1] hover:text-[#0ea5e9] truncate max-w-[220px] block transition-colors">
                        {a.name}
                      </button>
                      {instrutoresVinculo && (() => {
                        const resumo = aulasFuturasPorAluno[a.id] ?? []
                        const ativas = MODALIDADES.filter((m) => instrutoresVinculo.some((i) => instrutorServe(i.category, m.id)))
                        return ativas.map((m) => {
                          const prefixo = ativas.length > 1 ? `${m.label}: ` : ''
                          const nome = instrutoresVinculo.find((i) => i.id === a.vinculos?.[m.id])?.name
                          const daModalidade = resumo.filter((r) => r.categoria === m.id)
                          if (nome) {
                            return (
                              <span key={m.id} className="mt-0.5 mr-1 inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-violet-500/10 text-violet-500">
                                {prefixo}{nome} · {rotuloAulas(daModalidade.find((r) => r.instrutor === nome)?.qtd ?? 0)}
                              </span>
                            )
                          }
                          return daModalidade.length > 1 ? (
                            <span key={m.id} className="mt-0.5 mr-1 inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500" title={daModalidade.map((r) => `${r.instrutor}: ${r.qtd}`).join(' · ')}>
                              {prefixo}aulas com {daModalidade.length} instrutores
                            </span>
                          ) : null
                        })
                      })()}
                      {contratosAtivo && contratoStatus[a.id] && (
                        <span className={`mt-0.5 inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                          contratoStatus[a.id] === 'assinado' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                        }`}>
                          {contratoStatus[a.id] === 'assinado' ? 'Contrato assinado' : 'Contrato pendente'}
                        </span>
                      )}
                    </td>
                    <td className={`${linha} px-4 py-2.5 font-mono text-xs text-[--p-text-2] whitespace-nowrap`}>{formatDoc(a.document_id)}</td>
                    <td className={`${linha} px-4 py-2.5 text-[--p-text-2] whitespace-nowrap`}>
                      {a.phone ? (
                        <span className="inline-flex items-center gap-2">
                          {a.phone}
                          <a onClick={(e) => e.stopPropagation()} href={linkWhatsapp(a.phone)} target="_blank" rel="noopener noreferrer" title="Abrir no WhatsApp" className="text-emerald-500 hover:text-emerald-400">
                            <MessageCircle className="w-4 h-4" />
                          </a>
                        </span>
                      ) : <span className="text-[--p-text-3]">—</span>}
                    </td>
                    {CATS.map((c) => {
                      const val = creditoDaCat(a, c)
                      const pend = pendAluno[c] ?? 0
                      return (
                        <td key={c} className={`${linha} px-2 py-2.5 text-center`}>
                          <span className={`font-semibold tabular-nums ${val > 0 ? 'text-[--p-text-1]' : 'text-[--p-text-3]'}`}>
                            {val}{pend !== 0 && <span className={pend > 0 ? 'text-emerald-500' : 'text-red-400'}>{pend > 0 ? `+${pend}` : pend}</span>}
                          </span>
                        </td>
                      )
                    })}
                    <td className={`${linha} px-3 py-2.5 text-center font-bold tabular-nums text-[#0ea5e9]`}>{totalCreditos(a)}</td>
                    <td className={`${linha} px-3 py-2.5 text-xs text-[--p-text-3] whitespace-nowrap`}>{new Date(a.created_at).toLocaleDateString('pt-BR')}</td>
                    <td className={`${linha} px-3 py-2.5 text-right`}>
                      <button
                        onClick={() => abrirAluno(a.id, 'creditos')}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                          temPend ? 'bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25' : 'text-[--p-text-2] hover:text-[#0ea5e9] hover:bg-[#0ea5e9]/10'
                        }`}
                      >
                        {temPend ? (temVendaPend ? 'Registrar venda' : 'Salvar') : 'Abrir'} <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-[--p-text-3]">{filtrados.length} de {alunos.length} alunos · clique numa linha para abrir o painel do aluno</p>

      {/* Painel do aluno */}
      <AlunoDrawer
        aluno={aberto}
        abaInicial={abaInicial}
        autoescola_id={autoescola_id}
        canEdit={canEdit}
        podeAdicionar={podeAdicionar}
        vendasAtivo={vendasAtivo}
        examesAtivo={examesAtivo}
        loginSenhaAtivo={loginSenhaAtivo}
        cambioAtivo={cambioAtivo}
        instrutoresVinculo={instrutoresVinculo}
        resumoAulas={aberto ? aulasFuturasPorAluno[aberto.id] : undefined}
        contratosAtivo={contratosAtivo}
        escola={escola}
        onContratoStatus={(st) => aberto && setContratoStatus((prev) => {
          const { [aberto.id]: _, ...resto } = prev
          return st ? { ...resto, [aberto.id]: st } : resto
        })}
        pendente={aberto ? pendingAdd[aberto.id] ?? {} : {}}
        ocupado={isPending || carregandoExclusao}
        onFechar={fecharDrawer}
        onDefinir={(c, n) => aberto && handleDefinir(aberto, c, n)}
        onDescartarPendente={() => aberto && cancelarPendente(aberto.id)}
        onConfirmarPendente={() => aberto && confirmarPendente(aberto)}
        onAgendarExame={() => aberto && setExamAlunoId(aberto.id)}
        onExcluir={() => aberto && abrirExcluir(aberto)}
        onAtualizado={(patch) => aberto && atualizarAluno(aberto.id, patch)}
      />

      {/* Modais */}
      <AnimatePresence>
        {modalNovo && (
          <NovoAlunoModal
            autoescola_id={autoescola_id}
            produtos={produtos}
            cambioAtivo={cambioAtivo}
            onClose={() => setModalNovo(false)}
            onCriado={(novo) => {
              setAlunos((prev) => [novo, ...prev])
              setModalNovo(false)
              abrirAluno(novo.id, 'creditos')
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {modalExcluir && (
          <ExcluirAlunoModal
            aluno={modalExcluir.aluno}
            aulasCount={modalExcluir.aulasCount}
            isPending={isPending}
            onCancelar={() => setModalExcluir(null)}
            onConfirmar={confirmarExcluir}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {examAluno && (
          <AgendarExameModal
            autoescola_id={autoescola_id}
            escola={escola}
            studentId={examAluno.id}
            studentName={examAluno.name}
            documentId={examAluno.document_id}
            onClose={() => setExamAlunoId(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {vendaAluno && pendingAdd[vendaAluno.id] && (
          <VenderCreditosModal
            autoescola_id={autoescola_id}
            aluno={vendaAluno}
            quantidades={pendingAdd[vendaAluno.id]!}
            onClose={() => setVendaAlunoId(null)}
            onSuccess={(atualizado) => {
              setAlunos((prev) => prev.map((a) => (a.id === atualizado.id ? atualizado : a)))
              cancelarPendente(atualizado.id)
              setVendaAlunoId(null)
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
