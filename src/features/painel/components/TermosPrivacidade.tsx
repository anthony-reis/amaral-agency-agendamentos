'use client'

import { useMemo, useState, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ScrollText, FileText, Lock, Eye, PencilLine, CheckCircle2, AlertTriangle, Users, History,
  Search, Download, ChevronLeft, ChevronRight, Smartphone, Monitor, Loader2, Info, Send,
} from 'lucide-react'
import { TermosDocumento } from '@/components/TermosDocumento'
import { publicarTermos, listarAceitesTermos, exportarAceitesTermos, type AceitesPagina } from '../actions/termos'
import { DOCUMENTOS, minutosDeLeitura, temConteudo, type TermosAceite, type TermosVersao, type TipoDocumento } from '@/lib/termos'

interface Props {
  escola: string
  vigente: TermosVersao | null
  initialAceites: AceitesPagina
  totalAlunos: number
  /** Perfil com "editar" em Sistema (sem isso, a tela fica só leitura). */
  podeEditar: boolean
}

const ICONES: Record<TipoDocumento, typeof FileText> = { termos_uso: FileText, politica_privacidade: Lock }

const PLACEHOLDERS: Record<TipoDocumento, string> = {
  termos_uso: `# 1. Aceitação dos termos
Ao usar o app da autoescola, você concorda com estas regras.

# 2. Agendamento de aulas
- As aulas são agendadas conforme os créditos disponíveis.
- Cancelamentos devem ser feitos com **antecedência mínima**.

# 3. Faltas
...`,
  politica_privacidade: `# 1. Quais dados coletamos
- Nome, CPF/CNH, telefone e e-mail.
- Histórico de aulas e pagamentos.

# 2. Para que usamos seus dados
...

# 3. Seus direitos (LGPD)
Você pode solicitar acesso, correção ou exclusão dos seus dados pelo contato da autoescola.`,
}

function formatarDataHora(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function formatDoc(doc: string) {
  return doc.length === 11 ? doc.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : doc
}

/** "Mozilla/5.0 (iPhone; ...) ... Safari" → "iPhone · Safari" */
function descreverDispositivo(ua: string | null): { texto: string; movel: boolean } {
  if (!ua) return { texto: '—', movel: false }
  const so =
    /iPhone/.test(ua) ? 'iPhone'
      : /iPad/.test(ua) ? 'iPad'
        : /Android/.test(ua) ? 'Android'
          : /Windows/.test(ua) ? 'Windows'
            : /Mac OS X|Macintosh/.test(ua) ? 'Mac'
              : /Linux/.test(ua) ? 'Linux'
                : 'Outro'
  const nav =
    /SamsungBrowser/.test(ua) ? 'Samsung Internet'
      : /Edg\//.test(ua) ? 'Edge'
        : /OPR\//.test(ua) ? 'Opera'
          : /CriOS|Chrome\//.test(ua) ? 'Chrome'
            : /FxiOS|Firefox\//.test(ua) ? 'Firefox'
              : /Safari\//.test(ua) ? 'Safari'
                : 'Navegador'
  return { texto: `${so} · ${nav}`, movel: ['iPhone', 'iPad', 'Android'].includes(so) }
}

const cardCls = 'bg-[--p-bg-card] border border-[--p-border] rounded-2xl'

export function TermosPrivacidade({ escola, vigente: initialVigente, initialAceites, totalAlunos, podeEditar }: Props) {
  const [vigente, setVigente] = useState(initialVigente)
  const [textos, setTextos] = useState<Record<TipoDocumento, string>>({
    termos_uso: initialVigente?.termos_uso ?? '',
    politica_privacidade: initialVigente?.politica_privacidade ?? '',
  })
  const [aba, setAba] = useState<TipoDocumento>('termos_uso')
  const [modo, setModo] = useState<'editar' | 'visualizar'>(podeEditar ? 'editar' : 'visualizar')
  const [confirmando, setConfirmando] = useState(false)
  const [isPublishing, startPublish] = useTransition()
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)

  const [aceites, setAceites] = useState(initialAceites)
  const [page, setPage] = useState(0)
  const [busca, setBusca] = useState('')
  const [isLoadingAceites, startAceites] = useTransition()
  const [exportando, setExportando] = useState(false)

  const ativo = temConteudo(vigente)
  const alterado =
    textos.termos_uso.trim() !== (vigente?.termos_uso ?? '') ||
    textos.politica_privacidade.trim() !== (vigente?.politica_privacidade ?? '')
  const texto = textos[aba]
  const palavras = useMemo(() => texto.trim().split(/\s+/).filter(Boolean).length, [texto])
  const proximaVersao = (vigente?.versao ?? 0) + 1
  const vaiDesligar = !textos.termos_uso.trim() && !textos.politica_privacidade.trim()
  const totalPaginas = Math.max(1, Math.ceil(aceites.total / aceites.porPagina))
  const pctAceite = totalAlunos > 0 ? Math.min(100, Math.round((aceites.total / totalAlunos) * 100)) : 0

  function handlePublicar() {
    setMsg(null)
    startPublish(async () => {
      const result = await publicarTermos(textos, escola)
      setConfirmando(false)
      if (!result.success) {
        setMsg({ tipo: 'erro', texto: result.error })
        return
      }
      setVigente(result.data)
      setTextos({ termos_uso: result.data.termos_uso, politica_privacidade: result.data.politica_privacidade })
      setMsg({
        tipo: 'ok',
        texto: temConteudo(result.data)
          ? `Versão ${result.data.versao} publicada. Novos alunos verão estes termos no primeiro acesso.`
          : `Termos removidos. Novos alunos não precisarão mais aceitar.`,
      })
    })
  }

  function carregarAceites(novaPagina: number, termo = busca) {
    startAceites(async () => {
      const r = await listarAceitesTermos(novaPagina, termo)
      setAceites(r)
      setPage(novaPagina)
    })
  }

  async function handleExportar() {
    setExportando(true)
    const linhas = await exportarAceitesTermos()
    setExportando(false)
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`
    const csv = [
      'Aluno,CPF/CNH,Versão,Aceito em,Dispositivo,IP,User agent',
      ...linhas.map((a) =>
        [a.student_name, a.student_document, String(a.versao), formatarDataHora(a.aceito_em),
          descreverDispositivo(a.user_agent).texto, a.ip ?? '', a.user_agent ?? ''].map(esc).join(',')
      ),
    ].join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `aceites-termos-${escola}-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-5xl space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center shrink-0">
          <ScrollText className="w-5 h-5 text-[--p-accent]" />
        </div>
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-[--p-text-1]">Termos e Privacidade</h1>
          <p className="text-sm text-[--p-text-3]">
            Termos de Uso e Política de Privacidade que o aluno lê e aceita no primeiro acesso ao app.
          </p>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className={`${cardCls} p-4`}>
          <p className="text-xs text-[--p-text-3] mb-1.5">Status</p>
          {ativo ? (
            <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-500">
              <CheckCircle2 className="w-4 h-4" /> Aceite obrigatório ativo
            </p>
          ) : (
            <p className="flex items-center gap-1.5 text-sm font-semibold text-amber-500">
              <AlertTriangle className="w-4 h-4" /> Não configurado
            </p>
          )}
          <p className="text-[11px] text-[--p-text-3] mt-1">
            {ativo ? 'Alunos aceitam antes de usar o app.' : 'Alunos entram sem aceitar termos.'}
          </p>
        </div>
        <div className={`${cardCls} p-4`}>
          <p className="text-xs text-[--p-text-3] mb-1.5">Versão vigente</p>
          <p className="text-sm font-semibold text-[--p-text-1]">{vigente ? `Versão ${vigente.versao}` : '—'}</p>
          <p className="text-[11px] text-[--p-text-3] mt-1 truncate">
            {vigente ? `${formatarDataHora(vigente.created_at)}${vigente.publicado_por ? ` · ${vigente.publicado_por}` : ''}` : 'Nada publicado ainda'}
          </p>
        </div>
        <div className={`${cardCls} p-4`}>
          <p className="text-xs text-[--p-text-3] mb-1.5">Aceites</p>
          <p className="text-sm font-semibold text-[--p-text-1]">
            {aceites.total} <span className="font-normal text-[--p-text-3]">de {totalAlunos} alunos</span>
          </p>
          <div className="mt-2 h-1.5 rounded-full bg-[--p-border] overflow-hidden">
            <div className="h-full bg-[--p-accent] rounded-full transition-all" style={{ width: `${pctAceite}%` }} />
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className={`${cardCls} overflow-hidden`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 pt-4 pb-3 border-b border-[--p-border]">
          <div className="flex gap-1 p-1 bg-[--p-bg-input] rounded-xl w-full sm:w-auto">
            {(Object.keys(DOCUMENTOS) as TipoDocumento[]).map((t) => {
              const Icone = ICONES[t]
              const preenchido = textos[t].trim().length > 0
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setAba(t)}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                    aba === t ? 'bg-[--p-bg-card] text-[--p-text-1] shadow-sm' : 'text-[--p-text-3] hover:text-[--p-text-1]'
                  }`}
                >
                  <Icone className="w-3.5 h-3.5" />
                  {DOCUMENTOS[t].titulo}
                  <span className={`w-1.5 h-1.5 rounded-full ${preenchido ? 'bg-emerald-500' : 'bg-[--p-border]'}`} />
                </button>
              )
            })}
          </div>
          {podeEditar && (
            <div className="flex gap-1 p-1 bg-[--p-bg-input] rounded-xl self-start sm:self-auto">
              {([['editar', PencilLine, 'Editar'], ['visualizar', Eye, 'Visualizar']] as const).map(([m, Icone, label]) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setModo(m)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    modo === m ? 'bg-[--p-bg-card] text-[--p-text-1] shadow-sm' : 'text-[--p-text-3] hover:text-[--p-text-1]'
                  }`}
                >
                  <Icone className="w-3.5 h-3.5" /> {label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="p-4">
          {modo === 'editar' && podeEditar ? (
            <div className="space-y-3">
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-sky-500/5 border border-sky-500/15 text-xs text-[--p-text-2] leading-relaxed">
                <Info className="w-3.5 h-3.5 text-[--p-accent] shrink-0 mt-0.5" />
                <span>
                  Formatação: <code className="font-semibold"># Título</code>, <code className="font-semibold">## Subtítulo</code>,{' '}
                  <code className="font-semibold">- item</code>, <code className="font-semibold">1. item</code>,{' '}
                  <code className="font-semibold">**negrito**</code>. Linha em branco separa parágrafos. Dá para colar do Word ou Google Docs.
                </span>
              </div>
              <textarea
                value={texto}
                onChange={(e) => { setTextos((p) => ({ ...p, [aba]: e.target.value })); setMsg(null) }}
                placeholder={PLACEHOLDERS[aba]}
                spellCheck
                className="w-full min-h-[360px] sm:min-h-[460px] px-4 py-3 text-sm leading-6 text-[--p-text-1] placeholder-[--p-text-3]/70 border border-[--p-border] rounded-xl bg-[--p-bg-input] outline-none resize-y focus:border-[--p-accent] focus:ring-2 focus:ring-sky-500/20 transition"
              />
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[--p-text-3]">
                <span>{texto.length.toLocaleString('pt-BR')} caracteres</span>
                <span>{palavras.toLocaleString('pt-BR')} palavras</span>
                {palavras > 0 && <span>~{minutosDeLeitura(texto)} min de leitura</span>}
                {!texto.trim() && <span className="text-amber-500">Vazio: este documento não será exibido ao aluno.</span>}
              </div>
            </div>
          ) : texto.trim() ? (
            <div className="rounded-xl border border-[--p-border] bg-[--p-bg-base] max-h-[560px] overflow-y-auto">
              <div className="px-5 sm:px-10 py-6 sm:py-8 max-w-[68ch] mx-auto">
                <p className="text-[11px] uppercase tracking-wider font-semibold text-[--p-text-3] mb-4">
                  Como o aluno vê · {DOCUMENTOS[aba].titulo}
                </p>
                <TermosDocumento texto={texto} />
              </div>
            </div>
          ) : (
            <div className="py-16 text-center text-sm text-[--p-text-3]">
              {DOCUMENTOS[aba].titulo} ainda não preenchido.
            </div>
          )}
        </div>

        {podeEditar && (
          <div className="px-4 py-3.5 border-t border-[--p-border] bg-[--p-bg-input]/40 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
            <p className="text-xs text-[--p-text-3] leading-relaxed sm:max-w-md">
              {alterado
                ? vaiDesligar
                  ? 'Publicar vazio desliga o aceite: novos alunos entram sem aceitar termos.'
                  : 'Alunos que ainda não aceitaram verão esta versão. Quem já aceitou não precisa aceitar de novo.'
                : 'Sem alterações em relação à versão vigente.'}
            </p>
            <div className="flex items-center gap-2 shrink-0">
              {confirmando ? (
                <>
                  <button type="button" onClick={() => setConfirmando(false)} disabled={isPublishing} className="px-3 py-2 text-sm text-[--p-text-2] hover:text-[--p-text-1]">
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handlePublicar}
                    disabled={isPublishing}
                    className={`px-4 py-2 rounded-xl text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-50 ${vaiDesligar ? 'bg-amber-500 hover:bg-amber-600' : 'bg-[--p-accent] hover:opacity-90'}`}
                  >
                    {isPublishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Confirmar versão {proximaVersao}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmando(true)}
                  disabled={!alterado}
                  className="px-4 py-2 rounded-xl bg-[--p-accent] text-white text-sm font-semibold flex items-center gap-2 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" /> Publicar versão {proximaVersao}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {msg && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`flex items-start gap-2.5 px-4 py-3 rounded-xl border text-sm ${
              msg.tipo === 'ok' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
            }`}
          >
            {msg.tipo === 'ok' ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />}
            {msg.texto}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Histórico de aceites */}
      <div className={`${cardCls} overflow-hidden`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3.5 border-b border-[--p-border]">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[--p-text-3]" />
            <h2 className="text-sm font-semibold text-[--p-text-1]">Histórico de aceites</h2>
            <span className="text-xs text-[--p-text-3]">({aceites.total})</span>
          </div>
          <div className="flex items-center gap-2">
            <form
              onSubmit={(e) => { e.preventDefault(); carregarAceites(0) }}
              className="relative flex-1 sm:w-64"
            >
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[--p-text-3]" />
              <input
                value={busca}
                onChange={(e) => {
                  setBusca(e.target.value)
                  if (!e.target.value) carregarAceites(0, '')
                }}
                placeholder="Nome ou CPF/CNH"
                className="w-full pl-8 pr-3 py-2 text-sm text-[--p-text-1] placeholder-[--p-text-3] border border-[--p-border] rounded-xl bg-[--p-bg-input] outline-none focus:border-[--p-accent]"
              />
            </form>
            <button
              type="button"
              onClick={handleExportar}
              disabled={exportando || aceites.total === 0}
              title="Exportar CSV"
              className="p-2 rounded-xl border border-[--p-border] text-[--p-text-2] hover:text-[--p-text-1] hover:bg-[--p-hover] disabled:opacity-40"
            >
              {exportando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className={`transition-opacity ${isLoadingAceites ? 'opacity-50' : ''}`}>
          {aceites.aceites.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="w-8 h-8 mx-auto text-[--p-text-3]/50 mb-2" />
              <p className="text-sm text-[--p-text-3]">
                {busca ? 'Nenhum aceite encontrado para a busca.' : 'Nenhum aluno aceitou os termos ainda.'}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop */}
              <table className="hidden md:table w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-[--p-text-3] border-b border-[--p-border]">
                    <th className="px-4 py-2.5 font-medium">Aluno</th>
                    <th className="px-4 py-2.5 font-medium">Versão</th>
                    <th className="px-4 py-2.5 font-medium">Aceito em</th>
                    <th className="px-4 py-2.5 font-medium">Dispositivo</th>
                    <th className="px-4 py-2.5 font-medium">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {aceites.aceites.map((a) => <LinhaAceite key={a.id} aceite={a} />)}
                </tbody>
              </table>
              {/* Mobile */}
              <ul className="md:hidden divide-y divide-[--p-border]">
                {aceites.aceites.map((a) => {
                  const disp = descreverDispositivo(a.user_agent)
                  return (
                    <li key={a.id} className="px-4 py-3 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-[--p-text-1] truncate">{a.student_name}</span>
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-sky-500/10 text-[--p-accent] shrink-0">v{a.versao}</span>
                      </div>
                      <p className="text-xs text-[--p-text-3]">{formatDoc(a.student_document)} · {formatarDataHora(a.aceito_em)}</p>
                      <p className="text-xs text-[--p-text-3] flex items-center gap-1">
                        {disp.movel ? <Smartphone className="w-3 h-3" /> : <Monitor className="w-3 h-3" />} {disp.texto}
                        {a.ip && <span className="ml-1">· {a.ip}</span>}
                      </p>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </div>

        {aceites.total > aceites.porPagina && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[--p-border] text-xs text-[--p-text-3]">
            <span>Página {page + 1} de {totalPaginas}</span>
            <div className="flex gap-1">
              <button type="button" onClick={() => carregarAceites(page - 1)} disabled={page === 0 || isLoadingAceites} className="p-1.5 rounded-lg hover:bg-[--p-hover] disabled:opacity-30">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => carregarAceites(page + 1)} disabled={page + 1 >= totalPaginas || isLoadingAceites} className="p-1.5 rounded-lg hover:bg-[--p-hover] disabled:opacity-30">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function LinhaAceite({ aceite: a }: { aceite: TermosAceite }) {
  const disp = descreverDispositivo(a.user_agent)
  return (
    <tr className="border-b border-[--p-border] last:border-0 hover:bg-[--p-hover]/50">
      <td className="px-4 py-2.5">
        <p className="font-medium text-[--p-text-1]">{a.student_name}</p>
        <p className="text-xs text-[--p-text-3]">{formatDoc(a.student_document)}</p>
      </td>
      <td className="px-4 py-2.5">
        <span className="text-xs font-semibold px-1.5 py-0.5 rounded-md bg-sky-500/10 text-[--p-accent]">v{a.versao}</span>
      </td>
      <td className="px-4 py-2.5 text-[--p-text-2] whitespace-nowrap">{formatarDataHora(a.aceito_em)}</td>
      <td className="px-4 py-2.5 text-[--p-text-2]">
        <span className="flex items-center gap-1.5" title={a.user_agent ?? ''}>
          {disp.movel ? <Smartphone className="w-3.5 h-3.5 text-[--p-text-3]" /> : <Monitor className="w-3.5 h-3.5 text-[--p-text-3]" />}
          {disp.texto}
        </span>
      </td>
      <td className="px-4 py-2.5 text-xs text-[--p-text-3] font-mono">{a.ip ?? '—'}</td>
    </tr>
  )
}
