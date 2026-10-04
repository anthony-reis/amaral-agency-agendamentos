'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { autoescolaTemFeature } from '@/lib/features.server'
import { criarSessaoAluno } from '../lib/sessaoAluno'
import type { Student, StudentCredits } from '../types'

export interface VerificarCpfResult {
  success: true
  student: Student
  credits: StudentCredits
  precisaCriarSenha: boolean
  /** true quando a autoescola não exige senha: a sessão já foi criada. */
  autenticado: boolean
}
export interface VerificarCpfError {
  success: false
  error: string
}
export type VerificarCpfResponse = VerificarCpfResult | VerificarCpfError

/**
 * Etapa 1: localiza o aluno pelo CPF/CNH e mostra os créditos. Com o módulo
 * "login_senha_aluno" ligado NÃO autentica ainda — a etapa 2 (confirmarSenha)
 * é quem loga. Desligado, o CPF/CNH basta (fluxo original) e a sessão é
 * criada aqui.
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

  const exigeSenha = await autoescolaTemFeature(autoescola_id, 'login_senha_aluno')
  if (!exigeSenha) await criarSessaoAluno(student)

  return {
    success: true,
    student: studentSemSenha,
    credits,
    precisaCriarSenha: exigeSenha && !password,
    autenticado: !exigeSenha,
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

  await criarSessaoAluno(student)

  return { success: true }
}
