export interface Student {
  id: string
  name: string
  email: string | null
  phone: string | null
  document_id: string
  registration_number: string | null
  created_at: string | null
}

export interface StudentCredits {
  id: string
  student_id: string
  aulas_cat_a: number
  aulas_cat_b: number
  aulas_cat_c: number
  aulas_cat_d: number
  aulas_cat_e: number
  aulas_disponiveis: number
  updated_at: string | null
}

export interface VerificarCreditosResult {
  success: true
  student: Student
  credits: StudentCredits
}

export interface VerificarCreditosError {
  success: false
  error: string
}

export type VerificarCreditosResponse = VerificarCreditosResult | VerificarCreditosError
