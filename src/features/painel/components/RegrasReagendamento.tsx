'use client'

import { useState, useTransition } from 'react'
import { Hourglass, Clock, CheckCircle2 } from 'lucide-react'
import { salvarReagendamentoMinHoras } from '@/features/painel/actions/configuracoes'

interface Props {
  autoescola_id: string
  escola: string
  initialReagendamentoMinHoras: number
}

export function RegrasReagendamento({ autoescola_id, escola, initialReagendamentoMinHoras }: Props) {
  const [horas, setHoras] = useState(initialReagendamentoMinHoras)
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleSave() {
    setError(null)
    setSaved(false)

    const horasValidadas = Math.max(1, Math.round(horas))

    startTransition(async () => {
      const result = await salvarReagendamentoMinHoras(autoescola_id, horasValidadas, escola)
      if (!result.success) {
        setError(result.error ?? 'Erro ao salvar configurações.')
      } else {
        setSaved(true)
        setHoras(horasValidadas)
      }
    })
  }

  return (
    <div className="max-w-xl space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
          <Hourglass className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-[--p-text-1]">Regras de Reagendamento</h1>
          <p className="text-sm text-[--p-text-3]">
            Define as restrições de tempo para os alunos reagendarem aulas
          </p>
        </div>
      </div>

      <div className="bg-[--p-bg-card] border border-[--p-border] rounded-2xl p-5">
        <div className="flex items-start gap-4">
          <div className="w-8 h-8 rounded-lg bg-[--p-bg-input] border border-[--p-border] flex items-center justify-center shrink-0 mt-0.5">
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[--p-text-1]">Antecedência mínima para reagendar</p>
            <p className="text-xs text-[--p-text-3] mt-0.5 mb-4">
              O aluno só pode reagendar uma aula se ela ainda estiver a pelo menos este número de horas de distância.
            </p>
            <div className="flex items-center gap-3">
              <input
                id="reagendamento-horas"
                type="number"
                min={1}
                max={168}
                value={horas}
                onChange={(e) => {
                  setSaved(false)
                  setHoras(Number(e.target.value))
                }}
                disabled={isPending}
                className="w-24 px-3 py-2 rounded-xl bg-[--p-bg-input] border border-[--p-border] text-[--p-text-1] text-center text-lg font-bold focus:outline-none focus:ring-2 focus:ring-[--p-accent]/30 focus:border-[--p-accent] disabled:opacity-50 transition"
              />
              <span className="text-sm text-[--p-text-2] font-medium">
                hora{horas !== 1 ? 's' : ''} de antecedência
              </span>
            </div>
            {horas >= 24 && (
              <p className="text-xs text-amber-400 mt-2">
                ⚠️ Com {horas}h, o aluno precisará reagendar com pelo menos {Math.round(horas / 24)} dia{horas >= 48 ? 's' : ''} de antecedência.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="px-5 py-2.5 rounded-xl bg-[--p-accent] text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {isPending ? 'Salvando...' : 'Salvar Configurações'}
        </button>
        {saved && (
          <span className="text-sm text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            Salvo!
          </span>
        )}
        {error && <span className="text-sm text-red-400">{error}</span>}
      </div>
    </div>
  )
}
