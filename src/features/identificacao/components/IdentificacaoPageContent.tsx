'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CreditCard, KeyRound, Info, AlertCircle, Loader2, CheckCircle2,
  ArrowRight, ShieldCheck, Zap, ChevronLeft,
} from 'lucide-react'
import { verificarCpf, confirmarSenha } from '../actions/autenticarAluno'
import { PlanosPreview } from './PlanosPreview'
import { AlunoDashboard } from '@/features/aluno/components/AlunoDashboard'
import type { Student, StudentCredits } from '../types'
import type { Produto } from '@/lib/loja-types'

interface Props {
  escola: string
  autoescolaId: string
  produtos: Produto[]
  lojaAtiva: boolean
  initialIdentified: boolean
  initialStudent: { name: string; document_id: string } | null
  initialCredits: StudentCredits | null
}

type Step = 'cpf' | 'senha' | 'ok'

function Stepper({ step }: { step: Step }) {
  const items: { key: Step; label: string; icon: typeof CreditCard }[] = [
    { key: 'cpf', label: 'CPF/CNH', icon: CreditCard },
    { key: 'senha', label: 'Senha', icon: KeyRound },
    { key: 'ok', label: 'Pronto', icon: CheckCircle2 },
  ]
  const order: Step[] = ['cpf', 'senha', 'ok']
  const currentIdx = order.indexOf(step)

  return (
    <div className="flex items-center gap-2 w-full max-w-[280px] mx-auto">
      {items.map((item, i) => {
        const active = i === currentIdx
        const done = i < currentIdx
        const Icon = item.icon
        return (
          <div key={item.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <motion.div
                animate={{
                  scale: active ? 1.08 : 1,
                }}
                className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${
                  done
                    ? 'bg-[--p-accent] border-[--p-accent] text-white'
                    : active
                      ? 'border-[--p-accent] text-[--p-accent] bg-[--p-accent]/10'
                      : 'border-[--p-border] text-[--p-text-3]'
                }`}
              >
                {done ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-3.5 h-3.5" />}
              </motion.div>
              <span className={`text-[10px] font-medium ${active ? 'text-[--p-accent]' : 'text-[--p-text-3]'}`}>
                {item.label}
              </span>
            </div>
            {i < items.length - 1 && (
              <div className="flex-1 h-[2px] mx-1 -mt-4 rounded-full overflow-hidden bg-[--p-border]">
                <motion.div
                  className="h-full bg-[--p-accent]"
                  initial={false}
                  animate={{ width: done ? '100%' : '0%' }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function CreditosResumo({ credits }: { credits: StudentCredits }) {
  const semCreditos = credits.aulas_cat_a === 0 && credits.aulas_cat_b === 0
  return (
    <div className="p-4 bg-[--p-accent]/5 rounded-xl border border-[--p-accent]/20 space-y-2.5">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4 text-[--p-accent]" />
        <span className="text-sm font-semibold text-[--p-text-1]">Créditos disponíveis</span>
      </div>
      {credits.aulas_cat_b > 0 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-[--p-text-2]">Carro</span>
          <span className="font-semibold text-[--p-accent] bg-[--p-accent]/10 px-2 py-0.5 rounded-md">
            {credits.aulas_cat_b} créditos
          </span>
        </div>
      )}
      {credits.aulas_cat_a > 0 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-[--p-text-2]">Moto</span>
          <span className="font-semibold text-[--p-accent] bg-[--p-accent]/10 px-2 py-0.5 rounded-md">
            {credits.aulas_cat_a} créditos
          </span>
        </div>
      )}
      {semCreditos && (
        <p className="text-xs text-[--p-text-3] italic">
          Nenhum crédito disponível ainda — dá pra resolver isso com um plano aqui embaixo. 👇
        </p>
      )}
    </div>
  )
}

const inputCls =
  'w-full px-3.5 py-2.5 text-sm text-[--p-text-1] placeholder-[--p-text-3] border border-[--p-border] rounded-xl bg-[--p-bg-input] outline-none transition-all focus:border-[--p-accent] focus:ring-2 focus:ring-[--p-accent]/20 disabled:opacity-60'

export function IdentificacaoPageContent({
  escola, autoescolaId, produtos, lojaAtiva,
  initialIdentified, initialStudent, initialCredits,
}: Props) {
  const router = useRouter()

  const [step, setStep] = useState<Step>(initialIdentified ? 'ok' : 'cpf')
  const [cpf, setCpf] = useState('')
  const [cpfError, setCpfError] = useState<string | null>(null)
  const [cpfPending, setCpfPending] = useState(false)

  const [student, setStudent] = useState<Student | null>(null)
  const [credits, setCredits] = useState<StudentCredits | null>(initialCredits)
  const [precisaCriarSenha, setPrecisaCriarSenha] = useState(false)

  const [senha, setSenha] = useState('')
  const [senhaError, setSenhaError] = useState<string | null>(null)
  const [senhaPending, setSenhaPending] = useState(false)

  const nomeExibicao = student?.name ?? initialStudent?.name ?? ''
  const documentId = student?.document_id ?? initialStudent?.document_id ?? ''

  function handleCpfChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 18)
    setCpf(raw)
    if (cpfError) setCpfError(null)
  }

  async function handleCpfSubmit(e: React.FormEvent) {
    e.preventDefault()
    const isValid = cpf.length === 11 || cpf.length === 18
    if (!isValid || cpfPending) return

    setCpfPending(true)
    setCpfError(null)
    const result = await verificarCpf(cpf, autoescolaId)
    setCpfPending(false)

    if (!result.success) {
      setCpfError(result.error)
      return
    }
    setStudent(result.student)
    setCredits(result.credits)
    setPrecisaCriarSenha(result.precisaCriarSenha)
    setStep('senha')
  }

  async function handleSenhaSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!student || senhaPending || senha.trim().length < 4) return

    setSenhaPending(true)
    setSenhaError(null)
    const result = await confirmarSenha(student.id, autoescolaId, senha)
    setSenhaPending(false)

    if (!result.success) {
      setSenhaError(result.error)
      return
    }
    setStep('ok')
    router.refresh()
  }

  function voltarParaCpf() {
    setStep('cpf')
    setSenha('')
    setSenhaError(null)
  }

  const identificado = step === 'ok'

  if (identificado && credits && documentId) {
    return (
      <AlunoDashboard
        escola={escola}
        autoescolaId={autoescolaId}
        documentId={documentId}
        studentName={nomeExibicao}
        credits={credits}
        produtos={produtos}
        lojaAtiva={lojaAtiva}
      />
    )
  }

  return (
    <div className="w-full flex flex-col items-center gap-8">
      <div className="w-full max-w-sm">
        <Stepper step={step} />
      </div>

      <div className="w-full max-w-sm">
        <AnimatePresence mode="wait">
          {step === 'cpf' && (
            <motion.form
              key="cpf"
              onSubmit={handleCpfSubmit}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.18 }}
              className="space-y-3"
              noValidate
            >
              <div className="bg-[--p-bg-card] rounded-2xl border border-[--p-border] overflow-hidden">
                <div className="p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-[--p-text-3] shrink-0" strokeWidth={1.5} />
                    <label htmlFor="document_id" className="text-sm font-semibold text-[--p-text-2] tracking-wide">
                      CPF ou CNH
                    </label>
                  </div>
                  <input
                    id="document_id"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    autoFocus
                    placeholder="Digite seu CPF ou CNH"
                    value={cpf}
                    onChange={handleCpfChange}
                    disabled={cpfPending}
                    className={inputCls}
                  />
                  <div className="flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-[--p-text-3] shrink-0" strokeWidth={2} />
                    <span className="text-xs text-[--p-text-3]">Apenas números, sem pontos ou traços</span>
                  </div>
                  <motion.button
                    type="submit"
                    disabled={!(cpf.length === 11 || cpf.length === 18) || cpfPending}
                    whileHover={{ scale: 1.015 }}
                    whileTap={{ scale: 0.985 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 mt-1 bg-[--p-accent] text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {cpfPending ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Verificando...</>
                    ) : (
                      <>Continuar <ArrowRight className="w-4 h-4" /></>
                    )}
                  </motion.button>
                </div>
              </div>

              <AnimatePresence mode="wait">
                {cpfError && (
                  <motion.div
                    key={cpfError}
                    className="flex items-start gap-2.5 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" strokeWidth={2} />
                    <p className="text-sm text-red-400">{cpfError}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-start gap-3 px-4 py-3.5 bg-[--p-bg-card] border border-[--p-border] rounded-xl">
                <Info className="w-4 h-4 text-[--p-accent] mt-0.5 shrink-0" strokeWidth={2} />
                <p className="text-xs text-[--p-text-3] leading-relaxed">
                  <span className="text-[--p-accent] font-semibold">Importante: </span>
                  Você só pode agendar nas categorias onde possui créditos disponíveis.
                </p>
              </div>
            </motion.form>
          )}

          {step === 'senha' && (
            <motion.form
              key="senha"
              onSubmit={handleSenhaSubmit}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.18 }}
              className="space-y-3"
              noValidate
            >
              {credits && <CreditosResumo credits={credits} />}

              <div className="bg-[--p-bg-card] rounded-2xl border border-[--p-border] overflow-hidden">
                <div className="p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-[--p-text-3] shrink-0" strokeWidth={1.5} />
                    <label htmlFor="senha" className="text-sm font-semibold text-[--p-text-2] tracking-wide">
                      {precisaCriarSenha ? 'Crie sua senha' : 'Digite sua senha'}
                    </label>
                  </div>
                  <p className="text-xs text-[--p-text-3] -mt-2">
                    {precisaCriarSenha
                      ? 'É a primeira vez por aqui — escolha uma senha (mín. 4 caracteres) para proteger seus créditos e compras.'
                      : 'Para continuar com segurança até seus créditos e compras.'}
                  </p>
                  <input
                    id="senha"
                    type="password"
                    autoComplete="off"
                    autoFocus
                    placeholder={precisaCriarSenha ? 'Crie uma senha' : 'Sua senha'}
                    value={senha}
                    onChange={(e) => { setSenha(e.target.value); if (senhaError) setSenhaError(null) }}
                    disabled={senhaPending}
                    className={inputCls}
                  />
                  <motion.button
                    type="submit"
                    disabled={senha.trim().length < 4 || senhaPending}
                    whileHover={{ scale: 1.015 }}
                    whileTap={{ scale: 0.985 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 mt-1 bg-[--p-accent] text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {senhaPending ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Entrando...</>
                    ) : precisaCriarSenha ? (
                      <>Criar senha e entrar <ArrowRight className="w-4 h-4" /></>
                    ) : (
                      <>Entrar <ArrowRight className="w-4 h-4" /></>
                    )}
                  </motion.button>
                  <button
                    type="button"
                    onClick={voltarParaCpf}
                    className="w-full flex items-center justify-center gap-1 text-xs text-[--p-text-3] hover:text-[--p-text-1] transition-colors"
                  >
                    <ChevronLeft className="w-3 h-3" /> Não é você? Trocar CPF
                  </button>
                </div>
              </div>

              <AnimatePresence mode="wait">
                {senhaError && (
                  <motion.div
                    key={senhaError}
                    className="flex items-start gap-2.5 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" strokeWidth={2} />
                    <p className="text-sm text-red-400">{senhaError}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.form>
          )}
        </AnimatePresence>
      </div>

      {produtos.length > 0 && (
        <div className="w-full max-w-3xl space-y-3">
          <div className="flex items-center justify-center gap-4 text-[11px] text-[--p-text-3]">
            <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-[--p-accent]" /> Pagamento seguro via Mercado Pago</span>
            <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-[--p-accent]" /> Crédito liberado na hora</span>
          </div>
          <PlanosPreview produtos={produtos} escola={escola} identificado={false} />
        </div>
      )}
    </div>
  )
}
