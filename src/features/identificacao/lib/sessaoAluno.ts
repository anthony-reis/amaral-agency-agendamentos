import 'server-only'

import { cookies } from 'next/headers'
import { signStudentId } from '@/lib/studentSession'

// Fica fora dos arquivos 'use server' de propósito: exportada de lá, viraria
// uma server action pública capaz de logar como qualquer aluno.

const COOKIE_MAX_AGE = 60 * 60 * 4 // 4 horas

export async function criarSessaoAluno(student: { id: string; name: string; document_id: string }) {
  const cookieStore = await cookies()
  const isProd = process.env.NODE_ENV === 'production'
  cookieStore.set('student_id', student.id, {
    httpOnly: true, secure: isProd, sameSite: 'lax', maxAge: COOKIE_MAX_AGE, path: '/',
  })
  cookieStore.set('student_name', student.name, {
    httpOnly: false, secure: isProd, sameSite: 'lax', maxAge: COOKIE_MAX_AGE, path: '/',
  })
  cookieStore.set('student_document', student.document_id, {
    httpOnly: false, secure: isProd, sameSite: 'lax', maxAge: COOKIE_MAX_AGE, path: '/',
  })
  // student_sig só é exigido nas rotas de pagamento (loja). Sem a env
  // STUDENT_SESSION_SECRET o login continua funcionando; só a loja fica
  // indisponível.
  try {
    cookieStore.set('student_sig', signStudentId(student.id), {
      httpOnly: true, secure: isProd, sameSite: 'lax', maxAge: COOKIE_MAX_AGE, path: '/',
    })
  } catch (err) {
    console.error('[sessaoAluno] student_sig não gerado:', err)
  }
}
