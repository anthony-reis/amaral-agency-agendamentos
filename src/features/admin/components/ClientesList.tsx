import Link from 'next/link'
import { Plus, Building2, CheckCircle2, Clock, XCircle, Users, Pencil } from 'lucide-react'
import type { Autoescola } from '../types'

const statusConfig = {
  active: {
    label: 'Ativo',
    icon: CheckCircle2,
    className: 'text-emerald-600 bg-emerald-50',
  },
  trial: {
    label: 'Trial',
    icon: Clock,
    className: 'text-amber-600 bg-amber-50',
  },
  suspended: {
    label: 'Suspenso',
    icon: XCircle,
    className: 'text-red-600 bg-red-50',
  },
}

const planoLabel: Record<string, string> = {
  basico: 'Básico',
  pro: 'Pro',
  enterprise: 'Enterprise',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

interface Props {
  clientes: Autoescola[]
}

export function ClientesList({ clientes }: Props) {
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Clientes</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {clientes.length} autoescola{clientes.length !== 1 ? 's' : ''} cadastrada
            {clientes.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/admin/clientes/novo"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-teal text-white text-sm font-semibold rounded-xl hover:bg-brand-teal-dark transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Nova Autoescola
        </Link>
      </div>

      {clientes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
          <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Nenhum cliente cadastrado</p>
          <p className="text-slate-400 text-sm mt-1">
            Clique em "Nova Autoescola" para começar.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3.5">
                  Autoescola
                </th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3.5">
                  Slug / URL
                </th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3.5">
                  Plano
                </th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3.5">
                  Status
                </th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3.5">
                  Criado em
                </th>
                <th className="px-4 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {clientes.map((c) => {
                const st = statusConfig[c.status] ?? statusConfig.active
                const StatusIcon = st.icon
                return (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-brand-teal/10 flex items-center justify-center shrink-0">
                          {c.logo_url ? (
                            <img
                              src={c.logo_url}
                              alt={c.nome}
                              className="w-6 h-6 object-contain rounded"
                            />
                          ) : (
                            <Building2 className="w-4 h-4 text-brand-teal" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{c.nome}</p>
                          {c.cnpj && (
                            <p className="text-xs text-slate-400">
                              {c.cnpj.replace(
                                /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
                                '$1.$2.$3/$4-$5'
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <code className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md font-mono">
                        /{c.slug}
                      </code>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-slate-700 font-medium capitalize">
                        {planoLabel[c.plano] ?? c.plano}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${st.className}`}
                      >
                        <StatusIcon className="w-3 h-3" />
                        {st.label}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-slate-500">
                      {formatDate(c.created_at)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/admin/clientes/${c.id}/editar`}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-brand-teal transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Editar
                        </Link>
                        <Link
                          href={`/admin/clientes/${c.id}/usuarios`}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-brand-teal transition-colors"
                        >
                          <Users className="w-3.5 h-3.5" />
                          Usuários
                        </Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
