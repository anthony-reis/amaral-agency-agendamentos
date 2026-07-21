'use client'

import { useState, useTransition } from 'react'
import { Settings, Phone, XCircle, RotateCcw, CheckCircle2, Clock, Gauge } from 'lucide-react'
import { salvarInstructorConfig, salvarReagendamentoMinHoras } from '@/features/painel/actions/configuracoes'
import type { InstructorConfig } from '@/features/painel/actions/configuracoes'
import { canEditPainel } from '@/features/painel/types'

interface Props {
  autoescola_id: string
  escola: string
  initialConfig: InstructorConfig
  initialReagendamentoMinHoras: number
  userRole: string
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
  {
    key: 'registrar_km',
    label: 'Registrar KM por Aula',
    descricao: 'Habilita botão "Iniciar Aula" para registrar KM inicial e final',
    icon: <Gauge className="w-4 h-4 text-violet-400" />,
  },
]

export function ConfiguracoesInstrutor({ autoescola_id, escola, initialConfig, initialReagendamentoMinHoras, userRole }: Props) {
  const canEdit = canEditPainel(userRole)
  const [config, setConfig] = useState<InstructorConfig>(initialConfig)
  const [reagendamentoHoras, setReagendamentoHoras] = useState(initialReagendamentoMinHoras)
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

    const horas = Math.max(1, Math.round(reagendamentoHoras))

    startTransition(async () => {
      const [r1, r2] = await Promise.all([
        salvarInstructorConfig(autoescola_id, config, escola),
        salvarReagendamentoMinHoras(autoescola_id, horas, escola),
      ])

      if (!r1.success || !r2.success) {
        setError(r1.error ?? r2.error ?? 'Erro ao salvar configurações.')
      } else {
        setSaved(true)
        setReagendamentoHoras(horas)
      }
    })
  }

  return (
    <div className="max-w-xl space-y-8">
      {/* ── Seção: Ações do Instrutor ── */}
      <div>
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
                disabled={isPending || !canEdit}
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
      </div>

      {/* ── Seção: Regras de Reagendamento ── */}
      <div>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <Clock className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[--p-text-1]">Regras de Reagendamento</h2>
            <p className="text-sm text-[--p-text-3]">Define as restrições de tempo para os alunos</p>
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
                  value={reagendamentoHoras}
                  onChange={(e) => {
                    setSaved(false)
                    setReagendamentoHoras(Number(e.target.value))
                  }}
                  disabled={isPending || !canEdit}
                  className="w-24 px-3 py-2 rounded-xl bg-[--p-bg-input] border border-[--p-border] text-[--p-text-1] text-center text-lg font-bold focus:outline-none focus:ring-2 focus:ring-[--p-accent]/30 focus:border-[--p-accent] disabled:opacity-50 transition"
                />
                <span className="text-sm text-[--p-text-2] font-medium">
                  hora{reagendamentoHoras !== 1 ? 's' : ''} de antecedência
                </span>
              </div>
              {reagendamentoHoras >= 24 && (
                <p className="text-xs text-amber-400 mt-2">
                  ⚠️ Com {reagendamentoHoras}h, o aluno precisará reagendar com pelo menos {Math.round(reagendamentoHoras / 24)} dia{reagendamentoHoras >= 48 ? 's' : ''} de antecedência.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Botão Salvar ── */}
      {canEdit && (
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
      )}

      {/* ── Preview ── */}
      <div className="bg-[--p-bg-card] border border-[--p-border] rounded-2xl p-5">
        <p className="text-xs font-semibold text-[--p-text-3] uppercase tracking-wider mb-3">Preview — como o instrutor verá</p>
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
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            Reagendamento: mínimo de {reagendamentoHoras}h de antecedência
          </div>
        </div>
      </div>
    </div>
  )
}
