'use client'

import { useState, useTransition } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Briefcase, Check, Minus, Pencil, Plus, Trash2, X } from 'lucide-react'
import {
  AREAS,
  AREA_KEYS,
  NIVEIS,
  NIVEL_LABEL,
  normalizarPermissoes,
  type Area,
  type Nivel,
  type Permissoes,
} from '@/lib/permissoes'
import { excluirPerfilPersonalizado, salvarPerfilPersonalizado, type PerfilPersonalizado } from '../actions/painelPerfis'
import { NivelBadge, type PerfilOpcao } from './PermissoesUi'

interface Props {
  autoescola_id: string
  perfisPadrao: PerfilOpcao[]
  personalizadosIniciais: PerfilPersonalizado[]
  areasDesligadas: Area[]
}

/** Resumo em texto: o que o perfil pode e o que não pode. */
function resumo(p: Partial<Permissoes>) {
  const editar = AREA_KEYS.filter((a) => p[a] === 'editar').map((a) => AREAS[a].label)
  const ver = AREA_KEYS.filter((a) => p[a] === 'ver').map((a) => AREAS[a].label)
  const nada = AREA_KEYS.filter((a) => !p[a] || p[a] === 'nenhum').map((a) => AREAS[a].label)
  return { editar, ver, nada }
}

function ResumoPerfil({ permissoes }: { permissoes: Partial<Permissoes> }) {
  const r = resumo(permissoes)
  return (
    <ul className="space-y-1 text-xs">
      {r.editar.length > 0 && (
        <li className="flex gap-1.5 text-emerald-700 dark:text-emerald-300"><Check className="w-3.5 h-3.5 shrink-0 mt-px" /><span><strong>Vê e altera:</strong> {r.editar.join(', ')}</span></li>
      )}
      {r.ver.length > 0 && (
        <li className="flex gap-1.5 text-sky-700 dark:text-sky-300"><Check className="w-3.5 h-3.5 shrink-0 mt-px" /><span><strong>Só vê:</strong> {r.ver.join(', ')}</span></li>
      )}
      {r.nada.length > 0 && (
        <li className="flex gap-1.5 text-slate-500"><Minus className="w-3.5 h-3.5 shrink-0 mt-px" /><span><strong>Não acessa:</strong> {r.nada.join(', ')}</span></li>
      )}
    </ul>
  )
}

const vazio: Permissoes = normalizarPermissoes({})

export function PerfisManager({ autoescola_id, perfisPadrao, personalizadosIniciais, areasDesligadas }: Props) {
  const [personalizados, setPersonalizados] = useState(personalizadosIniciais)
  const [editando, setEditando] = useState<{ id?: string; nome: string; descricao: string; permissoes: Permissoes } | null>(null)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function abrirNovo(base?: Partial<Permissoes>) {
    setError('')
    setEditando({ nome: '', descricao: '', permissoes: base ? normalizarPermissoes(base) : vazio })
  }

  function salvar() {
    if (!editando) return
    setError('')
    startTransition(async () => {
      const r = await salvarPerfilPersonalizado({ ...editando, autoescola_id })
      if (!r.success) { setError(r.error); return }
      setPersonalizados((prev) => {
        const sem = prev.filter((p) => p.id !== r.data.id)
        return [...sem, r.data].sort((a, b) => a.nome.localeCompare(b.nome))
      })
      setEditando(null)
    })
  }

  function excluir(p: PerfilPersonalizado) {
    if (!confirm(`Excluir o perfil "${p.nome}"?`)) return
    startTransition(async () => {
      const r = await excluirPerfilPersonalizado(p.id, autoescola_id)
      if (!r.success) { alert(r.error); return }
      setPersonalizados((prev) => prev.filter((x) => x.id !== p.id))
    })
  }

  return (
    <div className="space-y-8">
      {/* Como funciona */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/5 p-4 text-sm text-slate-600 dark:text-slate-300 space-y-1.5">
        <p><strong>Como funciona:</strong> cada usuário do painel recebe um ou mais perfis. O acesso é a <strong>soma</strong> dos perfis (ex.: Secretaria + Vendas = agenda, cadastros e vendas).</p>
        <p>Cada área tem 3 níveis: <NivelBadge nivel="nenhum" /> some do menu e bloqueia a tela; <NivelBadge nivel="ver" /> abre a tela sem permitir alterações; <NivelBadge nivel="editar" /> pode criar, alterar e excluir.</p>
        <p>Áreas de módulos desligados nesta autoescola ficam bloqueadas para todos, mesmo para o Gestor.</p>
      </div>

      {/* Perfis prontos */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Perfis prontos</h2>
        <div className="grid lg:grid-cols-2 gap-4">
          {perfisPadrao.map((p) => (
            <div key={p.id} className="rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-[#1e293b] p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">{p.nome}</h3>
                  {p.indicadoPara && (
                    <p className="flex items-start gap-1.5 text-xs text-brand-teal mt-1">
                      <Briefcase className="w-3.5 h-3.5 shrink-0 mt-px" />
                      <span><strong>Indicado para:</strong> {p.indicadoPara}</span>
                    </p>
                  )}
                </div>
                <button
                  onClick={() => abrirNovo(p.permissoes)}
                  className="shrink-0 text-xs text-slate-500 hover:text-brand-teal"
                  title="Criar um perfil personalizado a partir deste"
                >
                  Usar como base
                </button>
              </div>
              {p.descricao && <p className="text-sm text-slate-600 dark:text-slate-300">{p.descricao}</p>}
              <ResumoPerfil permissoes={p.permissoes} />
              <details className="group">
                <summary className="cursor-pointer text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white">Ver tabela por área</summary>
                <div className="mt-2 divide-y divide-slate-100 dark:divide-white/5 border border-slate-200 dark:border-white/5 rounded-xl overflow-hidden">
                  {AREA_KEYS.map((a) => (
                    <div key={a} className="flex items-center justify-between gap-3 px-3 py-2">
                      <div className="min-w-0">
                        <p className="text-sm text-slate-800 dark:text-slate-100">{AREAS[a].label}</p>
                        <p className="text-[11px] text-slate-400">{AREAS[a].descricao}</p>
                      </div>
                      <NivelBadge nivel={p.permissoes[a] ?? 'nenhum'} desligado={areasDesligadas.includes(a)} />
                    </div>
                  ))}
                </div>
              </details>
            </div>
          ))}
        </div>
      </section>

      {/* Perfis personalizados */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Perfis personalizados desta autoescola</h2>
            <p className="text-sm text-slate-500">Use quando nenhum perfil pronto (nem a soma de alguns) servir para um cargo específico.</p>
          </div>
          <button
            onClick={() => abrirNovo()}
            className="flex items-center gap-2 px-4 py-2 bg-brand-teal text-white text-sm font-semibold rounded-xl hover:bg-brand-teal-dark"
          >
            <Plus className="w-4 h-4" /> Novo perfil
          </button>
        </div>
        {personalizados.length === 0 ? (
          <p className="text-sm text-slate-400 py-4">Nenhum perfil personalizado.</p>
        ) : (
          <div className="grid lg:grid-cols-2 gap-4">
            {personalizados.map((p) => (
              <div key={p.id} className="rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-[#1e293b] p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">{p.nome}</h3>
                    <p className="text-xs text-slate-400">{p.usuarios} usuário{p.usuarios !== 1 ? 's' : ''} com este perfil</p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => { setError(''); setEditando({ id: p.id, nome: p.nome, descricao: p.descricao ?? '', permissoes: p.permissoes }) }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-brand-teal"
                      title="Editar"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => excluir(p)} disabled={isPending} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500" title="Excluir">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {p.descricao && <p className="text-sm text-slate-600 dark:text-slate-300">{p.descricao}</p>}
                <ResumoPerfil permissoes={p.permissoes} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Editor */}
      <AnimatePresence>
        {editando && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-40" onClick={() => !isPending && setEditando(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
              <div className="pointer-events-auto bg-white dark:bg-[#1e293b] rounded-2xl border border-slate-200 dark:border-white/5 p-6 w-full max-w-2xl shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900 dark:text-white">{editando.id ? 'Editar perfil' : 'Novo perfil personalizado'}</h3>
                  <button onClick={() => setEditando(null)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white"><X className="w-4 h-4" /></button>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Nome do perfil</label>
                    <input
                      value={editando.nome}
                      onChange={(e) => setEditando((p) => p && { ...p, nome: e.target.value })}
                      placeholder="Ex: Coordenação de instrutores"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-white/10 text-sm bg-white dark:bg-[#0f172a] text-slate-900 dark:text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Para quem é (descrição)</label>
                    <input
                      value={editando.descricao}
                      onChange={(e) => setEditando((p) => p && { ...p, descricao: e.target.value })}
                      placeholder="Ex: Quem organiza escalas e agenda"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-white/10 text-sm bg-white dark:bg-[#0f172a] text-slate-900 dark:text-slate-200"
                    />
                  </div>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-white/5 border border-slate-200 dark:border-white/5 rounded-xl">
                  {AREA_KEYS.map((a) => (
                    <div key={a} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-slate-800 dark:text-slate-100">
                          {AREAS[a].label}
                          {areasDesligadas.includes(a) && <span className="ml-2 text-[10px] text-slate-400">(módulo desligado)</span>}
                        </p>
                        <p className="text-[11px] text-slate-400">{AREAS[a].descricao}</p>
                      </div>
                      <div className="flex rounded-lg border border-slate-200 dark:border-white/10 overflow-hidden" role="radiogroup" aria-label={AREAS[a].label}>
                        {NIVEIS.map((n: Nivel) => (
                          <button
                            key={n}
                            type="button"
                            role="radio"
                            aria-checked={editando.permissoes[a] === n}
                            onClick={() => setEditando((p) => p && { ...p, permissoes: { ...p.permissoes, [a]: n } })}
                            className={`px-2.5 py-1 text-xs font-medium transition-colors ${
                              editando.permissoes[a] === n
                                ? n === 'editar' ? 'bg-emerald-500 text-white' : n === 'ver' ? 'bg-sky-500 text-white' : 'bg-slate-500 text-white'
                                : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5'
                            }`}
                          >
                            {NIVEL_LABEL[n]}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setEditando(null)} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400">Cancelar</button>
                  <button onClick={salvar} disabled={isPending} className="px-4 py-2 bg-brand-teal text-white text-sm font-semibold rounded-xl hover:bg-brand-teal-dark disabled:opacity-50">
                    {isPending ? 'Salvando…' : 'Salvar perfil'}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
