import { redirect } from 'next/navigation'
import { getInstructorSession, logoutInstrutor } from '@/features/instrutor/actions/authInstrutor'
import { LogOut } from 'lucide-react'

interface Props {
  children: React.ReactNode
  params: Promise<{ escola: string }>
}

export default async function InstructorLayout({ children, params }: Props) {
  const { escola } = await params
  const session = await getInstructorSession(escola)

  if (!session) {
    redirect(`/${escola}/instrutor/login`)
  }

  return (
    <div className="min-h-screen bg-[--p-bg-base]">
      {/* Header */}
      <header className="bg-gradient-to-r from-indigo-900 via-purple-900 to-purple-800 border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div>
            <p className="text-xs text-white/50 uppercase tracking-widest font-medium">
              Painel do Instrutor
            </p>
            <p className="text-sm font-bold text-white leading-tight">{session.name}</p>
          </div>
          <form
            action={async () => {
              'use server'
              await logoutInstrutor()
              redirect(`/${escola}/instrutor/login`)
            }}
          >
            <button
              type="submit"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors text-sm"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
