'use client'

import { useEffect, useState, useTransition } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { AlertTriangle, UserCheck, Activity, CalendarClock, CalendarX2, FileSignature, LogIn, Send, FileText, Loader2, Paperclip, ScrollText, Upload, Check, CreditCard, FileCheck, IdCard, KeyRound, Minus, Plus, Trash2, MessageCircle, X } from 'lucide-react'
import { CAMBIOS, parseCambio } from '@/lib/cambio'
import { formatarPrecoCentavos, type PedidoLojaStatus } from '@/lib/loja-types'
import { METODO_LABEL, STATUS_BADGE, STATUS_LABEL, formatarDataHoraCompleta } from '../vendasUi'
import { editarAluno, resetarSenhaAluno } from '../../actions/alunos'
import { getAulasFuturasAluno } from '../../actions/vinculoInstrutor'
import { agruparPorInstrutor, rotuloAulas, vinculoImpossivel, type AulaFutura } from '@/lib/vinculoInstrutor'
import { listarAtividadeAluno, type PaginaAtividadeAluno } from '../../actions/atividadeAluno'
import { anexarContratoAssinado, cancelarContrato, enviarContratoAluno, listarContratosAluno, type ContratosDoAluno } from '../../actions/contratos'
import { STATUS_CONTRATO_LABEL } from '@/lib/contratos'
import { enviarAnexoAluno, excluirAnexoAluno, getTermosAluno, listarAnexosAluno, listarPagamentosMpAluno, type AnexoAluno, type PagamentoMpAluno, type TermosAlunoStatus } from '../../actions/anexos'
import type { AlunoComCreditos } from '../../types'
import { CATS, creditoDaCat, formatDoc, iniciais, inputCls, linkWhatsapp, totalCreditos, type Cat } from './utils'

type AbaId = 'creditos' | 'dados' | 'documentos' | 'contrato' | 'atividade' | 'acesso'

interface Props {
  aluno: AlunoComCreditos | null
  abaInicial?: AbaId
  autoescola_id: string
  canEdit: boolean
  /** Pode usar "+" nos créditos (sem módulo vendas, ou perfil com Vendas editável). */
  podeAdicionar: boolean
  vendasAtivo: boolean
  examesAtivo: boolean
  loginSenhaAtivo: boolean
  /** Módulo "contratos": aba Contrato (enviar para assinar / anexar assinado). */
  contratosAtivo: boolean
  escola: string
  /** Situação do contrato mudou (selo na tabela). */
  onContratoStatus: (status: 'pendente' | 'assinado' | null) => void
  cambioAtivo: boolean
  /** Opção "vincular aluno ao instrutor" ligada: instrutores para escolher. null = opção desligada. */
  instrutoresVinculo: { id: string; name: string }[] | null
  /** Aulas futuras do aluno por instrutor (cabeçalho do painel). */
  resumoAulas?: { instrutor: string; qtd: number }[]
  pendente: Partial<Record<Cat, number>>
  ocupado: boolean
  onFechar: () => void
  /** Variação em edição na categoria (+4 / -4; 0 limpa). Só salva ao confirmar. */
  onDefinir: (cat: Cat, qtd: number) => void
  onDescartarPendente: () => void
  /** Salva as remoções e, com o módulo de vendas, abre o registro da venda das adições. */
  onConfirmarPendente: () => void
  onAgendarExame: () => void
  onExcluir: () => void
  /** Dados do aluno mudaram no servidor: a lista aplica o patch. */
  onAtualizado: (patch: Partial<AlunoComCreditos>) => void
}

function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-[--p-text-2] mb-1">{rotulo}</label>
      {children}
    </div>
  )
}

// ─── Aba: Créditos ───────────────────────────────────────────────────────────

function DeltaInput({ valor, onChange, disabled, label }: { valor: number; onChange: (n: number) => void; disabled: boolean; label: string }) {
  const fmt = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `${n}` : '')
  const [txt, setTxt] = useState(fmt(valor))
  useEffect(() => { setTxt(fmt(valor)) }, [valor])
  return (
    <input
      type="text"
      inputMode="numeric"
      placeholder="±0"
      value={txt}
      disabled={disabled}
      aria-label={label}
      onChange={(e) => {
        const v = e.target.value.replace(/[^0-9+-]/g, '')
        setTxt(v)
        if (v === '') onChange(0)
        else if (/^[+-]?\d+$/.test(v)) onChange(Number(v))
      }}
      onBlur={() => setTxt(fmt(valor))}
      className={`h-8 min-w-0 w-full px-1 rounded-lg bg-[--p-bg-card] border text-sm font-semibold text-center focus:outline-none disabled:opacity-40 ${
        valor > 0 ? 'border-emerald-500/50 text-emerald-500' : valor < 0 ? 'border-red-400/50 text-red-400' : 'border-[--p-border] text-[--p-text-1]'
      } placeholder:text-[--p-text-3] placeholder:font-normal`}
    />
  )
}

function AbaCreditos({ aluno, canEdit, podeAdicionar, vendasAtivo, pendente, ocupado, onDefinir, onDescartarPendente, onConfirmarPendente }:
  Pick<Props, 'canEdit' | 'podeAdicionar' | 'vendasAtivo' | 'pendente' | 'ocupado' | 'onDefinir' | 'onDescartarPendente' | 'onConfirmarPendente'> & { aluno: AlunoComCreditos }) {
  const valores = Object.values(pendente).map((n) => n ?? 0)
  const temPendente = valores.some((n) => n !== 0)
  const aAdicionar = valores.filter((n) => n > 0).reduce((s, n) => s + n, 0)
  const aRemover = -valores.filter((n) => n < 0).reduce((s, n) => s + n, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs text-[--p-text-3]">Créditos disponíveis</p>
          <p className="text-3xl font-bold text-[--p-text-1] leading-tight">{totalCreditos(aluno)}</p>
        </div>
        {!aluno.creditos && <span className="text-xs text-amber-500">Sem registro de créditos</span>}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {CATS.map((c) => {
          const val = creditoDaCat(aluno, c)
          const pend = pendente[c] ?? 0
          return (
            <div key={c} className="rounded-xl border border-[--p-border] bg-[--p-bg-input] p-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-[--p-text-3]">Cat. {c.toUpperCase()}</p>
              <p className={`text-2xl font-bold mt-0.5 ${val > 0 ? 'text-[--p-text-1]' : 'text-[--p-text-3]'}`}>
                {val}
                {pend !== 0 && <span className={`text-base ${pend > 0 ? 'text-emerald-500' : 'text-red-400'}`}> {pend > 0 ? `+${pend}` : pend}</span>}
              </p>
              {canEdit && (
                <div className="flex items-center gap-1 mt-2">
                  <button
                    onClick={() => onDefinir(c, pend - 1)}
                    disabled={ocupado || !aluno.creditos || val + pend <= 0}
                    className="h-8 w-8 shrink-0 flex items-center justify-center rounded-lg border border-[--p-border] text-red-400 hover:bg-red-500/10 disabled:opacity-30 transition-colors"
                    aria-label={`Diminuir Cat. ${c.toUpperCase()}`}
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <DeltaInput
                    valor={pend}
                    onChange={(n) => onDefinir(c, podeAdicionar ? n : Math.min(n, 0))}
                    disabled={ocupado || !aluno.creditos}
                    label={`Variação de créditos Cat. ${c.toUpperCase()}`}
                  />
                  {podeAdicionar && (
                    <button
                      onClick={() => onDefinir(c, pend + 1)}
                      disabled={ocupado || !aluno.creditos}
                      className="h-8 w-8 shrink-0 flex items-center justify-center rounded-lg border border-[--p-border] text-emerald-500 hover:bg-emerald-500/10 disabled:opacity-30 transition-colors"
                      aria-label={`Aumentar Cat. ${c.toUpperCase()}`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {temPendente && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 space-y-2.5">
          <p className="text-sm text-[--p-text-1]">
            {aAdicionar > 0 && <span className="font-semibold text-emerald-500">+{aAdicionar} a adicionar</span>}
            {aAdicionar > 0 && aRemover > 0 && ' · '}
            {aRemover > 0 && <span className="font-semibold text-red-400">−{aRemover} a remover</span>}
            <span className="text-[--p-text-2]">
              {vendasAtivo && aAdicionar > 0 ? ' — adicionar créditos é uma venda (valor, pagamento e comprovante no próximo passo).' : ' — nada é salvo até confirmar.'}
            </span>
          </p>
          <div className="flex gap-2">
            <button onClick={onConfirmarPendente} disabled={ocupado} className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-semibold rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 transition-colors">
              <Check className="w-4 h-4" /> {vendasAtivo && aAdicionar > 0 ? 'Registrar venda' : 'Salvar alterações'}
            </button>
            <button onClick={onDescartarPendente} disabled={ocupado} className="px-3 py-2 text-sm rounded-lg text-[--p-text-2] hover:bg-[--p-hover] transition-colors">
              Descartar
            </button>
          </div>
        </div>
      )}

      {canEdit && !temPendente && (
        <p className="text-xs text-[--p-text-3]">Use + e − ou digite a variação (ex.: +4 ou -4) em cada categoria e confirme para salvar.</p>
      )}
    </div>
  )
}

// ─── Instrutor responsável (vínculo) ─────────────────────────────────────────

function dataCurta(date: string) {
  const texto = new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

function BlocoInstrutor({ valor, onChange, instrutores, canEdit, aluno, autoescola_id }: {
  valor: string
  onChange: (id: string) => void
  instrutores: { id: string; name: string }[]
  canEdit: boolean
  aluno: AlunoComCreditos
  autoescola_id: string
}) {
  const [aulas, setAulas] = useState<AulaFutura[] | null>(null)

  useEffect(() => {
    let ativo = true
    setAulas(null)
    getAulasFuturasAluno(autoescola_id, aluno.id).then((r) => { if (ativo) setAulas(r.success ? r.data : []) })
    return () => { ativo = false }
  }, [autoescola_id, aluno.id])

  const grupos = agruparPorInstrutor(aulas ?? [])
  const bloqueado = vinculoImpossivel(grupos)
  const vinculado = instrutores.find((i) => i.id === aluno.instrutor_id)
  const comVinculado = vinculado ? grupos.find((g) => g.instrutor === vinculado.name)?.aulas.length ?? 0 : 0
  const outrosInstrutores = vinculado ? grupos.filter((g) => g.instrutor !== vinculado.name) : []
  // Sem vínculo e com aulas em mais de um instrutor: não dá para vincular.
  // Já vinculado nessa situação: só permite desvincular.
  const opcoes = bloqueado && vinculado ? instrutores.filter((i) => i.id === vinculado.id) : instrutores
  const desabilitado = !canEdit || (bloqueado && !vinculado)

  return (
    <section className="rounded-xl border border-[--p-border] bg-[--p-bg-input] p-3 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-medium text-[--p-text-2]">Instrutor responsável</span>
        {vinculado && aulas && (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-500">
            <UserCheck className="w-3 h-3" /> {vinculado.name} · {rotuloAulas(comVinculado)} agendada{comVinculado === 1 ? '' : 's'}
          </span>
        )}
      </div>

      <select value={valor} onChange={(e) => onChange(e.target.value)} disabled={desabilitado} className={`${inputCls} disabled:opacity-60`}>
        <option value="">Sem vínculo (agenda com qualquer instrutor)</option>
        {opcoes.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
      </select>

      {!aulas ? (
        <p className="text-xs text-[--p-text-3]">Carregando aulas agendadas…</p>
      ) : bloqueado ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 space-y-2">
          <p className="text-xs font-semibold text-amber-500 flex items-start gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
            {vinculado
              ? `Este aluno tem aulas agendadas com ${grupos.length} instrutores diferentes. Só é possível remover o vínculo.`
              : `Não é possível vincular: o aluno tem aulas agendadas com ${grupos.length} instrutores diferentes.`}
          </p>
          <ul className="space-y-1.5">
            {grupos.map((g) => (
              <li key={g.instrutor} className="text-xs">
                <p className="font-semibold text-[--p-text-1]">{g.instrutor} <span className="font-normal text-[--p-text-3]">· {rotuloAulas(g.aulas.length)}</span></p>
                <ul className="ml-3 text-[--p-text-2]">
                  {g.aulas.map((a) => (
                    <li key={a.id}>{dataCurta(a.date)} às {a.time_slot}{a.instructorCategory ? ` · ${a.instructorCategory}` : ''}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-[--p-text-3]">Remarque ou cancele as aulas até restar um só instrutor para poder vincular.</p>
        </div>
      ) : (
        <>
          {grupos.length === 1 && (
            <p className="text-xs text-[--p-text-2]">Aulas agendadas com <b>{grupos[0].instrutor}</b>: {grupos[0].aulas.length}.</p>
          )}
          {grupos.length === 0 && <p className="text-xs text-[--p-text-3]">Nenhuma aula agendada.</p>}
          {outrosInstrutores.length > 0 && (
            <p className="text-xs text-amber-500 flex items-start gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
              As aulas já agendadas são com {outrosInstrutores[0].instrutor} ({outrosInstrutores[0].aulas.length}), não com o instrutor vinculado.
            </p>
          )}
        </>
      )}
      <p className="text-xs text-[--p-text-3]">Com vínculo, o aluno só agenda e remarca com este instrutor.</p>
    </section>
  )
}

// ─── Aba: Dados ──────────────────────────────────────────────────────────────

function AbaDados({ aluno, autoescola_id, canEdit, cambioAtivo, instrutoresVinculo, onAtualizado }:
  Pick<Props, 'autoescola_id' | 'canEdit' | 'cambioAtivo' | 'instrutoresVinculo' | 'onAtualizado'> & { aluno: AlunoComCreditos }) {
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState({ name: aluno.name, phone: aluno.phone ?? '', email: aluno.email ?? '', cambio: aluno.cambio ?? '', instrutor_id: aluno.instrutor_id ?? '' })
  const [erro, setErro] = useState('')
  const [salvo, setSalvo] = useState(false)
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setSalvo(false)
    setForm((p) => ({ ...p, [k]: e.target.value }))
  }
  const alterado =
    form.name !== aluno.name || form.phone !== (aluno.phone ?? '') || form.email !== (aluno.email ?? '') ||
    (cambioAtivo && form.cambio !== (aluno.cambio ?? '')) ||
    (!!instrutoresVinculo && form.instrutor_id !== (aluno.instrutor_id ?? ''))

  function salvar(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    startTransition(async () => {
      const result = await editarAluno(aluno.id, {
        name: form.name,
        phone: form.phone,
        email: form.email,
        ...(cambioAtivo && { cambio: form.cambio }),
        ...(instrutoresVinculo && { instrutor_id: form.instrutor_id }),
      }, autoescola_id)
      if (!result.success) { setErro(result.error); return }
      onAtualizado({
        name: form.name,
        phone: form.phone || null,
        email: form.email || null,
        ...(cambioAtivo && { cambio: parseCambio(form.cambio) }),
        ...(instrutoresVinculo && { instrutor_id: form.instrutor_id || null }),
      })
      setSalvo(true)
    })
  }

  return (
    <form onSubmit={salvar} className="space-y-3">
      <Campo rotulo="Nome completo *">
        <input required value={form.name} onChange={set('name')} disabled={!canEdit} className={inputCls} />
      </Campo>
      <Campo rotulo="CPF/CNH">
        <input value={formatDoc(aluno.document_id)} disabled className={`${inputCls} font-mono opacity-70`} />
      </Campo>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Campo rotulo="Telefone">
          <input value={form.phone} onChange={set('phone')} disabled={!canEdit} className={inputCls} placeholder="(38) 99999-0000" />
        </Campo>
        <Campo rotulo="E-mail">
          <input type="email" value={form.email} onChange={set('email')} disabled={!canEdit} className={inputCls} placeholder="email@exemplo.com" />
        </Campo>
      </div>
      {cambioAtivo && (
        <Campo rotulo="Câmbio do carro">
          <select value={form.cambio} onChange={set('cambio')} disabled={!canEdit} className={inputCls}>
            <option value="">Sem restrição (vê todos os instrutores)</option>
            {CAMBIOS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </Campo>
      )}
      {instrutoresVinculo && (
        <BlocoInstrutor
          valor={form.instrutor_id}
          onChange={(id) => { setSalvo(false); setForm((p) => ({ ...p, instrutor_id: id })) }}
          instrutores={instrutoresVinculo}
          canEdit={canEdit}
          aluno={aluno}
          autoescola_id={autoescola_id}
        />
      )}
      <p className="text-xs text-[--p-text-3]">
        Cadastrado em {new Date(aluno.created_at).toLocaleDateString('pt-BR')}
        {aluno.registration_number ? ` · Matrícula ${aluno.registration_number}` : ''}
      </p>

      {erro && <p className="text-sm text-red-400">{erro}</p>}
      {canEdit && (
        <div className="flex items-center gap-3 pt-1">
          <button type="submit" disabled={isPending || !alterado} className="px-4 py-2 bg-[#0ea5e9] text-white text-sm font-semibold rounded-xl hover:bg-[#0284c7] disabled:opacity-40 transition-colors">
            {isPending ? 'Salvando…' : 'Salvar alterações'}
          </button>
          {salvo && !alterado && <span className="text-xs text-emerald-500 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Salvo</span>}
        </div>
      )}
    </form>
  )
}

// ─── Aba: Documentos (termos + anexos) ───────────────────────────────────────

function formatarTamanho(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatarDataHora(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

function AbaDocumentos({ aluno, autoescola_id, canEdit }: Pick<Props, 'autoescola_id' | 'canEdit'> & { aluno: AlunoComCreditos }) {
  const [anexos, setAnexos] = useState<AnexoAluno[] | null>(null)
  const [termos, setTermos] = useState<TermosAlunoStatus | null>(null)
  const [pagamentosMp, setPagamentosMp] = useState<PagamentoMpAluno[] | null>(null)
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [excluindoId, setExcluindoId] = useState<string | null>(null)

  useEffect(() => {
    let ativo = true
    setAnexos(null); setTermos(null); setPagamentosMp(null); setErro('')
    Promise.all([listarAnexosAluno(autoescola_id, aluno.id), getTermosAluno(autoescola_id, aluno.id), listarPagamentosMpAluno(autoescola_id, aluno.id)]).then(([a, t, m]) => {
      if (!ativo) return
      if (a.success) setAnexos(a.data); else setErro(a.error)
      if (t.success) setTermos(t.data)
      if (m.success) setPagamentosMp(m.data)
    })
    return () => { ativo = false }
  }, [autoescola_id, aluno.id])

  async function enviar(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0]
    e.target.value = ''
    if (!arquivo) return
    if (arquivo.size > 4 * 1024 * 1024) { setErro('O arquivo deve ter no máximo 4 MB.'); return }
    setErro(''); setEnviando(true)
    const fd = new FormData()
    fd.append('arquivo', arquivo)
    const r = await enviarAnexoAluno(autoescola_id, aluno.id, fd)
    setEnviando(false)
    if (!r.success) { setErro(r.error); return }
    setAnexos((prev) => [r.data, ...(prev ?? [])])
  }

  async function excluir(id: string) {
    setErro(''); setExcluindoId(id)
    const r = await excluirAnexoAluno(autoescola_id, id)
    setExcluindoId(null)
    if (!r.success) { setErro(r.error); return }
    setAnexos((prev) => (prev ?? []).filter((a) => a.id !== id))
  }

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-[--p-text-3]">Termos e privacidade</h4>
        <div className="rounded-xl border border-[--p-border] bg-[--p-bg-input] p-4">
          {!termos ? (
            <p className="text-sm text-[--p-text-3] flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Carregando…</p>
          ) : termos.status === 'aceito' ? (
            <div className="space-y-1">
              <p className="text-sm font-semibold text-emerald-500 flex items-center gap-2"><Check className="w-4 h-4" /> Leu e aceitou os termos</p>
              <p className="text-xs text-[--p-text-2]">
                Versão {termos.versao ?? '—'} · {termos.aceito_em ? formatarDataHora(termos.aceito_em) : ''}
                {termos.versaoVigente && termos.versao && termos.versaoVigente > termos.versao ? ` (vigente: versão ${termos.versaoVigente})` : ''}
              </p>
              {termos.ip && <p className="text-[11px] text-[--p-text-3]">IP {termos.ip}</p>}
              {termos.user_agent && <p className="text-[11px] text-[--p-text-3] break-all">{termos.user_agent}</p>}
            </div>
          ) : termos.status === 'pendente' ? (
            <p className="text-sm text-amber-500 flex items-center gap-2">
              <ScrollText className="w-4 h-4 shrink-0" /> Ainda não aceitou. O aceite é pedido no primeiro acesso ao app do aluno.
            </p>
          ) : (
            <p className="text-sm text-[--p-text-3]">A autoescola ainda não publicou termos, então não há aceite a registrar.</p>
          )}
        </div>
      </section>

      {pagamentosMp && pagamentosMp.length > 0 && (
        <section className="space-y-2">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-[--p-text-3]">Pagamentos pelo Mercado Pago</h4>
          <ul className="space-y-2">
            {pagamentosMp.map((p) => (
              <li key={p.id} className="rounded-xl border border-[--p-border] bg-[--p-bg-input] p-3 space-y-1.5 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-[--p-text-1] truncate">{p.produto}</p>
                    <p className="text-lg font-bold text-[--p-text-1]">{formatarPrecoCentavos(p.valor_centavos)}</p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-1 rounded-full border whitespace-nowrap ${STATUS_BADGE[p.status as PedidoLojaStatus]}`}>
                    {STATUS_LABEL[p.status as PedidoLojaStatus] ?? p.status}
                  </span>
                </div>
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5 text-xs">
                  <dt className="text-[--p-text-3]">Método</dt>
                  <dd className="text-[--p-text-1] text-right">{p.payment_method ? METODO_LABEL[p.payment_method] ?? p.payment_method : '—'}</dd>
                  <dt className="text-[--p-text-3]">Aprovado em</dt>
                  <dd className="text-[--p-text-1] text-right">{p.paid_at ? formatarDataHoraCompleta(p.paid_at) : '—'}</dd>
                  <dt className="text-[--p-text-3]">ID do pagamento</dt>
                  <dd className="text-[--p-text-1] text-right font-mono break-all">{p.mp_payment_id ?? '—'}</dd>
                  <dt className="text-[--p-text-3]">ID do pedido</dt>
                  <dd className="text-[--p-text-1] text-right font-mono">{p.id.slice(0, 8)}</dd>
                </dl>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-[--p-text-3]">Anexos</h4>
          {canEdit && (
            <label className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#0ea5e9] text-white hover:bg-[#0284c7] cursor-pointer transition-colors ${enviando ? 'opacity-60 pointer-events-none' : ''}`}>
              {enviando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              {enviando ? 'Enviando…' : 'Adicionar'}
              <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="sr-only" onChange={enviar} />
            </label>
          )}
        </div>

        {erro && <p className="text-sm text-red-400">{erro}</p>}

        {!anexos ? (
          !erro && <p className="text-sm text-[--p-text-3] flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Carregando…</p>
        ) : anexos.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[--p-border] py-8 text-center text-sm text-[--p-text-3]">
            <Paperclip className="w-6 h-6 mx-auto mb-2 opacity-60" />
            Nenhum anexo. Comprovantes de pagamento aparecem aqui.
            <p className="text-xs mt-1">PDF, JPG, PNG ou WebP · até 4 MB</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {anexos.map((a) => (
              <li key={a.id} className="flex items-center gap-3 rounded-xl border border-[--p-border] bg-[--p-bg-input] px-3 py-2.5">
                <FileText className="w-5 h-5 text-[--p-text-3] shrink-0" />
                <div className="min-w-0 flex-1">
                  {a.url ? (
                    <a href={a.url} target="_blank" rel="noopener noreferrer" className="block text-sm font-medium text-[--p-text-1] hover:text-[#0ea5e9] truncate">{a.nome}</a>
                  ) : (
                    <span className="block text-sm text-[--p-text-3] truncate">{a.nome} (indisponível)</span>
                  )}
                  <p className="text-[11px] text-[--p-text-3]">
                    {a.tipo === 'comprovante' && <span className="text-emerald-500 font-semibold">Comprovante de venda · </span>}
                    {formatarTamanho(a.tamanho)} · {formatarDataHora(a.created_at)}{a.enviado_por ? ` · ${a.enviado_por}` : ''}
                  </p>
                </div>
                {canEdit && a.tipo === 'documento' && (
                  <button
                    onClick={() => excluir(a.id)}
                    disabled={excluindoId === a.id}
                    className="p-1.5 rounded-lg text-[--p-text-3] hover:text-red-400 hover:bg-red-500/10 disabled:opacity-40"
                    aria-label={`Excluir ${a.nome}`}
                  >
                    {excluindoId === a.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

// ─── Aba: Contrato ───────────────────────────────────────────────────────────

function AbaContrato({ aluno, autoescola_id, escola, canEdit, onContratoStatus }:
  Pick<Props, 'autoescola_id' | 'escola' | 'canEdit' | 'onContratoStatus'> & { aluno: AlunoComCreditos }) {
  const [dados, setDados] = useState<ContratosDoAluno | null>(null)
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [dataPapel, setDataPapel] = useState('')

  async function carregar() {
    const r = await listarContratosAluno(autoescola_id, aluno.id)
    if (!r.success) { setErro(r.error); return }
    setDados(r.data)
    const ativo = r.data.contratos.find((c) => c.status === 'assinado') ?? r.data.contratos.find((c) => c.status === 'pendente')
    onContratoStatus(ativo ? (ativo.status as 'pendente' | 'assinado') : null)
  }

  useEffect(() => {
    setDados(null); setErro('')
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoescola_id, aluno.id])

  async function executar(fn: () => Promise<{ success: boolean; error?: string }>) {
    setErro(''); setOcupado(true)
    const r = await fn()
    setOcupado(false)
    if (!r.success) { setErro(r.error ?? 'Erro inesperado.'); return }
    await carregar()
  }

  async function anexar(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0]
    e.target.value = ''
    if (!arquivo) return
    if (arquivo.size > 4 * 1024 * 1024) { setErro('O arquivo deve ter no máximo 4 MB.'); return }
    const fd = new FormData()
    fd.append('arquivo', arquivo)
    if (dataPapel) fd.append('data_assinatura', dataPapel)
    await executar(() => anexarContratoAssinado(autoescola_id, aluno.id, fd))
  }

  if (!dados) {
    return erro
      ? <p className="text-sm text-red-400">{erro}</p>
      : <p className="text-sm text-[--p-text-3] flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Carregando…</p>
  }

  const ativo = dados.contratos.find((c) => c.status === 'assinado') ?? dados.contratos.find((c) => c.status === 'pendente')
  const dataHora = (iso: string) => new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

  return (
    <div className="space-y-4">
      {!ativo && (
        <div className="rounded-xl border border-[--p-border] bg-[--p-bg-input] p-4 space-y-4">
          <div>
            <p className="text-sm font-semibold text-[--p-text-1]">Contrato de prestação de serviço</p>
            <p className="text-xs text-[--p-text-3] mt-0.5">Este aluno ainda não tem contrato assinado.</p>
          </div>
          {canEdit ? (
            <div className="space-y-3">
              <button
                onClick={() => executar(() => enviarContratoAluno(autoescola_id, aluno.id))}
                disabled={ocupado || !dados.temModelo}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl bg-[#0ea5e9] text-white hover:bg-[#0284c7] disabled:opacity-50 transition-colors"
              >
                {ocupado ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Enviar para o aluno assinar no app
              </button>
              {!dados.temModelo && (
                <p className="text-xs text-amber-500">Publique o modelo em Sistema → Contrato para poder enviar.</p>
              )}

              <div className="pt-3 border-t border-[--p-border] space-y-2">
                <p className="text-xs font-medium text-[--p-text-2]">Ou anexe o contrato que o aluno já assinou na autoescola</p>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="text-xs text-[--p-text-3] flex items-center gap-2">
                    Data da assinatura
                    <input type="date" value={dataPapel} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setDataPapel(e.target.value)}
                      className="px-2 py-1.5 rounded-lg bg-[--p-bg-card] border border-[--p-border] text-xs text-[--p-text-1]" />
                  </label>
                  <label className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-[--p-border] text-[--p-text-1] hover:bg-[--p-hover] cursor-pointer ${ocupado ? 'opacity-50 pointer-events-none' : ''}`}>
                    <Upload className="w-3.5 h-3.5" /> Anexar contrato assinado
                    <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="sr-only" onChange={anexar} />
                  </label>
                </div>
                <p className="text-[11px] text-[--p-text-3]">PDF, JPG, PNG ou WebP · até 4 MB</p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-[--p-text-3]">Seu perfil não pode enviar nem anexar contratos.</p>
          )}
        </div>
      )}

      {ativo?.status === 'pendente' && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-3">
          <p className="text-sm font-semibold text-amber-500 flex items-center gap-2"><FileSignature className="w-4 h-4" /> {STATUS_CONTRATO_LABEL.pendente}</p>
          <p className="text-xs text-[--p-text-2]">
            Enviado em {dataHora(ativo.created_at)}{ativo.enviado_por ? ` por ${ativo.enviado_por}` : ''}. O aluno vê o contrato no menu “Contrato” do app dele e assina com o dedo, tirando uma foto.
          </p>
          {canEdit && (
            <button onClick={() => executar(() => cancelarContrato(autoescola_id, ativo.id))} disabled={ocupado}
              className="text-xs font-semibold text-red-400 hover:underline disabled:opacity-50">
              Cancelar envio
            </button>
          )}
        </div>
      )}

      {ativo?.status === 'assinado' && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-3">
          <p className="text-sm font-semibold text-emerald-500 flex items-center gap-2"><Check className="w-4 h-4" /> Contrato assinado</p>
          <p className="text-xs text-[--p-text-2]">
            {ativo.origem === 'digital' ? 'Assinado pelo app do aluno' : 'Assinado na autoescola (arquivo anexado)'}
            {ativo.assinado_em
              ? ` em ${ativo.origem === 'anexado'
                  ? new Date(ativo.assinado_em).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
                  : dataHora(ativo.assinado_em)}`
              : ''}.
          </p>
          {ativo.origem === 'digital' && (
            <div className="grid grid-cols-2 gap-2">
              <div className="h-20 rounded-lg bg-white border border-[--p-border] flex items-center justify-center overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {ativo.assinaturaUrl ? <img src={ativo.assinaturaUrl} alt="Assinatura" className="max-h-full max-w-full object-contain" /> : null}
              </div>
              <div className="h-20 rounded-lg bg-[--p-bg-input] border border-[--p-border] overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {ativo.fotoUrl ? <img src={ativo.fotoUrl} alt="Foto do aluno" className="h-full w-full object-cover" /> : null}
              </div>
            </div>
          )}
          <div className="flex flex-wrap gap-3 text-xs font-semibold">
            <a href={`/${escola}/painel/contratos/${ativo.id}`} target="_blank" rel="noopener noreferrer" className="text-[#0ea5e9] hover:underline">
              Ver contrato / imprimir
            </a>
            {ativo.origem === 'anexado' && ativo.anexoUrl && (
              <a href={ativo.anexoUrl} target="_blank" rel="noopener noreferrer" className="text-[#0ea5e9] hover:underline">Abrir arquivo</a>
            )}
            {ativo.origem === 'anexado' && canEdit && (
              <button onClick={() => executar(() => cancelarContrato(autoescola_id, ativo.id))} disabled={ocupado} className="text-red-400 hover:underline disabled:opacity-50">
                Remover (lançado por engano)
              </button>
            )}
          </div>
        </div>
      )}

      {erro && <p className="text-sm text-red-400">{erro}</p>}
    </div>
  )
}

// ─── Aba: Atividade (rastreio do aluno) ──────────────────────────────────────

const TIPO_ATIVIDADE: Record<string, { label: string; Icon: typeof Activity; cor: string }> = {
  aluno_acesso: { label: 'Acesso ao app', Icon: LogIn, cor: 'text-slate-400' },
  agendamento: { label: 'Agendamento', Icon: CalendarClock, cor: 'text-emerald-500' },
  reagendamento: { label: 'Remarcação', Icon: CalendarClock, cor: 'text-cyan-500' },
  cancelamento: { label: 'Cancelamento', Icon: CalendarX2, cor: 'text-red-500' },
  contrato: { label: 'Contrato', Icon: FileSignature, cor: 'text-violet-500' },
  termos: { label: 'Termos', Icon: FileText, cor: 'text-indigo-400' },
  venda: { label: 'Venda', Icon: Activity, cor: 'text-sky-500' },
  creditos: { label: 'Créditos', Icon: Activity, cor: 'text-amber-500' },
}

function AbaAtividade({ aluno, autoescola_id }: Pick<Props, 'autoescola_id'> & { aluno: AlunoComCreditos }) {
  const [dados, setDados] = useState<PaginaAtividadeAluno | null>(null)
  const [pagina, setPagina] = useState(1)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  // Trocou de aluno: volta para a primeira página
  useEffect(() => { setPagina(1); setDados(null) }, [aluno.id])

  useEffect(() => {
    let ativo = true
    setCarregando(true); setErro('')
    listarAtividadeAluno(autoescola_id, aluno.id, pagina).then((r) => {
      if (!ativo) return
      setCarregando(false)
      if (r.success) setDados(r.data); else setErro(r.error)
    })
    return () => { ativo = false }
  }, [autoescola_id, aluno.id, pagina])

  if (erro) return <p className="text-sm text-red-400">{erro}</p>
  if (!dados) return <p className="text-sm text-[--p-text-3] flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Carregando…</p>
  const eventos = dados.eventos
  if (dados.total === 0) return <p className="text-sm text-[--p-text-3]">Nenhuma atividade registrada ainda.</p>

  return (
    <div className="space-y-3">
      <p className="text-xs text-[--p-text-3]">Ações do aluno no app (acessos, agendamentos, remarcações, contrato, termos) e as aulas já marcadas.</p>
      <ol className={`space-y-3 transition-opacity ${carregando ? 'opacity-50' : ''}`}>
        {eventos.map((e) => {
          const cfg = TIPO_ATIVIDADE[e.tipo] ?? { label: e.tipo, Icon: Activity, cor: 'text-[--p-text-3]' }
          return (
            <li key={e.id} className="flex gap-3">
              <div className={`mt-0.5 w-7 h-7 rounded-full bg-[--p-bg-input] border border-[--p-border] flex items-center justify-center shrink-0 ${cfg.cor}`}>
                <cfg.Icon className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-[--p-text-1] break-words">{e.texto}</p>
                <p className="text-[11px] text-[--p-text-3]">
                  {cfg.label} · {new Date(e.quando).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}{e.autor ? ` · ${e.autor}` : ''}
                </p>
              </div>
            </li>
          )
        })}
      </ol>
      {dados.totalPaginas > 1 && (
        <div className="flex items-center justify-between pt-2 border-t border-[--p-border]">
          <button
            type="button"
            onClick={() => setPagina((p) => Math.max(1, p - 1))}
            disabled={carregando || dados.pagina <= 1}
            className="px-3 py-1.5 text-xs rounded-lg border border-[--p-border] text-[--p-text-2] hover:bg-[--p-hover] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ← Mais recentes
          </button>
          <span className="text-[11px] text-[--p-text-3]">Página {dados.pagina} de {dados.totalPaginas} · {dados.total} registros</span>
          <button
            type="button"
            onClick={() => setPagina((p) => Math.min(dados.totalPaginas, p + 1))}
            disabled={carregando || dados.pagina >= dados.totalPaginas}
            className="px-3 py-1.5 text-xs rounded-lg border border-[--p-border] text-[--p-text-2] hover:bg-[--p-hover] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Mais antigos →
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Aba: Acesso ─────────────────────────────────────────────────────────────

function AbaAcesso({ aluno, autoescola_id, canEdit, onAtualizado }:
  Pick<Props, 'autoescola_id' | 'canEdit' | 'onAtualizado'> & { aluno: AlunoComCreditos }) {
  const [isPending, startTransition] = useTransition()
  const [confirmar, setConfirmar] = useState(false)
  const [ok, setOk] = useState(false)
  const [erro, setErro] = useState('')

  function resetar() {
    setErro('')
    startTransition(async () => {
      const result = await resetarSenhaAluno(aluno.id, autoescola_id)
      setConfirmar(false)
      if (!result.success) { setErro(result.error); return }
      setOk(true)
      onAtualizado({ tem_senha: false })
    })
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-[--p-border] bg-[--p-bg-input] p-4 space-y-3">
        <div className="flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-[--p-text-3]" />
          <span className="text-sm font-medium text-[--p-text-1]">Senha do app do aluno</span>
          <span className={`ml-auto text-[11px] font-semibold px-2 py-0.5 rounded-full ${aluno.tem_senha ? 'bg-emerald-500/10 text-emerald-500' : 'bg-[--p-hover] text-[--p-text-3]'}`}>
            {aluno.tem_senha ? 'Senha criada' : 'Sem senha'}
          </span>
        </div>

        {ok ? (
          <p className="text-xs text-emerald-500">Senha resetada. No próximo acesso, o aluno informa o CPF e cria uma nova senha.</p>
        ) : !aluno.tem_senha ? (
          <p className="text-xs text-[--p-text-3]">O aluno ainda não criou senha — ele cria no próximo acesso, após informar o CPF.</p>
        ) : !canEdit ? null : confirmar ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-[--p-text-2]">Apagar a senha atual do aluno?</span>
            <button type="button" onClick={resetar} disabled={isPending} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50">
              {isPending ? 'Resetando…' : 'Sim, resetar'}
            </button>
            <button type="button" onClick={() => setConfirmar(false)} className="px-3 py-1.5 text-xs text-[--p-text-2] hover:text-[--p-text-1]">Cancelar</button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-[--p-text-3]">Esqueceu a senha? Resete e ele cria uma nova no próximo acesso.</p>
            <button type="button" onClick={() => setConfirmar(true)} className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-amber-500/40 text-amber-500 hover:bg-amber-500/10">
              Resetar senha
            </button>
          </div>
        )}
        {erro && <p className="text-xs text-red-400">{erro}</p>}
      </div>
    </div>
  )
}

// ─── Drawer ──────────────────────────────────────────────────────────────────

export function AlunoDrawer(props: Props) {
  const { aluno, abaInicial = 'creditos', canEdit, examesAtivo, loginSenhaAtivo, contratosAtivo, onFechar } = props
  const instrutorVinculadoNome = props.instrutoresVinculo?.find((i) => i.id === aluno?.instrutor_id)?.name ?? null
  const aulasComVinculado = props.resumoAulas?.find((r) => r.instrutor === instrutorVinculadoNome)?.qtd ?? 0
  const reduzir = useReducedMotion()
  const [aba, setAba] = useState<AbaId>('creditos')

  // Cada aluno aberto começa na aba de créditos
  useEffect(() => { setAba(abaInicial) }, [aluno?.id, abaInicial])

  useEffect(() => {
    if (!aluno) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onFechar() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [aluno, onFechar])

  // Novas funções do aluno entram aqui como mais uma aba.
  const abas: { id: AbaId; label: string; Icon: typeof CreditCard }[] = [
    { id: 'creditos', label: 'Créditos', Icon: CreditCard },
    { id: 'dados', label: 'Dados', Icon: IdCard },
    { id: 'documentos', label: 'Documentos', Icon: Paperclip },
    { id: 'atividade', label: 'Atividade', Icon: Activity },
    ...(contratosAtivo ? [{ id: 'contrato' as const, label: 'Contrato', Icon: FileSignature }] : []),
    ...(loginSenhaAtivo ? [{ id: 'acesso' as const, label: 'Acesso', Icon: KeyRound }] : []),
  ]

  return (
    <AnimatePresence>
      {aluno && (
        <>
          <motion.div
            key="fundo"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onFechar}
          />
          <motion.aside
            key="painel"
            role="dialog"
            aria-modal="true"
            aria-label={`Aluno ${aluno.name}`}
            initial={reduzir ? { opacity: 0 } : { x: '100%' }}
            animate={reduzir ? { opacity: 1 } : { x: 0 }}
            exit={reduzir ? { opacity: 0 } : { x: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 40 }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-xl bg-[--p-bg-card] border-l border-[--p-border] shadow-2xl z-50 flex flex-col"
          >
            <header className="px-5 pt-4 pb-3 border-b border-[--p-border] space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-full bg-[#0ea5e9]/15 text-[#0ea5e9] flex items-center justify-center font-bold text-sm shrink-0">
                  {iniciais(aluno.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-[--p-text-1] truncate">{aluno.name}</h3>
                  <p className="text-xs text-[--p-text-3] font-mono">{formatDoc(aluno.document_id)}</p>
                  {instrutorVinculadoNome && (
                    <p className="text-xs text-violet-500 font-medium mt-0.5 flex items-center gap-1">
                      <UserCheck className="w-3 h-3" /> Instrutor: {instrutorVinculadoNome} · {rotuloAulas(aulasComVinculado)}
                    </p>
                  )}
                </div>
                <button onClick={onFechar} className="p-1 text-[--p-text-3] hover:text-[--p-text-1]" aria-label="Fechar">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {aluno.phone && (
                  <a
                    href={linkWhatsapp(aluno.phone)} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[--p-border] text-emerald-500 hover:bg-emerald-500/10 transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                  </a>
                )}
                {canEdit && examesAtivo && (
                  <button onClick={props.onAgendarExame} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[--p-border] text-[--p-text-2] hover:text-amber-500 hover:bg-amber-500/10 transition-colors">
                    <FileCheck className="w-3.5 h-3.5" /> Agendar exame
                  </button>
                )}
                {canEdit && (
                  <button onClick={props.onExcluir} disabled={props.ocupado} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[--p-border] text-[--p-text-3] hover:text-red-400 hover:bg-red-500/10 transition-colors ml-auto disabled:opacity-40">
                    <Trash2 className="w-3.5 h-3.5" /> Excluir
                  </button>
                )}
              </div>

              <nav className="flex -mb-3 overflow-x-auto [scrollbar-width:none]" role="tablist">
                {abas.map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    role="tab"
                    aria-selected={aba === id}
                    onClick={() => setAba(id)}
                    className={`flex items-center gap-1 px-2 py-2 text-[13px] font-medium border-b-2 whitespace-nowrap shrink-0 transition-colors ${
                      aba === id ? 'border-[#0ea5e9] text-[--p-text-1]' : 'border-transparent text-[--p-text-3] hover:text-[--p-text-2]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" /> {label}
                  </button>
                ))}
              </nav>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              {aba === 'creditos' && <AbaCreditos {...props} aluno={aluno} />}
              {aba === 'dados' && <AbaDados key={aluno.id} {...props} aluno={aluno} />}
              {aba === 'documentos' && <AbaDocumentos key={aluno.id} {...props} aluno={aluno} />}
              {aba === 'atividade' && <AbaAtividade key={aluno.id} {...props} aluno={aluno} />}
              {aba === 'contrato' && contratosAtivo && <AbaContrato key={aluno.id} {...props} aluno={aluno} />}
              {aba === 'acesso' && loginSenhaAtivo && <AbaAcesso {...props} aluno={aluno} />}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
