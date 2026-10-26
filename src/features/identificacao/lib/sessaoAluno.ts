import 'server-only'

import { cookies } from 'next/headers'
import { signStudentId } from '@/lib/studentSession'
import { createServiceClient } from '@/lib/supabase/server'
import { registrarAtividadeAluno } from '@/lib/atividadeAluno.server'

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

  await registrarAcessoAluno(student)
}

/** Rastreio: acesso do aluno ao app (no máx. 1 registro a cada 30 min por aluno). */
async function registrarAcessoAluno(student: { id: string; name: string; document_id: string }) {
  try {
    const supabase = createServiceClient()
    const { data: row } = await supabase.from('students').select('autoescola_id').eq('id', student.id).maybeSingle()
    if (!row?.autoescola_id) return
    const desde = new Date(Date.now() - 30 * 60 * 1000).toISOString()
    const { count } = await supabase
      .from('activity_logs_painel')
      .select('id', { count: 'exact', head: true })
      .eq('autoescola_id', row.autoescola_id)
      .eq('action_type', 'aluno_acesso')
      .contains('metadata', { student_id: student.id })
      .gte('created_at', desde)
    if ((count ?? 0) > 0) return
    await registrarAtividadeAluno(supabase, row.autoescola_id, student, 'aluno_acesso', `Aluno acessou o app: ${student.name} (Doc: ${student.document_id})`)
  } catch (err) {
    console.error('[sessaoAluno] falha ao registrar acesso:', err)
  }
}
