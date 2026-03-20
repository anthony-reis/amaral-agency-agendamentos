export type AutoescolaStatus = 'active' | 'suspended' | 'trial'
export type AutoescolaPlano = 'basico' | 'pro' | 'enterprise'
export type AdminRole = 'owner' | 'admin' | 'operator'

export interface Autoescola {
  id: string
  nome: string
  slug: string
  cnpj: string | null
  logo_url: string | null
  status: AutoescolaStatus
  plano: AutoescolaPlano
  created_at: string
  updated_at: string
}

export interface AdminUser {
  id: string
  email: string
  full_name: string
  role: AdminRole
  is_active: boolean
  created_at: string
}

export type NovoClienteInput = {
  nome: string
  slug: string
  cnpj?: string
  logo_url?: string
  plano?: AutoescolaPlano
}

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }
