'use server'

import { createHash, randomInt } from 'crypto'
import { createServiceClient } from '@/lib/supabase/server'
import { autoescolaTemFeature } from '@/lib/features.server'
import { emailConfigurado, enviarEmail, mascararEmail, escapeHtml } from '@/lib/email.server'
import { criarSessaoAluno } from '../lib/sessaoAluno'

const VALIDADE_MIN = 15
const MAX_TENTATIVAS = 5
const INTERVALO_REENVIO_S = 60
const MAX_CODIGOS_POR_HORA = 5

function hashCodigo(studentId: string, codigo: string) {
  return createHash('sha256').update(`${studentId}:${codigo}`).digest('hex')
}

export type SolicitarRecuperacaoResponse =
  | { success: true; emailMascarado: string }
  | { success: false; error: string; semEmail?: boolean }

/**
 * "Esqueci minha senha": gera um código de 6 dígitos e envia para o e-mail
 * cadastrado do aluno. Sem e-mail cadastrado (ou envio não configurado), o
 * aluno é orientado a pedir o reset na autoescola (painel → Alunos).
 */
export async function solicitarRecuperacaoSenha(
  studentId: string,
  autoescola_id: string
): Promise<SolicitarRecuperacaoResponse> {
  if (!(await autoescolaTemFeature(autoescola_id, 'login_senha_aluno'))) {
    return { success: false, error: 'Este recurso não está habilitado para esta autoescola.' }
  }

  const supabase = createServiceClient()
  const { data: student } = await supabase
    .from('students')
    .select('id, name, email')
    .eq('id', studentId)
    .eq('autoescola_id', autoescola_id)
    .maybeSingle()

  if (!student) return { success: false, error: 'Aluno não encontrado.' }

  const email = student.email?.trim()
  if (!email || !emailConfigurado()) {
    return {
      success: false,
      semEmail: true,
      error: email
        ? 'A recuperação por e-mail não está disponível no momento. Peça à autoescola para redefinir sua senha.'
        : 'Você não tem e-mail cadastrado. Peça à autoescola para redefinir sua senha.',
    }
  }

  // Limite de envios: evita spam na caixa do aluno.
  const umaHoraAtras = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { data: recentes } = await supabase
    .from('student_password_resets')
    .select('created_at')
    .eq('student_id', student.id)
    .gte('created_at', umaHoraAtras)
    .order('created_at', { ascending: false })

  if (recentes && recentes.length > 0) {
    const ultimo = new Date(recentes[0].created_at).getTime()
    if (Date.now() - ultimo < INTERVALO_REENVIO_S * 1000) {
      return { success: false, error: 'Aguarde um minuto antes de pedir um novo código.' }
    }
    if (recentes.length >= MAX_CODIGOS_POR_HORA) {
      return { success: false, error: 'Muitas solicitações. Tente novamente mais tarde ou fale com a autoescola.' }
    }
  }

  const codigo = randomInt(0, 1_000_000).toString().padStart(6, '0')

  // Só o código mais recente vale.
  await supabase
    .from('student_password_resets')
    .update({ used_at: new Date().toISOString() })
    .eq('student_id', student.id)
    .is('used_at', null)

  const { error: insertError } = await supabase.from('student_password_resets').insert({
    student_id: student.id,
    autoescola_id,
    code_hash: hashCodigo(student.id, codigo),
    expires_at: new Date(Date.now() + VALIDADE_MIN * 60 * 1000).toISOString(),
  })
  if (insertError) return { success: false, error: 'Erro ao gerar o código. Tente novamente.' }

  const { data: escola } = await supabase
    .from('autoescolas')
    .select('nome')
    .eq('id', autoescola_id)
    .maybeSingle()
  const nomeEscola = escola?.nome ?? 'sua autoescola'
  const primeiroNome = student.name.split(' ')[0]

  const envio = await enviarEmail({
    to: email,
    subject: `${codigo} é seu código para redefinir a senha`,
    text:
      `Olá, ${primeiroNome}!\n\n` +
      `Seu código para redefinir a senha em ${nomeEscola} é: ${codigo}\n\n` +
      `Ele vale por ${VALIDADE_MIN} minutos. Se não foi você que pediu, ignore este e-mail.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#0f172a">
        <p>Olá, ${escapeHtml(primeiroNome)}!</p>
        <p>Seu código para redefinir a senha em <strong>${escapeHtml(nomeEscola)}</strong> é:</p>
        <p style="font-size:32px;font-weight:bold;letter-spacing:8px;margin:24px 0">${codigo}</p>
        <p style="color:#64748b;font-size:14px">Ele vale por ${VALIDADE_MIN} minutos. Se não foi você que pediu, ignore este e-mail.</p>
      </div>`,
  })
  if (!envio.ok) return { success: false, error: 'Não foi possível enviar o e-mail. Tente novamente em instantes.' }

  return { success: true, emailMascarado: mascararEmail(email) }
}

export type RedefinirSenhaResponse = { success: true } | { success: false; error: string }

/** Valida o código recebido por e-mail, grava a nova senha e já loga o aluno. */
export async function redefinirSenhaComCodigo(
  studentId: string,
  autoescola_id: string,
  codigo: string,
  novaSenha: string
): Promise<RedefinirSenhaResponse> {
  const codigoLimpo = codigo.replace(/\D/g, '')
  const senhaLimpa = novaSenha.trim()
  if (codigoLimpo.length !== 6) return { success: false, error: 'Informe o código de 6 dígitos.' }
  if (senhaLimpa.length < 4) return { success: false, error: 'A senha deve ter pelo menos 4 caracteres.' }

  const supabase = createServiceClient()
  const { data: reset } = await supabase
    .from('student_password_resets')
    .select('id, code_hash, attempts, expires_at')
    .eq('student_id', studentId)
    .eq('autoescola_id', autoescola_id)
    .is('used_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!reset || new Date(reset.expires_at).getTime() < Date.now()) {
    return { success: false, error: 'Código expirado. Peça um novo código.' }
  }
  if (reset.attempts >= MAX_TENTATIVAS) {
    return { success: false, error: 'Muitas tentativas. Peça um novo código.' }
  }

  if (reset.code_hash !== hashCodigo(studentId, codigoLimpo)) {
    await supabase
      .from('student_password_resets')
      .update({ attempts: reset.attempts + 1 })
      .eq('id', reset.id)
    const restantes = MAX_TENTATIVAS - reset.attempts - 1
    return {
      success: false,
      error: restantes > 0 ? `Código incorreto. ${restantes} tentativa(s) restante(s).` : 'Muitas tentativas. Peça um novo código.',
    }
  }

  // Marca como usado antes de trocar a senha: o mesmo código não serve duas vezes.
  const { data: marcado } = await supabase
    .from('student_password_resets')
    .update({ used_at: new Date().toISOString() })
    .eq('id', reset.id)
    .is('used_at', null)
    .select('id')
  if (!marcado || marcado.length === 0) return { success: false, error: 'Código já utilizado. Peça um novo código.' }

  const { data: student, error } = await supabase
    .from('students')
    .update({ password: senhaLimpa })
    .eq('id', studentId)
    .eq('autoescola_id', autoescola_id)
    .select('id, name, document_id')
    .single()
  if (error || !student) return { success: false, error: 'Erro ao salvar a nova senha. Tente novamente.' }

  await criarSessaoAluno(student)
  return { success: true }
}
