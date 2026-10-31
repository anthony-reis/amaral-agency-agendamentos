'use client'

import { useRouter } from 'next/navigation'
import { useAvisoRealtime } from '@/lib/useAvisoRealtime'

/**
 * Recarrega a tela do aluno quando uma aula dele muda (ex.: o instrutor
 * antecipou o horário, a autoescola remarcou ou cancelou). Canal só do aluno:
 * mudanças de outros alunos não disparam nada aqui.
 */
export function AulasAoVivo({ studentId }: { studentId: string }) {
  const router = useRouter()
  useAvisoRealtime(`aluno:${studentId}`, 'agendamentos', () => router.refresh())
  return null
}
