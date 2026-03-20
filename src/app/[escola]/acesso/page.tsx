import Link from 'next/link'
import { Shield, Car } from 'lucide-react'

interface Props {
  params: Promise<{ escola: string }>
}

export default async function AcessoPage({ params }: Props) {
  const { escola } = await params

  return (
    <div className="min-h-screen bg-[--p-bg-base] flex flex-col items-center justify-center px-4">
      {/* Back */}
      <div className="w-full max-w-sm mb-6">
        <Link
          href={`/entrar?perfil=escola`}
          className="text-sm text-[--p-text-3] hover:text-[--p-text-1] transition-colors"
        >
          ← Voltar
        </Link>
      </div>

      {/* Header */}
      <div className="text-center mb-8">
        <p className="text-xs font-semibold text-[--p-accent] uppercase tracking-widest mb-2">
          Como deseja entrar?
        </p>
        <h1 className="text-2xl font-bold text-[--p-text-1]">
          Escolha seu perfil
        </h1>
        <p className="text-sm text-[--p-text-3] mt-1">
          Selecione o tipo de acesso para continuar.
        </p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-sm sm:max-w-xl">
        <Link
          href={`/${escola}/painel/login`}
          className="group flex flex-col items-center gap-4 p-8 bg-[--p-bg-card] rounded-2xl border border-[--p-border] hover:border-[--p-accent]/40 hover:bg-[--p-hover] transition-all text-center"
        >
          <div className="w-14 h-14 rounded-2xl bg-[--p-accent]/10 flex items-center justify-center group-hover:bg-[--p-accent]/20 transition-colors">
            <Shield className="w-7 h-7 text-[--p-accent]" />
          </div>
          <div>
            <p className="font-bold text-[--p-text-1] text-lg">Administrador</p>
            <p className="text-sm text-[--p-text-3] mt-1">
              Gerencie agendamentos, instrutores e alunos da autoescola.
            </p>
          </div>
          <span className="mt-auto text-xs font-semibold text-[--p-accent] group-hover:underline">
            Entrar como admin →
          </span>
        </Link>

        <Link
          href={`/${escola}/instrutor/login`}
          className="group flex flex-col items-center gap-4 p-8 bg-[--p-bg-card] rounded-2xl border border-[--p-border] hover:border-purple-500/40 hover:bg-purple-500/5 transition-all text-center"
        >
          <div className="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
            <Car className="w-7 h-7 text-purple-400" />
          </div>
          <div>
            <p className="font-bold text-[--p-text-1] text-lg">Instrutor</p>
            <p className="text-sm text-[--p-text-3] mt-1">
              Visualize e gerencie suas aulas e alunos do dia.
            </p>
          </div>
          <span className="mt-auto text-xs font-semibold text-purple-400 group-hover:underline">
            Entrar como instrutor →
          </span>
        </Link>
      </div>
    </div>
  )
}
