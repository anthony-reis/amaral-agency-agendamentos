'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'
import type { Autoescola, NovoClienteInput, ActionResult } from '../types'

export async function uploadLogo(
  formData: FormData
): Promise<ActionResult<string>> {
  const file = formData.get('logo') as File | null

  if (!file || file.size === 0) {
    return { success: false, error: 'Nenhum arquivo selecionado.' }
  }

  if (file.size > 2 * 1024 * 1024) {
    return { success: false, error: 'Arquivo muito grande. Máximo: 2MB.' }
  }

  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml']
  if (!allowed.includes(file.type)) {
    return { success: false, error: 'Formato inválido. Use JPG, PNG, WebP ou SVG.' }
  }

  const ext = file.name.split('.').pop()
  const path = `autoescolas/${Date.now()}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const supabase = createServiceClient()
  const { error } = await supabase.storage
    .from('logos')
    .upload(path, buffer, { contentType: file.type, upsert: false })

  if (error) return { success: false, error: 'Erro ao fazer upload da logo.' }

  const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(path)
  return { success: true, data: publicUrl }
}

export async function listarClientes(): Promise<Autoescola[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('autoescolas')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function criarCliente(
  input: NovoClienteInput
): Promise<ActionResult<Autoescola>> {
  const { nome, slug, cnpj, logo_url, plano } = input

  if (!nome.trim()) return { success: false, error: 'Nome é obrigatório.' }
  if (!slug.trim()) return { success: false, error: 'Slug é obrigatório.' }

  const slugFormatado = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-')

  // Validação de CNPJ básica (apenas formato, sem cálculo de dígitos)
  if (cnpj) {
    const cnpjLimpo = cnpj.replace(/\D/g, '')
    if (cnpjLimpo.length !== 14) {
      return { success: false, error: 'CNPJ inválido. Informe 14 dígitos.' }
    }
  }

  const supabase = createServiceClient()

  // Verificar unicidade do slug antes de inserir
  const { data: existente } = await supabase
    .from('autoescolas')
    .select('id')
    .eq('slug', slugFormatado)
    .maybeSingle()

  if (existente) {
    return { success: false, error: `Slug "${slugFormatado}" já está em uso.` }
  }

  const { data, error } = await supabase
    .from('autoescolas')
    .insert({
      nome: nome.trim(),
      slug: slugFormatado,
      cnpj: cnpj ? cnpj.replace(/\D/g, '') : null,
      logo_url: logo_url?.trim() || null,
      plano: plano ?? 'basico',
      status: 'active',
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'CNPJ ou slug já cadastrado.' }
    }
    return { success: false, error: 'Erro ao criar cliente.' }
  }

  revalidatePath('/admin/clientes')
  return { success: true, data }
}

export async function editarCliente(
  id: string,
  input: Partial<{
    nome: string
    slug: string
    cnpj: string
    logo_url: string
    plano: string
    status: string
  }>
): Promise<ActionResult<Autoescola>> {
  const supabase = createServiceClient()

  const updates: Record<string, string | null> = {}
  if (input.nome !== undefined) updates.nome = input.nome.trim()
  if (input.slug !== undefined) updates.slug = input.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-')
  if (input.cnpj !== undefined) updates.cnpj = input.cnpj ? input.cnpj.replace(/\D/g, '') : null
  if (input.logo_url !== undefined) updates.logo_url = input.logo_url?.trim() || null
  if (input.plano !== undefined) updates.plano = input.plano
  if (input.status !== undefined) updates.status = input.status

  const { data, error } = await supabase
    .from('autoescolas')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') return { success: false, error: 'Slug já está em uso.' }
    return { success: false, error: 'Erro ao editar cliente.' }
  }

  revalidatePath('/admin/clientes')
  return { success: true, data }
}
