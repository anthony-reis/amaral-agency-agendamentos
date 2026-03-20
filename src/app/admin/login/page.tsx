// Server Component — valida o código secreto no servidor (nunca exposto ao cliente)
import { notFound } from 'next/navigation'
import { AdminLoginForm } from '@/features/admin/components/AdminLoginForm'

interface Props {
  searchParams: Promise<{ code?: string }>
}

export default async function AdminLoginPage({ searchParams }: Props) {
  const { code } = await searchParams

  // ADMIN_ACCESS_CODE não tem prefixo NEXT_PUBLIC_ → nunca vai para o bundle do cliente
  if (!process.env.ADMIN_ACCESS_CODE || code !== process.env.ADMIN_ACCESS_CODE) {
    notFound()
  }

  return <AdminLoginForm />
}
