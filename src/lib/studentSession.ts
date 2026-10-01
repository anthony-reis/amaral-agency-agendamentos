import 'server-only'

import { createHmac, timingSafeEqual } from 'crypto'

// Assina o student_id para o cookie auxiliar `student_sig`, usado apenas nas
// rotas sensíveis de pagamento (loja). O cookie legado `student_id` continua
// sem assinatura para não quebrar os demais fluxos do aluno (agendar,
// comunicados, solicitações, créditos) já em produção — este helper só
// endurece o caminho que movimenta dinheiro.
function getSecret(): string {
  const secret = process.env.STUDENT_SESSION_SECRET
  if (!secret) throw new Error('STUDENT_SESSION_SECRET não configurada.')
  return secret
}

export function signStudentId(studentId: string): string {
  return createHmac('sha256', getSecret()).update(studentId).digest('hex')
}

export function verifyStudentSignature(studentId: string, signature: string | undefined): boolean {
  if (!signature) return false
  const esperado = signStudentId(studentId)
  const a = Buffer.from(esperado, 'utf8')
  const b = Buffer.from(signature, 'utf8')
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}
