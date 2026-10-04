'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShieldCheck, FileText, Lock, Clock, CheckCircle2, ChevronRight, X, ArrowDown,
  Loader2, AlertCircle, LogOut, Car, BookOpenCheck,
} from 'lucide-react'
import { ThemeToggle } from '@/components/ThemeToggle'
import { TermosDocumento } from '@/components/TermosDocumento'
import { aceitarTermos } from '../actions/termos'
import { DOCUMENTOS, documentosDaVersao, minutosDeLeitura, type TermosVersao, type TipoDocumento } from '@/lib/termos'

interface Props {
  escola: string
  autoescolaNome: string
  logoUrl: string | null
  studentName: string
  termos: Pick<TermosVersao, 'id' | 'versao' | 'termos_uso' | 'politica_privacidade' | 'created_at'>
  onLogout: () => Promise<void>
}

const ICONES: Record<TipoDocumento, typeof FileText> = {
  termos_uso: FileText,
  politica_privacidade: Lock,
}

const DESCRICOES: Record<TipoDocumento, string> = {
  termos_uso: 'Regras de uso do app: agendamentos, créditos, cancelamentos e responsabilidades.',
  politica_privacidade: 'Quais dados seus são coletados, para quê, por quanto tempo e quais são seus direitos (LGPD).',
}

function formatarData(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

// ─── Leitor em tela cheia ──────────────────────────────────────────────────

function LeitorDocumento({
  tipo, texto, versao, publicadoEm, jaLido, temProximo, onConcluir, onFechar,
}: {
  tipo: TipoDocumento
  texto: string
  versao: number
  publicadoEm: string
  jaLido: boolean
  temProximo: boolean
  onConcluir: () => void
  onFechar: () => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [progresso, setProgresso] = useState(0)
  const [chegouAoFim, setChegouAoFim] = useState(jaLido)
  const Icone = ICONES[tipo]

  const medir = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const rolavel = el.scrollHeight - el.clientHeight
    // Margem de 24px: alguns navegadores móveis não chegam no último pixel.
    const pct = rolavel <= 24 ? 1 : Math.min(1, el.scrollTop / (rolavel - 24))
    setProgresso(pct)
    if (pct >= 1) setChegouAoFim(true)
  }, [])

  useEffect(() => {
    medir()
    const el = scrollRef.current
    if (!el) return
    const ro = new ResizeObserver(medir)
    ro.observe(el)
    if (el.firstElementChild) ro.observe(el.firstElementChild)
    return () => ro.disconnect()
  }, [medir])

  useEffect(() => {
    const anterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onFechar() }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = anterior
      window.removeEventListener('keydown', onKey)
    }
  }, [onFechar])

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-stretch sm:items-center justify-center sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-hidden />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="leitor-titulo"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        className="relative flex flex-col w-full sm:max-w-3xl h-[100dvh] sm:h-[88dvh] bg-[--p-bg-card] sm:rounded-2xl sm:border sm:border-[--p-border] shadow-2xl overflow-hidden"
      >
        {/* Cabeçalho */}
        <div className="shrink-0 border-b border-[--p-border] pt-[env(safe-area-inset-top)]">
          <div className="flex items-center gap-3 px-4 sm:px-6 py-3.5">
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 flex items-center justify-center shrink-0">
              <Icone className="w-[18px] h-[18px] text-[--p-accent]" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 id="leitor-titulo" className="text-base font-bold text-[--p-text-1] truncate">{DOCUMENTOS[tipo].titulo}</h2>
              <p className="text-[11px] text-[--p-text-3] truncate">
                Versão {versao} · {formatarData(publicadoEm)} · ~{minutosDeLeitura(texto)} min
              </p>
            </div>
            <button
              type="button"
              onClick={onFechar}
              aria-label="Fechar"
              className="p-2 -mr-1 rounded-xl text-[--p-text-3] hover:text-[--p-text-1] hover:bg-[--p-hover] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          {/* Progresso de leitura */}
          <div className="h-1 bg-[--p-border]/60">
            <motion.div
              className="h-full bg-[--p-accent]"
              animate={{ width: `${Math.round(progresso * 100)}%` }}
              transition={{ duration: 0.15, ease: 'linear' }}
            />
          </div>
        </div>

        {/* Texto */}
        <div
          ref={scrollRef}
          onScroll={medir}
          className="flex-1 overflow-y-auto overscroll-contain"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div className="px-5 sm:px-10 py-6 sm:py-8 max-w-[68ch] mx-auto">
            <TermosDocumento texto={texto} />
            <div className="mt-10 mb-2 flex items-center gap-3 text-[--p-text-3]">
              <div className="h-px flex-1 bg-[--p-border]" />
              <span className="text-[11px] uppercase tracking-wider font-semibold">Fim do documento</span>
              <div className="h-px flex-1 bg-[--p-border]" />
            </div>
          </div>
        </div>

        {/* Rodapé */}
        <div className="shrink-0 border-t border-[--p-border] bg-[--p-bg-card] px-4 sm:px-6 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <AnimatePresence mode="wait" initial={false}>
            {chegouAoFim ? (
              <motion.button
                key="concluir"
                type="button"
                onClick={onConcluir}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="w-full py-3 rounded-xl bg-[--p-accent] text-white text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.99] transition"
              >
                <CheckCircle2 className="w-4 h-4" />
                {temProximo ? 'Li até o fim · próximo documento' : 'Li até o fim'}
              </motion.button>
            ) : (
              <motion.div
                key="rolar"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-between gap-3 py-1.5"
              >
                <span className="flex items-center gap-2 text-xs sm:text-sm text-[--p-text-2]">
                  <motion.span animate={{ y: [0, 3, 0] }} transition={{ repeat: Infinity, duration: 1.4 }}>
                    <ArrowDown className="w-4 h-4 text-[--p-accent]" />
                  </motion.span>
                  Role até o final para confirmar a leitura
                </span>
                <span className="text-xs font-semibold tabular-nums text-[--p-accent] bg-sky-500/10 px-2 py-1 rounded-lg">
                  {Math.round(progresso * 100)}%
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Tela de aceite ────────────────────────────────────────────────────────

export function TermosAceiteGate({ escola, autoescolaNome, logoUrl, studentName, termos, onLogout }: Props) {
  const router = useRouter()
  const documentos = documentosDaVersao(termos)
  const [lidos, setLidos] = useState<TipoDocumento[]>([])
  const [aberto, setAberto] = useState<TipoDocumento | null>(null)
  const [aceito, setAceito] = useState(false)
  const [pending, setPending] = useState(false)
  const [saindo, setSaindo] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const todosLidos = documentos.every((d) => lidos.includes(d))
  const primeiroNome = studentName.split(' ')[0] || 'aluno'
  const nomesDocs = documentos.map((d) => DOCUMENTOS[d].titulo).join(' e a ')

  const fecharLeitor = useCallback(() => setAberto(null), [])

  function concluirLeitura(tipo: TipoDocumento) {
    const novos = lidos.includes(tipo) ? lidos : [...lidos, tipo]
    setLidos(novos)
    const proximo = documentos.find((d) => !novos.includes(d))
    setAberto(proximo ?? null)
  }

  async function handleAceitar() {
    if (!todosLidos || !aceito || pending) return
    setPending(true)
    setErro(null)
    const result = await aceitarTermos(escola, termos.id, lidos)
    if (!result.success) {
      setPending(false)
      setErro(result.error)
      if (result.desatualizado) router.refresh()
      return
    }
    router.refresh()
  }

  async function handleSair() {
    setSaindo(true)
    await onLogout()
  }

  return (
    <div className="min-h-[100dvh] bg-[--p-bg-base] flex flex-col">
      {/* Topo */}
      <header className="sticky top-0 z-10 bg-[--p-bg-base]/85 backdrop-blur border-b border-[--p-border] pt-[env(safe-area-inset-top)]">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3 px-4 h-14">
          <div className="flex items-center gap-2.5 min-w-0">
            {logoUrl ? (
              <img src={logoUrl} alt={autoescolaNome} className="h-7 w-7 object-contain rounded shrink-0" />
            ) : (
              <div className="w-7 h-7 rounded-lg bg-sky-500/20 flex items-center justify-center shrink-0">
                <Car className="w-3.5 h-3.5 text-[--p-accent]" />
              </div>
            )}
            <span className="text-sm font-semibold text-[--p-text-1] truncate">{autoescolaNome}</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 w-full max-w-2xl mx-auto px-4 pt-8 sm:pt-12 pb-40 sm:pb-12">
        {/* Apresentação */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-3"
        >
          <div className="mx-auto w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
            <ShieldCheck className="w-7 h-7 text-[--p-accent]" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[--p-text-1] tracking-tight">
            Antes de começar, {primeiroNome}
          </h1>
          <p className="text-sm sm:text-base text-[--p-text-2] leading-relaxed max-w-md mx-auto">
            Para usar o app da <span className="font-semibold text-[--p-text-1]">{autoescolaNome}</span>, leia e
            aceite {documentos.length > 1 ? 'os documentos abaixo' : 'o documento abaixo'}. Isso é pedido só uma vez.
          </p>
        </motion.div>

        {/* Passos */}
        <div className="mt-8 flex items-center justify-between text-xs text-[--p-text-3] mb-2.5 px-0.5">
          <span className="font-semibold uppercase tracking-wider">Leitura</span>
          <span className="tabular-nums font-medium">
            {lidos.filter((l) => documentos.includes(l)).length} de {documentos.length} lido{documentos.length > 1 ? 's' : ''}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-[--p-border] overflow-hidden mb-4">
          <motion.div
            className="h-full bg-[--p-accent] rounded-full"
            animate={{ width: `${(lidos.filter((l) => documentos.includes(l)).length / documentos.length) * 100}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>

        {/* Documentos */}
        <div className="space-y-3">
          {documentos.map((tipo, i) => {
            const Icone = ICONES[tipo]
            const lido = lidos.includes(tipo)
            return (
              <motion.button
                key={tipo}
                type="button"
                onClick={() => setAberto(tipo)}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 + i * 0.06 }}
                className={`group w-full text-left rounded-2xl border p-4 sm:p-5 flex items-start gap-3.5 sm:gap-4 transition-colors ${
                  lido
                    ? 'bg-emerald-500/[0.06] border-emerald-500/30'
                    : 'bg-[--p-bg-card] border-[--p-border] hover:border-sky-500/50'
                }`}
              >
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                    lido ? 'bg-emerald-500/15 text-emerald-500' : 'bg-sky-500/10 text-[--p-accent]'
                  }`}
                >
                  {lido ? <CheckCircle2 className="w-5 h-5" /> : <Icone className="w-5 h-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-[15px] font-semibold text-[--p-text-1]">{DOCUMENTOS[tipo].titulo}</span>
                    <span
                      className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-md ${
                        lido ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {lido ? 'Lido' : 'Pendente'}
                    </span>
                  </div>
                  <p className="text-xs sm:text-[13px] text-[--p-text-3] leading-relaxed mt-1">{DESCRICOES[tipo]}</p>
                  <div className="flex items-center gap-3 mt-2.5 text-[11px] text-[--p-text-3]">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> ~{minutosDeLeitura(termos[tipo])} min de leitura</span>
                    <span>Versão {termos.versao}</span>
                  </div>
                  <span className={`mt-3 inline-flex items-center gap-1 text-sm font-semibold ${lido ? 'text-emerald-600 dark:text-emerald-400' : 'text-[--p-accent]'}`}>
                    {lido ? 'Ler novamente' : 'Abrir e ler'}
                    <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </motion.button>
            )
          })}
        </div>

        {/* Aceite */}
        <label
          className={`mt-5 flex items-start gap-3 rounded-2xl border p-4 transition-colors ${
            todosLidos
              ? 'bg-[--p-bg-card] border-[--p-border] cursor-pointer hover:border-sky-500/50'
              : 'bg-[--p-bg-card]/50 border-dashed border-[--p-border] cursor-not-allowed'
          }`}
        >
          <input
            type="checkbox"
            checked={aceito}
            disabled={!todosLidos}
            onChange={(e) => setAceito(e.target.checked)}
            className="mt-0.5 w-5 h-5 shrink-0 rounded accent-[--p-accent] disabled:opacity-40"
          />
          <span className={`text-sm leading-relaxed ${todosLidos ? 'text-[--p-text-1]' : 'text-[--p-text-3]'}`}>
            Li e aceito {documentos.length > 1 ? 'os' : 'a'} <strong className="font-semibold">{nomesDocs}</strong> da {autoescolaNome}.
            {!todosLidos && (
              <span className="flex items-center gap-1.5 mt-1.5 text-xs text-[--p-text-3]">
                <BookOpenCheck className="w-3.5 h-3.5 shrink-0" />
                Abra e leia até o fim {documentos.length > 1 ? 'cada documento' : 'o documento'} para liberar.
              </span>
            )}
          </span>
        </label>

        <AnimatePresence>
          {erro && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-3 flex items-start gap-2.5 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl"
            >
              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
              <p className="text-sm text-red-400">{erro}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="mt-5 text-[11px] sm:text-xs text-[--p-text-3] text-center leading-relaxed max-w-md mx-auto">
          Seu aceite fica registrado com data, hora, versão do documento e dispositivo utilizado, conforme a LGPD
          (Lei 13.709/2018).
        </p>
      </main>

      {/* Ações: fixas no rodapé no celular, no fluxo no desktop */}
      <div className="fixed sm:static bottom-0 inset-x-0 z-20 bg-[--p-bg-base]/95 sm:bg-transparent backdrop-blur sm:backdrop-blur-none border-t sm:border-0 border-[--p-border] px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-12 sm:-mt-6">
        <div className="max-w-2xl mx-auto flex flex-col sm:flex-row-reverse sm:items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={handleAceitar}
            disabled={!todosLidos || !aceito || pending || saindo}
            className="w-full sm:w-auto sm:min-w-[220px] py-3 px-6 rounded-xl bg-[--p-accent] text-white text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.99] transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {pending ? <><Loader2 className="w-4 h-4 animate-spin" /> Registrando…</> : <>Aceitar e continuar <ChevronRight className="w-4 h-4" /></>}
          </button>
          <button
            type="button"
            onClick={handleSair}
            disabled={pending || saindo}
            className="w-full sm:w-auto py-2 px-4 rounded-xl text-xs sm:text-sm text-[--p-text-3] hover:text-[--p-text-1] flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
          >
            {saindo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
            Não concordo, sair
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {aberto && (
          <LeitorDocumento
            key={aberto}
            tipo={aberto}
            texto={termos[aberto]}
            versao={termos.versao}
            publicadoEm={termos.created_at}
            jaLido={lidos.includes(aberto)}
            temProximo={documentos.some((d) => d !== aberto && !lidos.includes(d))}
            onConcluir={() => concluirLeitura(aberto)}
            onFechar={fecharLeitor}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
