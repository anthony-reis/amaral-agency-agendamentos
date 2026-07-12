'use client'

import { useState, useTransition } from 'react'
import { UserCog, Phone, XCircle, RotateCcw, CheckCircle2, Gauge, Smartphone, DollarSign } from 'lucide-react'
import { salvarInstructorConfig } from '@/features/painel/actions/configuracoes'
import type { InstructorConfig } from '@/features/painel/actions/configuracoes'

interface Props {
  autoescola_id: string
  escola: string
  initialConfig: InstructorConfig
}

interface Opcao {
  key: keyof InstructorConfig
  label: string
  descricao: string
  icon: React.ReactNode
}

const ACOES: Opcao[] = [
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
    key: 'registrar_km',
    label: 'Registrar KM por Aula',
    descricao: 'Habilita botão "Iniciar Aula" para registrar KM inicial e final',
    icon: <Gauge className="w-4 h-4 text-violet-400" />,
  },
]

const VISIBILIDADE: Opcao[] = [
  {
    key: 'mostrar_telefone',
    label: 'Mostrar Telefone do Aluno',
    descricao: 'Exibe o número e link de WhatsApp do aluno na aula',
    icon: <Phone className="w-4 h-4 text-blue-400" />,
  },
  {
    key: 'mostrar_hora_aula',
    label: 'Mostrar Hora/Aula',
    descricao: 'Exibe para o instrutor o valor da hora/aula e o total a receber nas Estatísticas',
    icon: <DollarSign className="w-4 h-4 text-emerald-400" />,
  },
]

function ToggleRow({
  opcao,
  checked,
  disabled,
  onToggle,
}: {
  opcao: Opcao
  checked: boolean
  disabled: boolean
  onToggle: () => void
}) {
  return (
    <div className="flex items-center justify-between px-5 py-4 gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-[--p-bg-input] border border-[--p-border] flex items-center justify-center shrink-0">
          {opcao.icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[--p-text-1]">{opcao.label}</p>
          <p className="text-xs text-[--p-text-3]">{opcao.descricao}</p>
        </div>
      </div>
      <button
        onClick={onToggle}
        disabled={disabled}
        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 transition-colors duration-200 focus:outline-none disabled:opacity-50 ${
          checked ? 'bg-[--p-accent] border-[--p-accent]' : 'bg-[--p-bg-input] border-[--p-border]'
        }`}
        role="switch"
        aria-checked={checked}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform duration-200 mt-0.5 ${
            checked ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  )
}

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
    setSaved(false)

    startTransition(async () => {
      const result = await salvarInstructorConfig(autoescola_id, config, escola)
      if (!result.success) {
        setError(result.error ?? 'Erro ao salvar configurações.')
      } else {
        setSaved(true)
      }
    })
  }

  return (
    <div className="max-w-xl space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[--p-accent]/10 flex items-center justify-center">
          <UserCog className="w-5 h-5 text-[--p-accent]" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-[--p-text-1]">Ações do Instrutor</h1>
          <p className="text-sm text-[--p-text-3]">
            Controle o que aparece no aplicativo do instrutor
          </p>
        </div>
      </div>

      {/* Ações permitidas */}
      <div>
        <p className="text-xs font-semibold text-[--p-text-3] uppercase tracking-wider mb-3">
          Ações permitidas
        </p>
        <div className="bg-[--p-bg-card] border border-[--p-border] rounded-2xl divide-y divide-[--p-border]">
          {ACOES.map((opcao) => (
            <ToggleRow
              key={opcao.key}
              opcao={opcao}
              checked={config[opcao.key]}
              disabled={isPending}
              onToggle={() => toggle(opcao.key)}
            />
          ))}
        </div>
      </div>

      {/* Visibilidade */}
      <div>
        <p className="text-xs font-semibold text-[--p-text-3] uppercase tracking-wider mb-3">
          Visibilidade
        </p>
        <div className="bg-[--p-bg-card] border border-[--p-border] rounded-2xl divide-y divide-[--p-border]">
          {VISIBILIDADE.map((opcao) => (
            <ToggleRow
              key={opcao.key}
              opcao={opcao}
              checked={config[opcao.key]}
              disabled={isPending}
              onToggle={() => toggle(opcao.key)}
            />
          ))}
        </div>
      </div>

      {/* Botão Salvar */}
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

      {/* Preview */}
      <div className="bg-[--p-bg-card] border border-[--p-border] rounded-2xl p-5">
        <p className="text-xs font-semibold text-[--p-text-3] uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Smartphone className="w-3.5 h-3.5" />
          Preview — como o instrutor verá
        </p>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-[--p-text-2]">
            <span className={`w-2 h-2 rounded-full ${config.mostrar_telefone ? 'bg-emerald-400' : 'bg-[--p-border]'}`} />
            Telefone do aluno: {config.mostrar_telefone ? 'visível' : 'oculto'}
          </div>
          <div className="flex items-center gap-2 text-xs text-[--p-text-2]">
            <span className={`w-2 h-2 rounded-full ${config.pode_finalizar ? 'bg-emerald-400' : 'bg-[--p-border]'}`} />
            Botão &quot;Finalizar Aula&quot;: {config.pode_finalizar ? 'visível' : 'oculto'}
          </div>
          <div className="flex items-center gap-2 text-xs text-[--p-text-2]">
            <span className={`w-2 h-2 rounded-full ${config.pode_dar_falta ? 'bg-emerald-400' : 'bg-[--p-border]'}`} />
            Botão &quot;Dar Falta&quot;: {config.pode_dar_falta ? 'visível' : 'oculto'}
          </div>
          <div className="flex items-center gap-2 text-xs text-[--p-text-2]">
            <span className={`w-2 h-2 rounded-full ${config.pode_desmarcar ? 'bg-emerald-400' : 'bg-[--p-border]'}`} />
            Botão &quot;Desmarcar&quot;: {config.pode_desmarcar ? 'visível' : 'oculto'}
          </div>
          <div className="flex items-center gap-2 text-xs text-[--p-text-2]">
            <span className={`w-2 h-2 rounded-full ${config.registrar_km ? 'bg-violet-400' : 'bg-[--p-border]'}`} />
            Registro de KM: {config.registrar_km ? 'ativo (botão "Iniciar Aula" visível)' : 'desativado'}
          </div>
          <div className="flex items-center gap-2 text-xs text-[--p-text-2]">
            <span className={`w-2 h-2 rounded-full ${config.mostrar_hora_aula ? 'bg-emerald-400' : 'bg-[--p-border]'}`} />
            Hora/Aula: {config.mostrar_hora_aula ? 'visível nas Estatísticas' : 'oculta'}
          </div>
        </div>
      </div>
    </div>
  )
}
