'use client'

import { useState } from 'react'
import { seedInstrutoresMetodo, seedHorariosMetodo, seedCreditosAlunosMetodo } from '@/features/admin/actions/seedMetodo'

type StepResult = { success: boolean; message: string } | null

export default function SeedMetodoPage() {
  const [instrutoresResult, setInstrutoresResult] = useState<StepResult>(null)
  const [horariosResult, setHorariosResult] = useState<StepResult>(null)
  const [creditosResult, setCreditosResult] = useState<StepResult>(null)
  const [loadingStep, setLoadingStep] = useState<string | null>(null)

  async function run(
    step: string,
    action: () => Promise<{ success: boolean; message: string }>,
    setResult: (r: StepResult) => void
  ) {
    setLoadingStep(step)
    try {
      const result = await action()
      setResult(result)
    } catch (e) {
      setResult({ success: false, message: String(e) })
    } finally {
      setLoadingStep(null)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[--p-text-1]">Seed — Autoescola Método</h1>
        <p className="text-sm text-[--p-text-3] mt-1">Execute cada etapa na ordem. Esta página é de uso único.</p>
      </div>

      <Step
        number={1}
        title="Instrutores (MOTO + EDEVAL)"
        description="Insere WELLISSON, JOÃO, DIMAS (MOTO) e EDEVAL (CARRO) na tabela instructors e instructor_passwords."
        loading={loadingStep === 'instrutores'}
        result={instrutoresResult}
        onRun={() => run('instrutores', seedInstrutoresMetodo, setInstrutoresResult)}
      />

      <Step
        number={2}
        title="Horários Disponíveis"
        description="Insere todos os slots de 50 min para os 14 instrutores na tabela horarios_disponiveis."
        loading={loadingStep === 'horarios'}
        result={horariosResult}
        onRun={() => run('horarios', seedHorariosMetodo, setHorariosResult)}
      />

      <Step
        number={3}
        title="Alunos + Créditos (Abril 2026)"
        description="Insere alunos que não existem no banco e atualiza aulas_cat_b para os 55 alunos da planilha de abril."
        loading={loadingStep === 'creditos'}
        result={creditosResult}
        onRun={() => run('creditos', seedCreditosAlunosMetodo, setCreditosResult)}
      />
    </div>
  )
}

function Step({
  number, title, description, loading, result, onRun,
}: {
  number: number
  title: string
  description: string
  loading: boolean
  result: StepResult
  onRun: () => void
}) {
  return (
    <div className="bg-[--p-bg-card] border border-[--p-border] rounded-xl p-6 space-y-3">
      <div className="flex items-start gap-3">
        <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[--p-accent] text-white text-sm font-bold flex items-center justify-center">
          {number}
        </span>
        <div className="flex-1">
          <h2 className="font-semibold text-[--p-text-1]">{title}</h2>
          <p className="text-sm text-[--p-text-3] mt-0.5">{description}</p>
        </div>
      </div>

      <button
        onClick={onRun}
        disabled={loading}
        className="w-full py-2 px-4 rounded-lg bg-[--p-accent] text-white font-medium text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
      >
        {loading ? 'Executando...' : `Executar Etapa ${number}`}
      </button>

      {result && (
        <div className={`rounded-lg px-4 py-3 text-sm ${result.success ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
          {result.message}
        </div>
      )}
    </div>
  )
}
