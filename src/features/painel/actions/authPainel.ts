'use server'

import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/server'
import { autoescolaAcessivel } from '@/lib/autoescolaAcesso'
import { assinarSessaoPainel } from '@/lib/painelSessionToken'
import { lerSessaoPainelCookie } from '@/lib/sessaoPainel.server'
import { bloqueioArea } from '@/lib/permissoes.server'
import type { Area } from '@/lib/permissoes'
import type { PainelSession, PainelUser, ActionResult } from '../types'

const COOKIE_NAME = 'painel_session'
const COOKIE_MAX_AGE = 60 * 60 * 8 // 8 hours

export async function listarUsuariosPainel(autoescola_id: string): Promise<PainelUser[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('users_painel')
    .select('id, username, full_name, role, is_active, autoescola_id')
    .eq('autoescola_id', autoescola_id)
    .eq('is_active', true)
    .order('full_name')

  if (error) return []
  return data ?? []
}

export async function loginPainel(
  userId: string,
  password: string,
  autoescola_slug: string
): Promise<ActionResult<PainelSession>> {
  const supabase = createServiceClient()

  // Busca a autoescola pelo slug
  const { data: autoescola } = await supabase
    .from('autoescolas')
    .select('id, status, is_teste')
    .eq('slug', autoescola_slug)
    .single()

  if (!autoescolaAcessivel(autoescola)) {
    return { success: false, error: 'Autoescola não encontrada.' }
  }

  // Valida usuário + senha + autoescola
  const { data: user } = await supabase
    .from('users_painel')
    .select('id, username, full_name, role, is_active, autoescola_id, password')
    .eq('id', userId)
    .eq('autoescola_id', autoescola.id)
    .eq('is_active', true)
    .single()

  if (!user) {
    return { success: false, error: 'Usuário não encontrado ou inativo.' }
  }

  if (user.password !== password) {
    return { success: false, error: 'Senha incorreta.' }
  }

  const session: PainelSession = {
    userId: user.id,
    username: user.username,
    full_name: user.full_name,
    role: user.role,
    autoescola_id: user.autoescola_id,
    autoescola_slug,
  }

  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, await assinarSessaoPainel(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  })

  // Log de auditoria para o login
  await supabase.from('activity_logs_painel').insert({
    username: user.username,
    action_type: 'login',
    description: `Usuário ${user.full_name} (@${user.username}) fez login no painel`,
    autoescola_id: user.autoescola_id,
  })

  return { success: true, data: session }
}

export async function logoutPainel(slug: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}

export async function getPainelSession(slug: string): Promise<PainelSession | null> {
  const session = await lerSessaoPainel()
  // Validate slug matches session
  if (!session || session.autoescola_slug !== slug) return null
  return session
}

/** Sessão do cookie assinado (null se ausente, inválida ou adulterada). */
export async function lerSessaoPainel(): Promise<PainelSession | null> {
  return lerSessaoPainelCookie()
}

export async function getPainelRole(): Promise<string | null> {
  const session = await lerSessaoPainel()
  if (!session) return null
  return session.role ?? null
}

/**
 * Guarda das server actions que alteram dados: exige nível "editar" na área,
 * conforme os perfis do usuário (lidos do banco) e os módulos da autoescola.
 */
export async function assertPodeEditar(area: Area): Promise<{ ok: true } | { ok: false; error: string }> {
  const bloqueio = await bloqueioArea(area, 'editar')
  return bloqueio ? { ok: false, error: bloqueio } : { ok: true }
}

export async function getCurrentUsername(): Promise<string> {
  const session = await lerSessaoPainel()
  if (!session) return 'sistema'
  return session.username || 'sistema'
}

export async function getCurrentUserId(): Promise<string | null> {
  const session = await lerSessaoPainel()
  if (!session) return null
  return session.userId || null
}

/** autoescola_id da sessão do painel (para conferir actions chamadas pelo cliente). */
export async function getPainelAutoescolaId(): Promise<string | null> {
  const session = await lerSessaoPainel()
  if (!session) return null
  return session.autoescola_id || null
}
