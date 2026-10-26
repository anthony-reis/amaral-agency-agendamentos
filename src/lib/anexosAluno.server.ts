import 'server-only'

import { randomUUID } from 'crypto'
import type { createServiceClient } from '@/lib/supabase/server'

type Supabase = ReturnType<typeof createServiceClient>

export const BUCKET_ANEXOS_ALUNO = 'alunos-anexos'
/** 4 MB: abaixo do limite de corpo das funções da Vercel (4,5 MB). */
export const ANEXO_MAX_BYTES = 4 * 1024 * 1024
const URL_ASSINADA_SEGUNDOS = 60 * 60

const EXT_POR_MIME: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export interface AnexoEnviado {
  path: string
  nome: string
  mime: string
  tamanho: number
}

/** Valida o arquivo do FormData e sobe para {autoescola}/{aluno}/{uuid}.ext. */
export async function enviarArquivoAnexo(
  supabase: Supabase,
  autoescola_id: string,
  student_id: string,
  arquivo: FormDataEntryValue | null
): Promise<{ ok: true; anexo: AnexoEnviado } | { ok: false; error: string }> {
  if (!(arquivo instanceof File) || arquivo.size === 0) return { ok: false, error: 'Selecione um arquivo.' }
  const ext = EXT_POR_MIME[arquivo.type]
  if (!ext) return { ok: false, error: 'Formato não aceito. Envie PDF, JPG, PNG ou WebP.' }
  if (arquivo.size > ANEXO_MAX_BYTES) return { ok: false, error: 'Arquivo muito grande (máximo 4 MB).' }

  const path = `${autoescola_id}/${student_id}/${randomUUID()}.${ext}`
  const buffer = Buffer.from(await arquivo.arrayBuffer())
  const { error } = await supabase.storage.from(BUCKET_ANEXOS_ALUNO).upload(path, buffer, { contentType: arquivo.type })
  if (error) return { ok: false, error: 'Erro ao enviar o arquivo. Tente novamente.' }

  return { ok: true, anexo: { path, nome: arquivo.name.slice(0, 120), mime: arquivo.type, tamanho: arquivo.size } }
}

export async function removerArquivoAnexo(supabase: Supabase, path: string) {
  await supabase.storage.from(BUCKET_ANEXOS_ALUNO).remove([path])
}

export async function urlAssinadaAnexo(supabase: Supabase, path: string): Promise<string | null> {
  const { data } = await supabase.storage.from(BUCKET_ANEXOS_ALUNO).createSignedUrl(path, URL_ASSINADA_SEGUNDOS)
  return data?.signedUrl ?? null
}
