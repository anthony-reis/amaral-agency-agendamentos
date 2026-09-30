'use client'

import { useState, useTransition } from 'react'
import { Boxes } from 'lucide-react'
import { FEATURES, FEATURE_KEYS, type FeatureKey } from '@/lib/features'
import { salvarModulosAutoescola } from '../actions/modulos'

interface Props {
  autoescola_id: string
  features: Record<FeatureKey, boolean>
}

export function ModulosForm({ autoescola_id, features: initial }: Props) {
  const [salvos, setSalvos] = useState(initial)
  const [modulos, setModulos] = useState(initial)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const alterado = FEATURE_KEYS.some((k) => modulos[k] !== salvos[k])

  function toggle(key: FeatureKey) {
    setSaved(false)
    setModulos((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  function handleSalvar() {
    setError('')
    setSaved(false)
    startTransition(async () => {
      const result = await salvarModulosAutoescola(autoescola_id, modulos)
      if (!result.success) { setError(result.error); return }
      setSalvos(result.data)
      setModulos(result.data)
      setSaved(true)
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Boxes className="w-4 h-4 text-brand-teal" />
        <h2 className="font-semibold text-slate-800 dark:text-white text-sm">Módulos</h2>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 -mt-2">
        Libere as funcionalidades novas por autoescola. Módulo desligado some do painel, do app do aluno e é bloqueado no servidor.
      </p>

      <div className="divide-y divide-slate-100 dark:divide-white/5 border border-slate-200 dark:border-white/5 rounded-xl">
        {FEATURE_KEYS.map((key) => {
          const ativo = modulos[key]
          return (
            <button
              key={key}
              type="button"
              role="switch"
              aria-checked={ativo}
              onClick={() => toggle(key)}
              className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
            >
              <span
                className={`relative mt-0.5 w-9 h-5 rounded-full shrink-0 transition-colors ${ativo ? 'bg-brand-teal' : 'bg-slate-300 dark:bg-slate-600'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${ativo ? 'translate-x-4' : ''}`} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-slate-800 dark:text-slate-100">{FEATURES[key].label}</span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">{FEATURES[key].descricao}</span>
              </span>
            </button>
          )
        })}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
      {saved && <p className="text-sm text-emerald-600">Módulos salvos.</p>}

      <button
        type="button"
        onClick={handleSalvar}
        disabled={isPending || !alterado}
        className="w-full py-2.5 rounded-xl bg-brand-teal text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {isPending ? 'Salvando...' : 'Salvar módulos'}
      </button>
    </div>
  )
}
