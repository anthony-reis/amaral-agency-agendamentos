import 'server-only'

import { createHash } from 'crypto'
import { cache } from 'react'
import { createServiceClient } from '@/lib/supabase/server'
import { decodificarImagem, lerImagemDeArquivo } from '@/lib/evidenciasSolicitacao'
import { urlAssinadaAnexo } from '@/lib/anexosAluno.server'
import type { ContratoAluno, ContratoComUrls, ContratoModelo } from '@/lib/contratos'

type Supabase = ReturnType<typeof createServiceClient>

export const BUCKET_CONTRATOS = 'contratos-evidencias'
const URL_ASSINADA_SEGUNDOS = 60 * 60

export function hashTexto(texto: string): string {
  return createHash('sha256').update(texto).digest('hex')
}

/** Versão vigente (a mais recente) do modelo — deduplicado por request. */
export const getModeloVigente = cache(async (autoescola_id: string): Promise<ContratoModelo | null> => {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('contrato_modelos')
    .select('*')
    .eq('autoescola_id', autoescola_id)
    .order('versao', { ascending: false })
    .limit(1)
    .maybeSingle()
  return (data as ContratoModelo | null) ?? null
})

async function assinarEvidencia(supabase: Supabase, path: string | null) {
  if (!path) return null
  const { data } = await supabase.storage.from(BUCKET_CONTRATOS).createSignedUrl(path, URL_ASSINADA_SEGUNDOS)
  return data?.signedUrl ?? null
}

/** Anexa as URLs temporárias de selfie, assinatura e arquivo do contrato. */
export async function comUrls(supabase: Supabase, contratos: ContratoAluno[]): Promise<ContratoComUrls[]> {
  const anexoIds = contratos.map((c) => c.anexo_id).filter((id): id is string => !!id)
  const { data: anexos } = anexoIds.length
    ? await supabase.from('aluno_anexos').select('id, nome, path').in('id', anexoIds)
    : { data: [] as { id: string; nome: string; path: string }[] }
  const porId = new Map((anexos ?? []).map((a) => [a.id, a]))

  return Promise.all(
    contratos.map(async (c) => {
      const anexo = c.anexo_id ? porId.get(c.anexo_id) : undefined
      const [fotoUrl, assinaturaUrl, anexoUrl] = await Promise.all([
        assinarEvidencia(supabase, c.foto_path),
        assinarEvidencia(supabase, c.assinatura_path),
        anexo ? urlAssinadaAnexo(supabase, anexo.path) : Promise.resolve(null),
      ])
      return { ...c, fotoUrl, assinaturaUrl, anexoUrl, anexoNome: anexo?.nome ?? null }
    })
  )
}

/** Sobe selfie + assinatura da assinatura digital: {autoescola}/{aluno}/{contrato}/. */
export async function enviarEvidenciasContrato(
  supabase: Supabase,
  autoescola_id: string,
  student_id: string,
  contrato_id: string,
  fotoEntry: FormDataEntryValue | null,
  assinaturaDataUrl: string | null
): Promise<{ ok: true; foto_path: string; assinatura_path: string } | { ok: false; error: string }> {
  const foto = await lerImagemDeArquivo(fotoEntry)
  if (!foto) return { ok: false, error: 'Tire uma foto do seu rosto para assinar.' }
  const assinatura = decodificarImagem(assinaturaDataUrl)
  if (!assinatura) return { ok: false, error: 'Faça a sua assinatura para continuar.' }

  const pasta = `${autoescola_id}/${student_id}/${contrato_id}`
  const foto_path = `${pasta}/foto.${foto.ext}`
  const assinatura_path = `${pasta}/assinatura.${assinatura.ext}`
  const bucket = supabase.storage.from(BUCKET_CONTRATOS)

  const { error: e1 } = await bucket.upload(foto_path, foto.buffer, { contentType: foto.mime, upsert: true })
  if (e1) return { ok: false, error: 'Erro ao enviar a foto. Tente novamente.' }
  const { error: e2 } = await bucket.upload(assinatura_path, assinatura.buffer, { contentType: assinatura.mime, upsert: true })
  if (e2) {
    await bucket.remove([foto_path])
    return { ok: false, error: 'Erro ao enviar a assinatura. Tente novamente.' }
  }
  return { ok: true, foto_path, assinatura_path }
}

export async function removerEvidenciasContrato(supabase: Supabase, paths: (string | null)[]) {
  const validos = paths.filter((p): p is string => !!p)
  if (validos.length) await supabase.storage.from(BUCKET_CONTRATOS).remove(validos)
}
