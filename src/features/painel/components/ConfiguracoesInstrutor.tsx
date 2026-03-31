'use client'

import { useState, useTransition } from 'react'
import { Settings, Phone, XCircle, RotateCcw, CheckCircle2 } from 'lucide-react'
import { salvarInstructorConfig } from '@/features/painel/actions/configuracoes'
import type { InstructorConfig } from '@/features/painel/actions/configuracoes'

interface Props {
  autoescola_id: string
  escola: string
  initialConfig: InstructorConfig
}

const OPCOES: { key: keyof InstructorConfig; label: string; descricao: string; icon: React.ReactNode }[] = [
  {
    key: 'pode_finalizar',
    label: 'Finalizar Aula',
    descricao: 'Permite ao instrutor marcar a aula como concluída',
    icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
  },
  {
    key: 'pode_dar_falta',
    label: 'Dar Falta',
    descricao: 'Permite ao instrutor registrar falta do aluno',
    icon: <XCircle className="w-4 h-4 text-red-400" />,
  },
  {
    key: 'pode_desmarcar',
    label: 'Desmarcar Aula',
    descricao: 'Permite ao instrutor cancelar e devolver crédito ao aluno',
    icon: <RotateCcw className="w-4 h-4 text-orange-400" />,
  },
  {
    key: 'mostrar_telefone',
    label: 'Mostrar Telefone do Aluno',
    descricao: 'Exibe o número e link de WhatsApp do aluno na aula',
    icon: <Phone className="w-4 h-4 text-blue-400" />,
  },
]

export function ConfiguracoesInstrutor({ autoescola_id, escola, initialConfig }: Props) {
  const [config, setConfig] = useState<InstructorConfig>(initialConfig)
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggle(key: keyof InstructorConfig) {
    setConfig((prev) => ({ ...prev, [key]: !prev[key] }))
    setSaved(false)
  }

  function handleSave() {
    setError(null)
    startTransition(async () => {
      const result = await salvarInstructorConfig(autoescola_id, config, escola)
      if (result.success) {
        setSaved(true)
      } else {
        setError(result.error ?? 'Erro ao salvar configurações.')
      }
    })
  }

  return (
    <div className="max-w-xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-[--p-accent]/10 flex items-center justify-center">
          <Settings className="w-5 h-5 text-[--p-accent]" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-[--p-text-1]">Ações do Instrutor</h1>
          <p className="text-sm text-[--p-text-3]">Controle o que o instrutor pode ver e fazer</p>
        </div>
      </div>

      <div className="bg-[--p-bg-card] border border-[--p-border] rounded-2xl divide-y divide-[--p-border]">
        {OPCOES.map(({ key, label, descricao, icon }) => (
          <div key={key} className="flex items-center justify-between px-5 py-4 gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[--p-bg-input] border border-[--p-border] flex items-center justify-center shrink-0">
                {icon}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[--p-text-1]">{label}</p>
                <p className="text-xs text-[--p-text-3]">{descricao}</p>
              </div>
            </div>
            <button
              onClick={() => toggle(key)}
              disabled={isPending}
              className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 transition-colors duration-200 focus:outline-none disabled:opacity-50 ${
                config[key]
                  ? 'bg-[--p-accent] border-[--p-accent]'
                  : 'bg-[--p-bg-input] border-[--p-border]'
              }`}
              role="switch"
              aria-checked={config[key]}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform duration-200 mt-0.5 ${
                  config[key] ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-3">
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

      {/* Preview */}
      <div className="mt-6 bg-[--p-bg-card] border border-[--p-border] rounded-2xl p-5">
        <p className="text-xs font-semibold text-[--p-text-3] uppercase tracking-wider mb-3">Preview — como o instrutor verá</p>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-[--p-text-2]">
            <span className={`w-2 h-2 rounded-full ${config.mostrar_telefone ? 'bg-emerald-400' : 'bg-[--p-border]'}`} />
            Telefone do aluno: {config.mostrar_telefone ? 'visível' : 'oculto'}
          </div>
          <div className="flex items-center gap-2 text-xs text-[--p-text-2]">
            <span className={`w-2 h-2 rounded-full ${config.pode_finalizar ? 'bg-emerald-400' : 'bg-[--p-border]'}`} />
            Botão "Finalizar Aula": {config.pode_finalizar ? 'visível' : 'oculto'}
          </div>
          <div className="flex items-center gap-2 text-xs text-[--p-text-2]">
            <span className={`w-2 h-2 rounded-full ${config.pode_dar_falta ? 'bg-emerald-400' : 'bg-[--p-border]'}`} />
            Botão "Dar Falta": {config.pode_dar_falta ? 'visível' : 'oculto'}
          </div>
          <div className="flex items-center gap-2 text-xs text-[--p-text-2]">
            <span className={`w-2 h-2 rounded-full ${config.pode_desmarcar ? 'bg-emerald-400' : 'bg-[--p-border]'}`} />
            Botão "Desmarcar": {config.pode_desmarcar ? 'visível' : 'oculto'}
          </div>
        </div>
      </div>
    </div>
  )
}
