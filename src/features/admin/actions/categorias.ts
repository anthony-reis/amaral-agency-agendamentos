'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { CODIGOS_VALIDOS, type CodigoCNH } from '../categorias-config'

export type { CodigoCNH }

export interface Categoria {
  id: string
  autoescola_id: string
  codigo: string
  nome: string
  ordem: number
}

export async function listarCategorias(autoescola_id: string): Promise<Categoria[]> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('autoescola_categorias')
    .select('*')
    .eq('autoescola_id', autoescola_id)
    .order('ordem', { ascending: true })
  return data ?? []
}

export async function adicionarCategoria(
  autoescola_id: string,
  codigo: CodigoCNH,
  nome: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceClient()

  const ordem = CODIGOS_VALIDOS.indexOf(codigo) + 1
  const { error } = await supabase
    .from('autoescola_categorias')
    .insert({ autoescola_id, codigo, nome, ordem })

  if (error) {
    if (error.code === '23505') return { success: false, error: 'Categoria já cadastrada.' }
    return { success: false, error: error.message }
  }

  revalidatePath(`/admin/clientes/${autoescola_id}/categorias`)
  return { success: true }
}

export async function removerCategoria(
  id: string,
  autoescola_id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceClient()
  const { error } = await supabase.from('autoescola_categorias').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath(`/admin/clientes/${autoescola_id}/categorias`)
  return { success: true }
}

export async function atualizarNomeCategoria(
  id: string,
  nome: string,
  autoescola_id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from('autoescola_categorias')
    .update({ nome })
    .eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath(`/admin/clientes/${autoescola_id}/categorias`)
  return { success: true }
}
