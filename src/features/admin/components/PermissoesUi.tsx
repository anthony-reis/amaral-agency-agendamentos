'use client'

import { Check } from 'lucide-react'
import {
  AREAS,
  AREA_KEYS,
  NIVEL_LABEL,
  combinarPermissoes,
  type Area,
  type Nivel,
  type Permissoes,
} from '@/lib/permissoes'

export interface PerfilOpcao {
  id: string
  nome: string
  descricao: string | null
  /** Só perfis prontos: cargos indicados. */
  indicadoPara?: string
  permissoes: Partial<Permissoes>
  personalizado: boolean
}

const NIVEL_CLS: Record<Nivel, string> = {
  nenhum: 'bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-slate-500',
  ver: 'bg-sky-100 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300',
  editar: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
}

export function NivelBadge({ nivel, desligado }: { nivel: Nivel; desligado?: boolean }) {
  if (desligado) {
    return (
      <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-slate-500 line-through" title="Módulo desligado nesta autoescola">
        {NIVEL_LABEL[nivel]}
      </span>
    )
  }
  return <span className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold ${NIVEL_CLS[nivel]}`}>{NIVEL_LABEL[nivel]}</span>
}

/** Tabela área × nível (somente leitura). */
export function MatrizPermissoes({
  permissoes,
  areasDesligadas = [],
  compacta = false,
}: {
  permissoes: Partial<Permissoes>
  areasDesligadas?: Area[]
  compacta?: boolean
}) {
  return (
    <div className="divide-y divide-slate-100 dark:divide-white/5 border border-slate-200 dark:border-white/5 rounded-xl overflow-hidden">
      {AREA_KEYS.map((a) => (
        <div key={a} className="flex items-center justify-between gap-3 px-3 py-2 bg-white dark:bg-[#1e293b]">
          <div className="min-w-0">
            <p className="text-sm text-slate-800 dark:text-slate-100">{AREAS[a].label}</p>
            {!compacta && <p className="text-[11px] text-slate-400 truncate">{AREAS[a].descricao}</p>}
          </div>
          <NivelBadge nivel={permissoes[a] ?? 'nenhum'} desligado={areasDesligadas.includes(a)} />
        </div>
      ))}
    </div>
  )
}

/** Escolha de vários perfis + prévia do acesso combinado. */
export function PerfisSelector({
  opcoes,
  selecionados,
  onChange,
  areasDesligadas,
}: {
  opcoes: PerfilOpcao[]
  selecionados: string[]
  onChange: (ids: string[]) => void
  areasDesligadas: Area[]
}) {
  function toggle(id: string) {
    onChange(selecionados.includes(id) ? selecionados.filter((x) => x !== id) : [...selecionados, id])
  }
  const combinado = combinarPermissoes(opcoes.filter((o) => selecionados.includes(o.id)).map((o) => o.permissoes))

  return (
    <div className="space-y-3">
      <div className="grid sm:grid-cols-2 gap-2">
        {opcoes.map((o) => {
          const marcado = selecionados.includes(o.id)
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => toggle(o.id)}
              aria-pressed={marcado}
              className={`text-left rounded-xl border p-3 transition-colors ${
                marcado
                  ? 'border-brand-teal bg-brand-teal/5'
                  : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
              }`}
            >
              <div className="flex items-start gap-2">
                <span className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 ${marcado ? 'bg-brand-teal border-brand-teal text-white' : 'border-slate-300 dark:border-white/20'}`}>
                  {marcado && <Check className="w-3 h-3" />}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {o.nome}
                    {o.personalizado && <span className="ml-1.5 text-[10px] font-medium text-violet-500">personalizado</span>}
                  </p>
                  {o.indicadoPara && <p className="text-[11px] text-brand-teal mt-0.5">Para: {o.indicadoPara}</p>}
                  {o.descricao && <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{o.descricao}</p>}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      <div>
        <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
          Acesso resultante {selecionados.length > 1 && '(soma dos perfis marcados)'}
        </p>
        {selecionados.length === 0 ? (
          <p className="text-xs text-amber-600">Marque ao menos um perfil.</p>
        ) : (
          <MatrizPermissoes permissoes={combinado} areasDesligadas={areasDesligadas} compacta />
        )}
        {areasDesligadas.length > 0 && (
          <p className="text-[11px] text-slate-400 mt-1.5">Riscado = módulo desligado nesta autoescola (ninguém acessa).</p>
        )}
      </div>
    </div>
  )
}
