import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CreditCard } from 'lucide-react'
import { createServiceClient } from '@/lib/supabase/server'
import { obterCredenciaisMP } from '@/features/admin/actions/pagamentos'
import { PagamentosMPForm } from '@/features/admin/components/PagamentosMPForm'

interface Props {
  params: Promise<{ id: string }>
}

export default async function PagamentosPage({ params }: Props) {
  const { id } = await params
  const supabase = createServiceClient()

  const { data: autoescola } = await supabase
    .from('autoescolas')
    .select('id, nome, slug')
    .eq('id', id)
    .single()

  if (!autoescola) notFound()

  const credenciais = await obterCredenciaisMP(id)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://SEU-DOMINIO'
  const webhookUrl = `${appUrl}/api/webhooks/mercadopago?autoescola_id=${id}`

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/admin/clientes/${id}/editar`}
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para {autoescola.nome}
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-teal/10 flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-brand-teal" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Pagamentos — Mercado Pago</h1>
            <p className="text-sm text-slate-500">{autoescola.nome}</p>
          </div>
        </div>
      </div>

      <PagamentosMPForm autoescola_id={id} credenciais={credenciais} webhookUrl={webhookUrl} />
    </div>
  )
}
