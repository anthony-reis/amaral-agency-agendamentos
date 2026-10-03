import 'server-only'

import { cache } from 'react'
import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { getAutoescolaFeatures } from '@/lib/features.server'
import { lerSessaoPainelCookie } from '@/lib/sessaoPainel.server'
import type { PainelSession } from '@/features/painel/types'
import {
  AREA_KEYS,
  PERFIS_PADRAO,
  ROTA_INICIAL_AREA,
  aplicarModulos,
  combinarPermissoes,
  ehPerfilPadrao,
  normalizarPermissoes,
  perfisDoRoleLegado,
  permite,
  type Area,
  type Nivel,
  type Permissoes,
} from '@/lib/permissoes'

export interface AcessoPainel {
  session: PainelSession
  permissoes: Permissoes
  /** Nomes dos perfis do usuário (exibição). */
  perfisNomes: string[]
}

/**
 * Sessão + permissões efetivas do usuário logado no painel, lidas do banco a
 * cada request (mudanças feitas no /admin valem na hora). null se não houver
 * sessão válida ou o usuário estiver inativo. Deduplicado por request.
 */
export const getAcessoPainel = cache(async (): Promise<AcessoPainel | null> => {
  const session = await lerSessaoPainelCookie()
  if (!session) return null

  const supabase = createServiceClient()
  const { data: user } = await supabase
    .from('users_painel')
    .select('id, role, perfis, is_active')
    .eq('id', session.userId)
    .eq('autoescola_id', session.autoescola_id)
    .maybeSingle()
  if (!user || !user.is_active) return null

  const ids: string[] = user.perfis?.length ? user.perfis : perfisDoRoleLegado(user.role)
  const personalizadosIds = ids.filter((id) => !ehPerfilPadrao(id))

  const { data: personalizados } = personalizadosIds.length
    ? await supabase
        .from('painel_perfis')
        .select('id, nome, permissoes')
        .eq('autoescola_id', session.autoescola_id)
        .in('id', personalizadosIds)
    : { data: [] as { id: string; nome: string; permissoes: unknown }[] }

  const lista: Partial<Permissoes>[] = []
  const perfisNomes: string[] = []
  for (const id of ids) {
    if (ehPerfilPadrao(id)) {
      lista.push(PERFIS_PADRAO[id].permissoes)
      perfisNomes.push(PERFIS_PADRAO[id].nome)
    }
  }
  for (const p of personalizados ?? []) {
    lista.push(normalizarPermissoes(p.permissoes))
    perfisNomes.push(p.nome)
  }

  const features = await getAutoescolaFeatures(session.autoescola_id)
  return { session, permissoes: aplicarModulos(combinarPermissoes(lista), features), perfisNomes }
})

export async function nivelArea(area: Area): Promise<Nivel> {
  return (await getAcessoPainel())?.permissoes[area] ?? 'nenhum'
}

/** Para páginas: 404 quando o usuário não tem o nível pedido na área. */
export async function exigirArea(area: Area, nivel: 'ver' | 'editar' = 'ver'): Promise<AcessoPainel> {
  const acesso = await getAcessoPainel()
  if (!acesso || !permite(acesso.permissoes[area], nivel)) notFound()
  return acesso
}

/** Para server actions/API: mensagem de erro, ou null se permitido. */
export async function bloqueioArea(area: Area, nivel: 'ver' | 'editar' = 'editar'): Promise<string | null> {
  const acesso = await getAcessoPainel()
  if (!acesso) return 'Sessão expirada. Entre novamente.'
  if (!permite(acesso.permissoes[area], nivel)) {
    return nivel === 'editar' ? 'Seu perfil não pode alterar esta área.' : 'Seu perfil não tem acesso a esta área.'
  }
  return null
}

/**
 * Valor para o prop legado `userRole` dos componentes (que usam
 * canEditPainel(userRole)): 'visualizador' quando só pode ver a área.
 */
export async function roleParaArea(area: Area): Promise<string> {
  return permite(await nivelArea(area), 'editar') ? 'editor' : 'visualizador'
}

/** Primeira tela que o usuário pode abrir (para quem não vê o Dashboard). */
export function rotaInicial(permissoes: Permissoes): string | null {
  const area = AREA_KEYS.find((a) => permite(permissoes[a], 'ver'))
  return area ? ROTA_INICIAL_AREA[area] : null
}
