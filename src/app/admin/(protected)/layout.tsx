import { redirect } from 'next/navigation'
import { AdminNav } from '@/features/admin/components/AdminNav'
import { getAdminSession } from '@/features/admin/actions/authAdmin'

export const metadata = {
  title: 'Admin — AmaralPro',
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Verificação dupla: sessão Auth (middleware) + registro em admin_users
  const admin = await getAdminSession()
  if (!admin) {
    redirect('/admin/login')
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-[#0f172a]">
      <AdminNav />
      <main className="flex-1 p-8 overflow-auto">
        {children}
      </main>
    </div>
  )
}
