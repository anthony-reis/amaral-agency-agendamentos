import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { NovoClienteForm } from '@/features/admin/components/NovoClienteForm'

export default function NovoClientePage() {
  return (
    <div>
      {/* Breadcrumb */}
      <Link
        href="/admin/clientes"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors mb-6"
      >
        <ChevronLeft className="w-4 h-4" />
        Voltar para Clientes
      </Link>

      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Nova Autoescola</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Cadastre uma nova autoescola cliente no sistema.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <NovoClienteForm />
      </div>
    </div>
  )
}
