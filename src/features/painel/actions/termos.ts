'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'
import { bloqueioArea } from '@/lib/permissoes.server'
import type { TermosAceite, TermosVersao } from '@/lib/termos'
import { assertPodeEditar, getCurrentUsername, getPainelAutoescolaId } from './authPainel'
import type { ActionResult } from '../types'

const LIMITE_TEXTO = 100_000
const ACEITES_POR_PAGINA = 25

/**
 * Publica uma nova versão dos Termos de Uso / Política de Privacidade.
 * Versões anteriores ficam guardadas (é o texto que cada aluno aceitou).
 * Publicar com os dois campos vazios desliga o aceite para novos alunos.
 */
export async function publicarTermos(
  input: { termos_uso: string; politica_privacidade: string },
  escola: string
): Promise<ActionResult<TermosVersao>> {
  const guard = await assertPodeEditar('sistema')
  if (!guard.ok) return { success: false, error: guard.error }
  const autoescola_id = await getPainelAutoescolaId()
  if (!autoescola_id) return { success: false, error: 'Sessão expirada.' }

  const termos_uso = input.termos_uso.trim()
  const politica_privacidade = input.politica_privacidade.trim()
  if (termos_uso.length > LIMITE_TEXTO || politica_privacidade.length > LIMITE_TEXTO) {
    return { success: false, error: 'Texto muito longo (máx. 100 mil caracteres por documento).' }
  }

  const supabase = createServiceClient()
  const { data: atual } = await supabase
    .from('termos_versoes')
    .select('versao, termos_uso, politica_privacidade')
    .eq('autoescola_id', autoescola_id)
    .order('versao', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (atual && atual.termos_uso === termos_uso && atual.politica_privacidade === politica_privacidade) {
    return { success: false, error: 'Nenhuma alteração para publicar.' }
  }
  if (!atual && !termos_uso && !politica_privacidade) {
    return { success: false, error: 'Preencha os Termos de Uso e/ou a Política de Privacidade.' }
  }

  const username = await getCurrentUsername()
  const versao = (atual?.versao ?? 0) + 1
  const { data, error } = await supabase
    .from('termos_versoes')
    .insert({ autoescola_id, versao, termos_uso, politica_privacidade, publicado_por: username })
    .select('*')
    .single()

  if (error || !data) {
    // unique (autoescola_id, versao): outra pessoa publicou ao mesmo tempo.
    return { success: false, error: 'Não foi possível publicar. Recarregue a página e tente novamente.' }
  }

  const desligou = !termos_uso && !politica_privacidade
  await supabase.from('activity_logs_painel').insert({
    username,
    action_type: 'termos',
    description: desligou
      ? `Termos de uso e política de privacidade removidos (versão ${versao}) — aceite desligado para novos alunos`
      : `Termos de uso e política de privacidade publicados — versão ${versao}`,
    metadata: {
      termos_versao_id: data.id,
      versao,
      termos_uso_caracteres: termos_uso.length,
      politica_privacidade_caracteres: politica_privacidade.length,
    },
    autoescola_id,
  })

  revalidatePath(`/${escola}/painel/termos`)
  revalidatePath(`/${escola}/aluno`, 'layout')
  return { success: true, data: data as TermosVersao }
}

export interface AceitesPagina {
  aceites: TermosAceite[]
  total: number
  porPagina: number
}

/** Histórico de aceites dos alunos (mais recentes primeiro), com busca. */
export async function listarAceitesTermos(page = 0, search = ''): Promise<AceitesPagina> {
  const vazio = { aceites: [], total: 0, porPagina: ACEITES_POR_PAGINA }
  if (await bloqueioArea('sistema', 'ver')) return vazio
  const autoescola_id = await getPainelAutoescolaId()
  if (!autoescola_id) return vazio

  const supabase = createServiceClient()
  let query = supabase
    .from('termos_aceites')
    .select('id, student_id, student_name, student_document, ip, user_agent, aceito_em, versao:termos_versoes(versao)', {
      count: 'exact',
    })
    .eq('autoescola_id', autoescola_id)
    .order('aceito_em', { ascending: false })
    .range(page * ACEITES_POR_PAGINA, page * ACEITES_POR_PAGINA + ACEITES_POR_PAGINA - 1)

  const termo = search.trim()
  if (termo) {
    const digitos = termo.replace(/\D/g, '')
    const seguro = termo.replace(/[%,()]/g, ' ')
    query = digitos.length >= 3
      ? query.or(`student_name.ilike.%${seguro}%,student_document.ilike.%${digitos}%`)
      : query.ilike('student_name', `%${seguro}%`)
  }

  const { data, count } = await query
  const aceites = (data ?? []).map((row) => {
    const v = row.versao as unknown as { versao: number } | { versao: number }[] | null
    return {
      ...row,
      versao: (Array.isArray(v) ? v[0]?.versao : v?.versao) ?? 0,
    }
  }) as TermosAceite[]

  return { aceites, total: count ?? 0, porPagina: ACEITES_POR_PAGINA }
}

/** Todos os aceites para exportar CSV (limite de segurança de 10 mil linhas). */
export async function exportarAceitesTermos(): Promise<TermosAceite[]> {
  if (await bloqueioArea('sistema', 'ver')) return []
  const autoescola_id = await getPainelAutoescolaId()
  if (!autoescola_id) return []

  const supabase = createServiceClient()
  const { data } = await supabase
    .from('termos_aceites')
    .select('id, student_id, student_name, student_document, ip, user_agent, aceito_em, versao:termos_versoes(versao)')
    .eq('autoescola_id', autoescola_id)
    .order('aceito_em', { ascending: false })
    .limit(10_000)

  return (data ?? []).map((row) => {
    const v = row.versao as unknown as { versao: number } | { versao: number }[] | null
    return { ...row, versao: (Array.isArray(v) ? v[0]?.versao : v?.versao) ?? 0 }
  }) as TermosAceite[]
}
