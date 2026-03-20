import { redirect } from 'next/navigation'

// Moctran migrou para /moctran/aluno — mantemos este redirect para compatibilidade
export default function AlunoPage() {
  redirect('/moctran/aluno')
}
