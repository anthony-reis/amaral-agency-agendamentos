import 'server-only'

import type { createServiceClient } from '@/lib/supabase/server'
import { enviarArquivoAnexo, removerArquivoAnexo, urlAssinadaAnexo } from '@/lib/anexosAluno.server'
import type { SolicitacaoArquivo, SolicitacaoArquivoTipo } from '@/features/painel/types'

type Supabase = ReturnType<typeof createServiceClient>

/** Sobe o arquivo (bucket alunos-anexos, pasta do aluno) e registra em solicitacoes_arquivos. */
export async function registrarArquivoSolicitacao(
  supabase: Supabase,
  params: {
    solicitacao_id: string
    autoescola_id: string
    student_id: string
    tipo: SolicitacaoArquivoTipo
    arquivo: FormDataEntryValue | null
    autor_tipo: 'aluno' | 'painel'
    autor_nome: string
  }
): Promise<{ ok: true; nome: string } | { ok: false; error: string }> {
  const up = await enviarArquivoAnexo(supabase, params.autoescola_id, params.student_id, params.arquivo)
  if (!up.ok) return up

  const { error } = await supabase.from('solicitacoes_arquivos').insert({
    solicitacao_id: params.solicitacao_id,
    autoescola_id: params.autoescola_id,
    tipo: params.tipo,
    path: up.anexo.path,
    nome: up.anexo.nome,
    mime: up.anexo.mime,
    tamanho: up.anexo.tamanho,
    autor_tipo: params.autor_tipo,
    autor_nome: params.autor_nome,
  })
  if (error) {
    await removerArquivoAnexo(supabase, up.anexo.path)
    return { ok: false, error: 'Erro ao registrar o arquivo. Tente novamente.' }
  }
  return { ok: true, nome: up.anexo.nome }
}

/** Arquivos da solicitação, com URL assinada (temporária) para abrir/baixar. */
export async function listarArquivosComUrl(
  supabase: Supabase,
  solicitacao_id: string,
  autoescola_id: string
): Promise<SolicitacaoArquivo[]> {
  const { data } = await supabase
    .from('solicitacoes_arquivos')
    .select('id, tipo, path, nome, mime, tamanho, autor_tipo, autor_nome, created_at')
    .eq('solicitacao_id', solicitacao_id)
    .eq('autoescola_id', autoescola_id)
    .order('created_at', { ascending: true })

  return Promise.all(
    (data ?? []).map(async (a) => ({
      id: a.id,
      tipo: a.tipo as SolicitacaoArquivoTipo,
      nome: a.nome,
      mime: a.mime,
      tamanho: a.tamanho,
      autor_tipo: a.autor_tipo as 'aluno' | 'painel',
      autor_nome: a.autor_nome,
      created_at: a.created_at,
      url: await urlAssinadaAnexo(supabase, a.path),
    }))
  )
}
