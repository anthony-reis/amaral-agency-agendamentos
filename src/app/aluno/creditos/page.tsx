import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function CreditosPage() {
  const cookieStore = await cookies()
  const studentName = cookieStore.get('student_name')?.value
  const studentId = cookieStore.get('student_id')?.value

  if (!studentId) {
    redirect('/moctran/aluno')
  }

  return (
    <main className="min-h-screen bg-gradient-navy flex flex-col items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-card-lg p-8 w-full max-w-sm text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto">
          <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-slate-800">
          Bem-vindo{studentName ? `, ${studentName.split(' ')[0]}` : ''}!
        </h2>
        <p className="text-sm text-slate-500">
          Identificação realizada com sucesso. Em breve esta tela exibirá seus créditos e opções de agendamento.
        </p>
      </div>
    </main>
  )
}
