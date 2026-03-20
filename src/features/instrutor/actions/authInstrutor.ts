'use server'

import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/server'
import type { InstructorSession, ActionResult } from '@/features/painel/types'

const COOKIE_NAME = 'instrutor_session'
const COOKIE_MAX_AGE = 60 * 60 * 8 // 8 hours

export async function listarInstrutoresParaLogin(
  autoescola_id: string
): Promise<{ id: string; name: string }[]> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('instructors')
    .select('id, name')
    .eq('autoescola_id', autoescola_id)
    .order('name')
  return data ?? []
}

export async function loginInstrutor(
  instructorId: string,
  password: string,
  autoescola_slug: string
): Promise<ActionResult<InstructorSession>> {
  const supabase = createServiceClient()

  const { data: autoescola } = await supabase
    .from('autoescolas')
    .select('id')
    .eq('slug', autoescola_slug)
    .eq('status', 'active')
    .single()

  if (!autoescola) {
    return { success: false, error: 'Autoescola não encontrada.' }
  }

  const { data: instructor } = await supabase
    .from('instructors')
    .select('id, name, category, password, autoescola_id')
    .eq('id', instructorId)
    .eq('autoescola_id', autoescola.id)
    .single()

  if (!instructor) {
    return { success: false, error: 'Instrutor não encontrado.' }
  }

  if (instructor.password !== password) {
    return { success: false, error: 'Senha incorreta.' }
  }

  const session: InstructorSession = {
    instructorId: instructor.id,
    name: instructor.name,
    category: instructor.category,
    autoescola_id: instructor.autoescola_id,
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

export async function logoutInstrutor(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}

export async function getInstructorSession(slug: string): Promise<InstructorSession | null> {
  const cookieStore = await cookies()
  const raw = cookieStore.get(COOKIE_NAME)?.value
  if (!raw) return null

  try {
    const session = JSON.parse(raw) as InstructorSession
    if (session.autoescola_slug !== slug) return null
    return session
  } catch {
    return null
  }
}
