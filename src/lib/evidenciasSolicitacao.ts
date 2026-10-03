import 'server-only'

import { randomUUID } from 'crypto'
import type { createServiceClient } from '@/lib/supabase/server'

type Supabase = ReturnType<typeof createServiceClient>

export const BUCKET_EVIDENCIAS_SOLICITACAO = 'solicitacoes-evidencias'
const MAX_BYTES = 5 * 1024 * 1024
const URL_ASSINADA_SEGUNDOS = 60 * 60

/** Converte data:image/(jpeg|png);base64 em buffer, validando tipo e tamanho. */
export function decodificarImagem(dataUrl: string | null | undefined) {
  const m = dataUrl?.match(/^data:(image\/(?:jpeg|png));base64,([A-Za-z0-9+/=]+)$/)
  if (!m) return null
  const buffer = Buffer.from(m[2], 'base64')
  if (buffer.length === 0 || buffer.length > MAX_BYTES) return null
  return { buffer, mime: m[1], ext: m[1] === 'image/png' ? 'png' : 'jpg' }
}

/**
 * Sobe selfie + assinatura antes de criar a solicitação (o id ainda não existe),
 * numa pasta própria por envio: {autoescola}/{aluno}/{uuid}/.
 */
export async function enviarEvidencias(
  supabase: Supabase,
  autoescola_id: string,
  student_id: string,
  fotoDataUrl: string,
  assinaturaDataUrl: string
): Promise<{ ok: true; foto_path: string; assinatura_path: string } | { ok: false; error: string }> {
  const foto = decodificarImagem(fotoDataUrl)
  if (!foto) return { ok: false, error: 'Tire uma foto sua (selfie) para enviar a solicitação.' }
  const assinatura = decodificarImagem(assinaturaDataUrl)
  if (!assinatura) return { ok: false, error: 'Assine para enviar a solicitação.' }

  const pasta = `${autoescola_id}/${student_id}/${randomUUID()}`
  const foto_path = `${pasta}/foto.${foto.ext}`
  const assinatura_path = `${pasta}/assinatura.${assinatura.ext}`
  const bucket = supabase.storage.from(BUCKET_EVIDENCIAS_SOLICITACAO)

  const { error: e1 } = await bucket.upload(foto_path, foto.buffer, { contentType: foto.mime })
  if (e1) return { ok: false, error: 'Erro ao enviar a foto. Tente novamente.' }
  const { error: e2 } = await bucket.upload(assinatura_path, assinatura.buffer, { contentType: assinatura.mime })
  if (e2) {
    await bucket.remove([foto_path])
    return { ok: false, error: 'Erro ao enviar a assinatura. Tente novamente.' }
  }
  return { ok: true, foto_path, assinatura_path }
}

export async function removerEvidencias(supabase: Supabase, paths: (string | null)[]) {
  const validos = paths.filter((p): p is string => !!p)
  if (validos.length) await supabase.storage.from(BUCKET_EVIDENCIAS_SOLICITACAO).remove(validos)
}

/** URLs temporárias para exibir no painel (bucket é privado). */
export async function urlsEvidencias(supabase: Supabase, foto_path: string | null, assinatura_path: string | null) {
  const bucket = supabase.storage.from(BUCKET_EVIDENCIAS_SOLICITACAO)
  const assinar = async (path: string | null) => {
    if (!path) return null
    const { data } = await bucket.createSignedUrl(path, URL_ASSINADA_SEGUNDOS)
    return data?.signedUrl ?? null
  }
  const [fotoUrl, assinaturaUrl] = await Promise.all([assinar(foto_path), assinar(assinatura_path)])
  return { fotoUrl, assinaturaUrl }
}
