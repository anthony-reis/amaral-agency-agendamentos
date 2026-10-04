'use server'

import { cookies, headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'
import { getTermosVigentes } from '@/lib/termos.server'
import { DOCUMENTOS, documentosDaVersao, type TipoDocumento } from '@/lib/termos'

export type AceitarTermosResponse = { success: true } | { success: false; error: string; desatualizado?: boolean }

/**
 * Registra o aceite do aluno (primeiro acesso). O aluno vem do cookie de
 * sessão; a versão precisa ser a vigente e todos os documentos dela precisam
 * ter sido lidos até o fim no app.
 */
export async function aceitarTermos(
  escola: string,
  termos_versao_id: string,
  documentosLidos: TipoDocumento[]
): Promise<AceitarTermosResponse> {
  const cookieStore = await cookies()
  const studentId = cookieStore.get('student_id')?.value
  if (!studentId) return { success: false, error: 'Sua sessão expirou. Entre novamente.' }

  const supabase = createServiceClient()
  const { data: autoescola } = await supabase
    .from('autoescolas')
    .select('id, nome')
    .eq('slug', escola)
    .maybeSingle()
  if (!autoescola) return { success: false, error: 'Autoescola não encontrada.' }

  const { data: student } = await supabase
    .from('students')
    .select('id, name, document_id')
    .eq('id', studentId)
    .eq('autoescola_id', autoescola.id)
    .maybeSingle()
  if (!student) return { success: false, error: 'Aluno não encontrado. Entre novamente.' }

  const vigente = await getTermosVigentes(autoescola.id)
  if (!vigente || vigente.id !== termos_versao_id) {
    return { success: false, desatualizado: true, error: 'Os termos foram atualizados agora há pouco. Leia a nova versão.' }
  }

  const faltando = documentosDaVersao(vigente).filter((d) => !documentosLidos.includes(d))
  if (faltando.length > 0) {
    return { success: false, error: `Leia até o fim: ${faltando.map((d) => DOCUMENTOS[d].titulo).join(' e ')}.` }
  }

  const h = await headers()
  const ip = (h.get('x-forwarded-for')?.split(',')[0] ?? h.get('x-real-ip') ?? '').trim() || null
  const userAgent = h.get('user-agent')?.slice(0, 500) ?? null

  const { data: inserido, error } = await supabase
    .from('termos_aceites')
    .upsert(
      {
        autoescola_id: autoescola.id,
        student_id: student.id,
        termos_versao_id: vigente.id,
        student_name: student.name,
        student_document: student.document_id,
        ip,
        user_agent: userAgent,
      },
      { onConflict: 'student_id,termos_versao_id', ignoreDuplicates: true }
    )
    .select('id')

  if (error) return { success: false, error: 'Não foi possível registrar seu aceite. Tente novamente.' }

  // Duplo clique / duas abas: só o primeiro aceite gera log.
  if (inserido && inserido.length > 0) {
    const docs = documentosDaVersao(vigente).map((d) => DOCUMENTOS[d].titulo).join(' e ')
    await supabase.from('activity_logs_painel').insert({
      username: student.name,
      action_type: 'termos',
      description: `Aluno aceitou ${docs} (versão ${vigente.versao}): ${student.name} (Doc: ${student.document_id})`,
      metadata: {
        student_id: student.id,
        student_document: student.document_id,
        termos_versao_id: vigente.id,
        versao: vigente.versao,
        documentos: documentosDaVersao(vigente),
        ip,
        user_agent: userAgent,
      },
      autoescola_id: autoescola.id,
    })
  }

  revalidatePath(`/${escola}/aluno`, 'layout')
  return { success: true }
}
