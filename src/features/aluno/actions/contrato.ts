'use server'

import { cookies, headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'
import { bloqueioFeature } from '@/lib/features.server'
import { comUrls, enviarEvidenciasContrato, removerEvidenciasContrato } from '@/lib/contratos.server'
import type { ContratoAluno, ContratoComUrls } from '@/lib/contratos'

export type AssinarContratoResponse = { success: true } | { success: false; error: string }

/** Contratos do aluno logado (pendente e assinado), mais recente primeiro. */
export async function listarMeusContratos(autoescola_id: string, student_id: string): Promise<ContratoComUrls[]> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('contratos_aluno')
    .select('*')
    .eq('autoescola_id', autoescola_id)
    .eq('student_id', student_id)
    .in('status', ['pendente', 'assinado'])
    .order('created_at', { ascending: false })
  return comUrls(supabase, (data ?? []) as ContratoAluno[])
}

/**
 * O aluno assina o contrato pendente: assinatura (canvas) + selfie no momento.
 * Aluno vem do cookie de sessão; guarda IP, aparelho e a hora da assinatura.
 * Recebe FormData: escola, contrato_id, aceite, foto (arquivo), assinatura (data URL).
 */
export async function assinarContrato(formData: FormData): Promise<AssinarContratoResponse> {
  const campo = (k: string) => {
    const v = formData.get(k)
    return typeof v === 'string' && v !== '' ? v : null
  }
  const escola = campo('escola') ?? ''
  const contratoId = campo('contrato_id') ?? ''
  if (campo('aceite') !== 'true') return { success: false, error: 'Marque que leu e concorda com o contrato.' }

  const cookieStore = await cookies()
  const studentId = cookieStore.get('student_id')?.value
  if (!studentId) return { success: false, error: 'Sua sessão expirou. Entre novamente.' }

  const supabase = createServiceClient()
  const { data: autoescola } = await supabase.from('autoescolas').select('id').eq('slug', escola).maybeSingle()
  if (!autoescola) return { success: false, error: 'Autoescola não encontrada.' }

  const bloqueio = await bloqueioFeature(autoescola.id, 'contratos')
  if (bloqueio) return { success: false, error: bloqueio }

  const { data: student } = await supabase.from('students').select('id, name, document_id').eq('id', studentId).eq('autoescola_id', autoescola.id).maybeSingle()
  if (!student) return { success: false, error: 'Aluno não encontrado. Entre novamente.' }

  const { data: contrato } = await supabase
    .from('contratos_aluno')
    .select('id, status, origem, titulo')
    .eq('id', contratoId)
    .eq('student_id', student.id)
    .eq('autoescola_id', autoescola.id)
    .maybeSingle()
  if (!contrato || contrato.origem !== 'digital') return { success: false, error: 'Contrato não encontrado.' }
  if (contrato.status === 'assinado') return { success: false, error: 'Este contrato já foi assinado.' }
  if (contrato.status !== 'pendente') return { success: false, error: 'Este contrato não está mais disponível para assinatura.' }

  const evidencias = await enviarEvidenciasContrato(supabase, autoescola.id, student.id, contrato.id, formData.get('foto'), campo('assinatura'))
  if (!evidencias.ok) return { success: false, error: evidencias.error }

  const h = await headers()
  const ip = (h.get('x-forwarded-for')?.split(',')[0] ?? h.get('x-real-ip') ?? '').trim() || null
  const userAgent = h.get('user-agent')?.slice(0, 500) ?? null

  // Só o primeiro envio vira assinado (duplo clique / duas abas)
  const { data: atualizado } = await supabase
    .from('contratos_aluno')
    .update({
      status: 'assinado',
      assinado_em: new Date().toISOString(),
      ip,
      user_agent: userAgent,
      foto_path: evidencias.foto_path,
      assinatura_path: evidencias.assinatura_path,
    })
    .eq('id', contrato.id)
    .eq('status', 'pendente')
    .select('id')
  if (!atualizado || atualizado.length === 0) {
    await removerEvidenciasContrato(supabase, [evidencias.foto_path, evidencias.assinatura_path])
    return { success: false, error: 'Este contrato já foi assinado ou cancelado.' }
  }

  await supabase.from('activity_logs_painel').insert({
    username: student.name,
    action_type: 'contrato',
    description: `Aluno assinou o contrato: ${student.name} (Doc: ${student.document_id})`,
    metadata: { student_id: student.id, contrato_id: contrato.id, ip, user_agent: userAgent },
    autoescola_id: autoescola.id,
  })

  revalidatePath(`/${escola}/aluno/contrato`)
  return { success: true }
}
