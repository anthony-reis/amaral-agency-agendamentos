'use server'

import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/server'
import type { VerificarCreditosResponse } from '../types'

export async function verificarCreditos(
  documentId: string,
  autoescola_id: string
): Promise<VerificarCreditosResponse> {
  const cleaned = documentId.replace(/\D/g, '').trim()

  if (!cleaned || (cleaned.length !== 11 && cleaned.length !== 18)) {
    return {
      success: false,
      error: 'Informe um CPF (11 dígitos) ou CNH (11 dígitos) válido.',
    }
  }

  const supabase = createServiceClient()

  const { data: student, error: studentError } = await supabase
    .from('students')
    .select('id, name, email, phone, document_id, registration_number, created_at')
    .eq('document_id', cleaned)
    .eq('autoescola_id', autoescola_id)
    .single()

  if (studentError || !student) {
    return {
      success: false,
      error: 'Aluno não encontrado. Verifique o CPF ou CNH informado.',
    }
  }

  const { data: credits, error: creditsError } = await supabase
    .from('student_credits')
    .select('*')
    .eq('student_id', student.id)
    .single()

  if (creditsError || !credits) {
    return {
      success: false,
      error: 'Não foi possível carregar seus créditos. Contate a autoescola.',
    }
  }

  const cookieStore = await cookies()
  cookieStore.set('student_id', student.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 4, // 4 hours
    path: '/',
  })
  cookieStore.set('student_name', student.name, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 4,
    path: '/',
  })
  cookieStore.set('student_document', student.document_id, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 4,
    path: '/',
  })

  return { success: true, student, credits }
}
