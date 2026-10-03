'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { UserPlus, Trash2, Power, PowerOff, Pencil, X, ShieldCheck } from 'lucide-react'
import { togglePainelUser, excluirPainelUser, criarPainelUser, editarPainelUser } from '../actions/painelUsers'
import type { PainelUserRow } from '../actions/painelUsers'
import { PerfisSelector, type PerfilOpcao } from './PermissoesUi'
import { perfisDoRoleLegado, type Area } from '@/lib/permissoes'

interface Props {
  users: PainelUserRow[]
  autoescola_id: string
  autoescola_slug: string
  perfisOpcoes: PerfilOpcao[]
  areasDesligadas: Area[]
}

const emptyForm = { username: '', full_name: '', password: '', perfis: [] as string[] }

function perfisDoUsuario(user: PainelUserRow): string[] {
  return user.perfis?.length ? user.perfis : perfisDoRoleLegado(user.role)
}

export function PainelUsersList({ users: initial, autoescola_id, autoescola_slug, perfisOpcoes, areasDesligadas }: Props) {
  const [users, setUsers] = useState<PainelUserRow[]>(initial)
  const [isPending, startTransition] = useTransition()
  const [showForm, setShowForm] = useState(false)
  const [editingUser, setEditingUser] = useState<PainelUserRow | null>(null)
  const [error, setError] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [editForm, setEditForm] = useState(emptyForm)

  const nomePerfil = (id: string) => perfisOpcoes.find((o) => o.id === id)?.nome ?? 'Perfil removido'

  function handleToggle(id: string, currentActive: boolean) {
    startTransition(async () => {
      const result = await togglePainelUser(id, !currentActive, autoescola_id)
      if (result.success) {
        setUsers((u) => u.map((x) => x.id === id ? { ...x, is_active: !currentActive } : x))
      }
    })
  }

  function handleDelete(id: string) {
    if (!confirm('Excluir este usuário do painel?')) return
    startTransition(async () => {
      const result = await excluirPainelUser(id, autoescola_id)
      if (result.success) setUsers((u) => u.filter((x) => x.id !== id))
    })
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (form.perfis.length === 0) { setError('Escolha ao menos um perfil.'); return }
    startTransition(async () => {
      const result = await criarPainelUser({ ...form, autoescola_id })
      if (!result.success) { setError(result.error); return }
      setUsers((u) => [result.data, ...u])
      setShowForm(false)
      setForm(emptyForm)
    })
  }

  function openEdit(user: PainelUserRow) {
    setEditForm({ username: user.username, full_name: user.full_name, password: '', perfis: perfisDoUsuario(user) })
    setEditingUser(user)
    setError('')
  }

  function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingUser) return
    setError('')
    if (editForm.perfis.length === 0) { setError('Escolha ao menos um perfil.'); return }
    startTransition(async () => {
      const result = await editarPainelUser(editingUser.id, editForm, autoescola_id)
      if (!result.success) { setError(result.error); return }
      setUsers((u) => u.map((x) => x.id === editingUser.id ? result.data : x))
      setEditingUser(null)
    })
  }

  const inputCls = 'w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-slate-200 bg-white dark:bg-[#0f172a] focus:outline-none focus:ring-2 focus:ring-brand-teal/30'
  const labelCls = 'block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1'

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Usuários do Painel</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Acesso em:{' '}
            <span className="font-mono text-brand-teal">/{autoescola_slug}/painel</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/clientes/${autoescola_id}/perfis`}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5"
          >
            <ShieldCheck className="w-4 h-4" />
            Ver perfis e permissões
          </Link>
          <button
            onClick={() => { setShowForm((v) => !v); setError('') }}
            className="flex items-center gap-2 px-4 py-2 bg-brand-teal text-white text-sm font-semibold rounded-xl hover:bg-brand-teal-dark transition-colors shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            Novo Usuário
          </button>
        </div>
      </div>

      {/* Create form */}
      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            onSubmit={handleCreate}
            className="grid sm:grid-cols-3 gap-3 p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl"
          >
            <div>
              <label className={labelCls}>Nome completo</label>
              <input required value={form.full_name} onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))} className={inputCls} placeholder="Ex: João Silva" />
            </div>
            <div>
              <label className={labelCls}>Username</label>
              <input required value={form.username} onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))} className={inputCls} placeholder="Ex: joao.silva" />
            </div>
            <div>
              <label className={labelCls}>Senha</label>
              <input required type="text" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} className={inputCls} placeholder="Senha inicial" />
            </div>
            <div className="sm:col-span-3">
              <label className={labelCls}>Perfis (pode marcar mais de um — o acesso é a soma)</label>
              <PerfisSelector
                opcoes={perfisOpcoes}
                selecionados={form.perfis}
                onChange={(perfis) => setForm((p) => ({ ...p, perfis }))}
                areasDesligadas={areasDesligadas}
              />
            </div>
            {error && <p className="sm:col-span-3 text-sm text-red-600">{error}</p>}
            <div className="sm:col-span-3 flex gap-2 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">Cancelar</button>
              <button type="submit" disabled={isPending} className="px-4 py-2 bg-brand-teal text-white text-sm font-semibold rounded-lg hover:bg-brand-teal-dark disabled:opacity-50">Criar</button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Users table */}
      {users.length === 0 ? (
        <p className="text-sm text-slate-400 py-6 text-center">Nenhum usuário cadastrado para este painel.</p>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-white/5 border border-slate-200 dark:border-white/5 rounded-xl overflow-hidden">
          {users.map((user) => (
            <div key={user.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 bg-white dark:bg-[#1e293b] hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
              <div className="w-9 h-9 rounded-full bg-brand-teal/10 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-brand-teal">{user.full_name.charAt(0).toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-[140px]">
                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{user.full_name}</p>
                <p className="text-xs text-slate-400 font-mono">{user.username}</p>
              </div>
              <div className="flex flex-wrap gap-1">
                {perfisDoUsuario(user).map((id) => (
                  <span key={id} className="px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                    {nomePerfil(id)}
                  </span>
                ))}
              </div>
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
              }`}>
                {user.is_active ? 'Ativo' : 'Inativo'}
              </span>
              <div className="flex items-center gap-1">
                <button onClick={() => openEdit(user)} disabled={isPending} title="Editar" className="p-1.5 rounded-lg text-slate-400 hover:text-brand-teal hover:bg-brand-teal/5 transition-colors">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => handleToggle(user.id, user.is_active)} disabled={isPending} title={user.is_active ? 'Desativar' : 'Ativar'} className="p-1.5 rounded-lg text-slate-400 hover:text-brand-teal hover:bg-brand-teal/5 transition-colors">
                  {user.is_active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                </button>
                <button onClick={() => handleDelete(user.id)} disabled={isPending} title="Excluir" className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/5 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit modal */}
      <AnimatePresence>
        {editingUser && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-40" onClick={() => setEditingUser(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
              <form onSubmit={handleEdit} className="pointer-events-auto bg-white dark:bg-[#1e293b] rounded-2xl border border-slate-200 dark:border-white/5 p-6 w-full max-w-2xl shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900 dark:text-white">Editar Usuário</h3>
                  <button type="button" onClick={() => setEditingUser(null)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid sm:grid-cols-3 gap-3">
                  <div>
                    <label className={labelCls}>Nome completo</label>
                    <input required value={editForm.full_name} onChange={(e) => setEditForm((p) => ({ ...p, full_name: e.target.value }))} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Username</label>
                    <input required value={editForm.username} onChange={(e) => setEditForm((p) => ({ ...p, username: e.target.value }))} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Nova senha <span className="text-slate-400 font-normal">(opcional)</span></label>
                    <input type="text" value={editForm.password} onChange={(e) => setEditForm((p) => ({ ...p, password: e.target.value }))} className={inputCls} placeholder="Manter atual" />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Perfis (pode marcar mais de um — o acesso é a soma)</label>
                  <PerfisSelector
                    opcoes={perfisOpcoes}
                    selecionados={editForm.perfis}
                    onChange={(perfis) => setEditForm((p) => ({ ...p, perfis }))}
                    areasDesligadas={areasDesligadas}
                  />
                  <p className="text-[11px] text-slate-400 mt-2">A mudança vale na hora, sem o usuário precisar sair e entrar de novo.</p>
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => setEditingUser(null)} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">Cancelar</button>
                  <button type="submit" disabled={isPending} className="px-4 py-2 bg-brand-teal text-white text-sm font-semibold rounded-xl hover:bg-brand-teal-dark disabled:opacity-50">
                    {isPending ? 'Salvando…' : 'Salvar'}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
