'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '../types'

// Versão mascarada das credenciais — NUNCA retornar token/secret completos para a UI
export interface CredenciaisMPMascaradas {
  configurado: boolean
  mp_public_key: string | null
  token_ultimos4: string | null
  secret_configurado: boolean
  ativo: boolean
  sandbox: boolean
  updated_at: string | null
}

export interface SalvarCredenciaisMPInput {
  mp_access_token?: string
  mp_public_key?: string
  mp_webhook_secret?: string
  ativo: boolean
  sandbox: boolean
}

export async function obterCredenciaisMP(autoescola_id: string): Promise<CredenciaisMPMascaradas> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('autoescola_pagamentos')
    .select('mp_access_token, mp_public_key, mp_webhook_secret, ativo, sandbox, updated_at')
    .eq('autoescola_id', autoescola_id)
    .maybeSingle()

  if (!data) {
    return {
      configurado: false,
      mp_public_key: null,
      token_ultimos4: null,
      secret_configurado: false,
      ativo: false,
      sandbox: false,
      updated_at: null,
    }
  }

  return {
    configurado: true,
    mp_public_key: data.mp_public_key,
    token_ultimos4: data.mp_access_token ? data.mp_access_token.slice(-4) : null,
    secret_configurado: !!data.mp_webhook_secret,
    ativo: data.ativo,
    sandbox: data.sandbox,
    updated_at: data.updated_at,
  }
}

export async function salvarCredenciaisMP(
  autoescola_id: string,
  input: SalvarCredenciaisMPInput
): Promise<ActionResult<CredenciaisMPMascaradas>> {
  const supabase = createServiceClient()

  const { data: existente } = await supabase
    .from('autoescola_pagamentos')
    .select('autoescola_id')
    .eq('autoescola_id', autoescola_id)
    .maybeSingle()

  const token = input.mp_access_token?.trim()
  const secret = input.mp_webhook_secret?.trim()
  const publicKey = input.mp_public_key?.trim()

  if (!existente) {
    if (!token || !secret) {
      return { success: false, error: 'Access token e webhook secret são obrigatórios no primeiro cadastro.' }
    }
    const { error } = await supabase.from('autoescola_pagamentos').insert({
      autoescola_id,
      mp_access_token: token,
      mp_public_key: publicKey || null,
      mp_webhook_secret: secret,
      ativo: input.ativo,
      sandbox: input.sandbox,
    })
    if (error) return { success: false, error: error.message }
  } else {
    // Campos vazios não sobrescrevem credenciais existentes
    const updates: Record<string, unknown> = {
      ativo: input.ativo,
      sandbox: input.sandbox,
      updated_at: new Date().toISOString(),
    }
    if (token) updates.mp_access_token = token
    if (secret) updates.mp_webhook_secret = secret
    if (publicKey !== undefined) updates.mp_public_key = publicKey || null

    const { error } = await supabase
      .from('autoescola_pagamentos')
      .update(updates)
      .eq('autoescola_id', autoescola_id)
    if (error) return { success: false, error: error.message }
  }

  revalidatePath(`/admin/clientes/${autoescola_id}/pagamentos`)
  return { success: true, data: await obterCredenciaisMP(autoescola_id) }
}
