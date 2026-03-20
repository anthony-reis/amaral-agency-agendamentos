'use server'

import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/server'
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
    .select('id')
    .eq('slug', autoescola_slug)
    .eq('status', 'active')
    .single()

  if (!autoescola) {
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
  cookieStore.set(COOKIE_NAME, JSON.stringify(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  })

  return { success: true, data: session }
}

export async function logoutPainel(slug: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}

export async function getPainelSession(slug: string): Promise<PainelSession | null> {
  const cookieStore = await cookies()
  const raw = cookieStore.get(COOKIE_NAME)?.value
  if (!raw) return null

  try {
    const session = JSON.parse(raw) as PainelSession
    // Validate slug matches session
    if (session.autoescola_slug !== slug) return null
    return session
  } catch {
    return null
  }
}
