'use server'

import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/server'
import { signStudentId } from '@/lib/studentSession'
import type { Student, StudentCredits } from '../types'

const COOKIE_MAX_AGE = 60 * 60 * 4 // 4 horas

export interface VerificarCpfResult {
  success: true
  student: Student
  credits: StudentCredits
  precisaCriarSenha: boolean
}
export interface VerificarCpfError {
  success: false
  error: string
}
export type VerificarCpfResponse = VerificarCpfResult | VerificarCpfError

/**
 * Etapa 1: localiza o aluno pelo CPF/CNH e mostra os créditos — mas NÃO
 * autentica ainda (nenhum cookie de sessão é gravado aqui). A etapa 2
 * (confirmarSenha) é quem efetivamente loga o aluno.
 */
export async function verificarCpf(documentId: string, autoescola_id: string): Promise<VerificarCpfResponse> {
  const cleaned = documentId.replace(/\D/g, '').trim()

  if (!cleaned || (cleaned.length !== 11 && cleaned.length !== 18)) {
    return { success: false, error: 'Informe um CPF (11 dígitos) ou CNH (11 dígitos) válido.' }
  }

  const supabase = createServiceClient()

  const { data: student, error: studentError } = await supabase
    .from('students')
    .select('id, name, email, phone, document_id, registration_number, created_at, password')
    .eq('document_id', cleaned)
    .eq('autoescola_id', autoescola_id)
    .single()

  if (studentError || !student) {
    return { success: false, error: 'Aluno não encontrado. Verifique o CPF ou CNH informado.' }
  }

  const { data: credits, error: creditsError } = await supabase
    .from('student_credits')
    .select('*')
    .eq('student_id', student.id)
    .single()

  if (creditsError || !credits) {
    return { success: false, error: 'Não foi possível carregar seus créditos. Contate a autoescola.' }
  }

  // Nunca devolver a senha ao cliente.
  const { password, ...studentSemSenha } = student

  return {
    success: true,
    student: studentSemSenha,
    credits,
    precisaCriarSenha: !password,
  }
}

export type ConfirmarSenhaResponse =
  | { success: true }
  | { success: false; error: string }

/**
 * Etapa 2: primeiro acesso do aluno (sem senha registrada) — a senha digitada
 * agora vira a senha definitiva. Acessos seguintes exigem a senha já
 * registrada. Só aqui a sessão (cookies) é efetivamente criada.
 */
export async function confirmarSenha(
  studentId: string,
  autoescola_id: string,
  senha: string
): Promise<ConfirmarSenhaResponse> {
  const senhaLimpa = senha.trim()
  if (senhaLimpa.length < 4) {
    return { success: false, error: 'A senha deve ter pelo menos 4 caracteres.' }
  }

  const supabase = createServiceClient()
  const { data: student } = await supabase
    .from('students')
    .select('id, name, document_id, password')
    .eq('id', studentId)
    .eq('autoescola_id', autoescola_id)
    .single()

  if (!student) return { success: false, error: 'Aluno não encontrado.' }

  if (!student.password) {
    const { error } = await supabase
      .from('students')
      .update({ password: senhaLimpa })
      .eq('id', student.id)
    if (error) return { success: false, error: 'Erro ao criar senha. Tente novamente.' }
  } else if (student.password !== senhaLimpa) {
    return { success: false, error: 'Senha incorreta.' }
  }

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
  cookieStore.set('student_sig', signStudentId(student.id), {
    httpOnly: true, secure: isProd, sameSite: 'lax', maxAge: COOKIE_MAX_AGE, path: '/',
  })

  return { success: true }
}
