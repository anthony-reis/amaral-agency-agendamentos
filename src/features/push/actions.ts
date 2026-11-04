'use server'

import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/server'
import { getInstructorSession } from '@/features/instrutor/actions/authInstrutor'

export interface InscricaoPush {
  endpoint: string
  p256dh: string
  auth: string
}

/** Quem é o dono: sempre derivado do cookie/sessão, nunca do cliente. */
async function dono(perfil: 'aluno' | 'instrutor', escola: string): Promise<{ autoescola_id: string; owner_id: string } | null> {
  if (perfil === 'instrutor') {
    const s = await getInstructorSession(escola)
    return s ? { autoescola_id: s.autoescola_id, owner_id: s.instructorId } : null
  }
  const studentId = (await cookies()).get('student_id')?.value
  if (!studentId) return null
  const { data: esc } = await createServiceClient().from('autoescolas').select('id').eq('slug', escola).maybeSingle()
  if (!esc) return null
  const { data: aluno } = await createServiceClient().from('students').select('id').eq('id', studentId).eq('autoescola_id', esc.id).maybeSingle()
  return aluno ? { autoescola_id: esc.id, owner_id: aluno.id } : null
}

export async function salvarInscricaoPush(
  perfil: 'aluno' | 'instrutor',
  escola: string,
  sub: InscricaoPush,
  userAgent: string
): Promise<{ ok: boolean }> {
  const d = await dono(perfil, escola)
  if (!d || !sub.endpoint.startsWith('https://')) return { ok: false }
  const { error } = await createServiceClient().from('push_subscriptions').upsert(
    { ...d, perfil, endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth, user_agent: userAgent.slice(0, 200) },
    { onConflict: 'endpoint,perfil' }
  )
  return { ok: !error }
}

export async function removerInscricaoPush(perfil: 'aluno' | 'instrutor', escola: string, endpoint: string): Promise<void> {
  const d = await dono(perfil, escola)
  if (!d) return
  await createServiceClient().from('push_subscriptions').delete().eq('endpoint', endpoint).eq('perfil', perfil).eq('owner_id', d.owner_id)
}
