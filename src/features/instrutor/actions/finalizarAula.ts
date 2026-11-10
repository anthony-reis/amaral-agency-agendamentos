'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { getInstructorSession } from './authInstrutor'
import type { ActionResult, InstructorSession } from '@/features/painel/types'

const BUCKET = 'aulas-finalizadas'
type SigExt = 'jpg' | 'png'

/** Aula precisa ser do instrutor logado (sessão, nunca dado do cliente). */
type AulaResolvida =
  | { ok: true; session: InstructorSession; ag: { id: string; km_inicial: number | null } }
  | { ok: false; erro: string }

async function aulaDoInstrutor(escola: string, agendamento_id: string): Promise<AulaResolvida> {
  const session = await getInstructorSession(escola)
  if (!session) return { ok: false, erro: 'Sessão expirada. Entre novamente.' }
  const { data: ag } = await createServiceClient()
    .from('agendamentos')
    .select('id, km_inicial')
    .eq('id', agendamento_id)
    .eq('autoescola_id', session.autoescola_id)
    .eq('instructor_name', session.name)
    .maybeSingle()
  if (!ag) return { ok: false, erro: 'Aula não encontrada na sua agenda.' }
  return { ok: true, session, ag }
}

function caminhos(autoescola_id: string, agendamento_id: string, sigExt: SigExt) {
  const base = `${autoescola_id}/${agendamento_id}`
  return { foto: `${base}/foto.jpg`, assinatura: `${base}/assinatura.${sigExt}`, base }
}

export interface UploadsAula {
  foto: { path: string; token: string }
  assinatura: { path: string; token: string }
}

/**
 * Passo 1: gera URLs assinadas para o navegador enviar foto e assinatura direto
 * ao Storage do Supabase (os arquivos não passam mais pela função da Vercel).
 */
export async function prepararUploadsAula(
  escola: string,
  agendamento_id: string,
  sigExt: SigExt
): Promise<ActionResult<UploadsAula>> {
  const r = await aulaDoInstrutor(escola, agendamento_id)
  if (!r.ok) return { success: false, error: r.erro }

  const p = caminhos(r.session.autoescola_id, agendamento_id, sigExt)
  const storage = createServiceClient().storage.from(BUCKET)
  const [foto, assinatura] = await Promise.all([
    storage.createSignedUploadUrl(p.foto, { upsert: true }),
    storage.createSignedUploadUrl(p.assinatura, { upsert: true }),
  ])
  if (foto.error || assinatura.error || !foto.data || !assinatura.data) {
    return { success: false, error: 'Não foi possível preparar o envio. Tente novamente.' }
  }
  return {
    success: true,
    data: {
      foto: { path: foto.data.path, token: foto.data.token },
      assinatura: { path: assinatura.data.path, token: assinatura.data.token },
    },
  }
}

/** Passo 2: com os arquivos já enviados, valida o KM e conclui a aula. */
export async function concluirAulaComEvidencias(
  escola: string,
  agendamento_id: string,
  sigExt: SigExt,
  kmFinal: number | null
): Promise<ActionResult> {
  const r = await aulaDoInstrutor(escola, agendamento_id)
  if (!r.ok) return { success: false, error: r.erro }
  const { session, ag } = r
  const autoescola_id = session.autoescola_id

  // Se a aula foi iniciada com KM inicial, o KM final é obrigatório.
  if (ag.km_inicial != null) {
    if (kmFinal === null) return { success: false, error: 'Informe o KM final para finalizar a aula.' }
    if (!Number.isFinite(kmFinal) || kmFinal < 0) return { success: false, error: 'KM final inválido.' }
    if (kmFinal < ag.km_inicial) {
      return { success: false, error: `KM final (${kmFinal}) não pode ser menor que o KM inicial (${ag.km_inicial}).` }
    }
  } else if (kmFinal !== null && (!Number.isFinite(kmFinal) || kmFinal < 0)) {
    return { success: false, error: 'KM final inválido.' }
  }

  const supabase = createServiceClient()
  const p = caminhos(autoescola_id, agendamento_id, sigExt)

  // Os dois arquivos precisam ter chegado ao Storage
  const { data: arquivos } = await supabase.storage.from(BUCKET).list(p.base)
  const nomes = new Set((arquivos ?? []).map((a) => a.name))
  if (!nomes.has('foto.jpg')) return { success: false, error: 'Foto obrigatória.' }
  if (!nomes.has(`assinatura.${sigExt}`)) return { success: false, error: 'Assinatura obrigatória.' }

  const photoUrl = supabase.storage.from(BUCKET).getPublicUrl(p.foto).data.publicUrl
  const signatureUrl = supabase.storage.from(BUCKET).getPublicUrl(p.assinatura).data.publicUrl

  const payload: Record<string, unknown> = { status: 'completed', photo_url: photoUrl, signature_url: signatureUrl }
  if (kmFinal !== null) payload.km_final = kmFinal

  const { error } = await supabase
    .from('agendamentos')
    .update(payload)
    .eq('id', agendamento_id)
    .eq('autoescola_id', autoescola_id)
  if (error) return { success: false, error: error.message }

  await supabase.from('activity_logs_painel').insert({
    username: session.name,
    action_type: 'agendamento',
    description: `Instrutor ${session.name} finalizou a aula com evidências (foto + assinatura)${kmFinal !== null ? `, KM final: ${kmFinal}` : ''} — agendamento ${agendamento_id}`,
    metadata: { agendamento_id, ...(kmFinal !== null ? { km_final: kmFinal } : {}) },
    autoescola_id,
  })

  return { success: true, data: undefined }
}
