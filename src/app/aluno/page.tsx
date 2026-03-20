import { redirect } from 'next/navigation'

export default function AlunoPage() {
  redirect('/entrar?perfil=aluno')
}
