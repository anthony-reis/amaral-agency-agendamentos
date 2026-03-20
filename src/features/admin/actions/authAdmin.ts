'use server'

import { redirect } from 'next/navigation'
import { createAdminAuthClient } from '@/lib/supabase/admin-auth'
import { createServiceClient } from '@/lib/supabase/server'
import type { AdminUser } from '../types'

export async function loginAdmin(email: string, password: string) {
  const supabase = await createAdminAuthClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error || !data.user) {
    return { success: false as const, error: 'Email ou senha inválidos.' }
  }

  // Dupla verificação: usuário precisa estar em admin_users com is_active = true
  const db = createServiceClient()
  const { data: adminUser } = await db
    .from('admin_users')
    .select('id, role, is_active')
    .eq('id', data.user.id)
    .single()

  if (!adminUser || !adminUser.is_active) {
    await supabase.auth.signOut()
    return {
      success: false as const,
      error: 'Acesso não autorizado. Contate o responsável.',
    }
  }

  return { success: true as const }
}

export async function logoutAdmin() {
  const supabase = await createAdminAuthClient()
  await supabase.auth.signOut()
  redirect('/admin/login')
}

export async function getAdminSession(): Promise<AdminUser | null> {
  const supabase = await createAdminAuthClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const db = createServiceClient()
  const { data } = await db
    .from('admin_users')
    .select('*')
    .eq('id', user.id)
    .eq('is_active', true)
    .single()

  return data ?? null
}
